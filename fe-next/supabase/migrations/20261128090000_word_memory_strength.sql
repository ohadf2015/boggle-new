-- Word memory: each student × lesson word gets a strength stage
-- (seed = no row, sprout, plant, flower, gold) written by the server's review
-- engine (lib/education/recordWordReviews.ts). Flower and gold are "mastered",
-- and student_lesson_progress.words_mastered is kept in step by the engine.
-- Additive only: existing rows take the defaults.

ALTER TABLE public.word_review_state
  ADD COLUMN IF NOT EXISTS correct_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_correct_date date,
  ADD COLUMN IF NOT EXISTS best_gap_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strength text NOT NULL DEFAULT 'sprout';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'word_review_state_strength_check') THEN
    ALTER TABLE public.word_review_state
      ADD CONSTRAINT word_review_state_strength_check CHECK (strength IN ('sprout', 'plant', 'flower', 'gold'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'word_review_state_counts_check') THEN
    ALTER TABLE public.word_review_state
      ADD CONSTRAINT word_review_state_counts_check CHECK (correct_days >= 0 AND best_gap_days >= 0);
  END IF;
END $$;

-- Strength decides mastery and the boss unlock, so a student could forge both
-- with a direct PostgREST write. Students keep SELECT; the server writes.
DROP POLICY IF EXISTS "Students can insert own review data" ON public.word_review_state;
DROP POLICY IF EXISTS "Students can update own review data" ON public.word_review_state;

-- words_mastered now decides lesson mastery, so students lose direct writes
-- to it too (the 056 policies let them update the whole row). Same trigger as
-- 20261016200000, plus words_mastered; the server writes as service_role.
CREATE OR REPLACE FUNCTION public.guard_student_lesson_progress_earned()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user not in ('authenticated', 'anon') THEN
    RETURN new;
  END IF;
  IF tg_op = 'INSERT' THEN
    new.total_xp := 0;
    new.current_level := 1;
    new.current_streak := 0;
    new.longest_streak := 0;
    new.total_practice_sessions := 0;
    new.last_practice_date := null;
    new.words_mastered := '{}';
  ELSE
    new.total_xp := old.total_xp;
    new.current_level := old.current_level;
    new.current_streak := old.current_streak;
    new.longest_streak := old.longest_streak;
    new.total_practice_sessions := old.total_practice_sessions;
    new.last_practice_date := old.last_practice_date;
    new.words_mastered := old.words_mastered;
  END IF;
  RETURN new;
END;
$$;

-- The engine's mastery write: removes (exact text) and adds (deduped
-- case-insensitively, existing order kept) in ONE statement, so a practice
-- round and a live round finishing together cannot overwrite each other.
CREATE OR REPLACE FUNCTION public.apply_words_mastered(
    p_student_id uuid,
    p_lesson_id uuid,
    p_add text[],
    p_remove text[]
)
RETURNS text[]
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO student_lesson_progress AS slp (student_id, lesson_id, words_mastered)
  VALUES (p_student_id, p_lesson_id, COALESCE(p_add, '{}'))
  ON CONFLICT (student_id, lesson_id) DO UPDATE SET words_mastered = ARRAY(
    SELECT d.w FROM (
      SELECT DISTINCT ON (lower(btrim(t.w))) t.w, t.ord
      FROM unnest(COALESCE(slp.words_mastered, '{}') || COALESCE(p_add, '{}')) WITH ORDINALITY AS t(w, ord)
      WHERE btrim(t.w) <> '' AND NOT (t.w = ANY (COALESCE(p_remove, '{}')))
      ORDER BY lower(btrim(t.w)), t.ord
    ) d
    ORDER BY d.ord
  )
  RETURNING slp.words_mastered;
$$;

revoke execute on function public.apply_words_mastered(uuid, uuid, text[], text[]) from public, anon, authenticated;
grant execute on function public.apply_words_mastered(uuid, uuid, text[], text[]) to service_role;

-- The daily quest records its sessions under its own practice type.
ALTER TABLE public.practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_practice_type_check;
ALTER TABLE public.practice_sessions
  ADD CONSTRAINT practice_sessions_practice_type_check
  CHECK (
    practice_type IS NULL OR practice_type IN (
      'flashcard', 'solo_board', 'warmup', 'word_list',
      'matching', 'spelling', 'blitz', 'vocab_focus', 'daily_quest'
    )
  );

-- Lesson mastery: coverage now counts words the engine holds as mastered
-- (words_mastered) instead of every word ever found once. Same signature,
-- weights (60% coverage capped at 1, 40% flashcard accuracy), thresholds and
-- return values as 20261026120000.
CREATE OR REPLACE FUNCTION calculate_lesson_mastery(
    p_student_id UUID,
    p_lesson_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_words INTEGER;
    v_words_mastered INTEGER;
    v_flashcard_accuracy NUMERIC;
    v_mastery_score NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_words
    FROM jsonb_array_elements(
        COALESCE(
            (SELECT words FROM vocabulary_lessons WHERE id = p_lesson_id),
            '[]'::jsonb
        )
    ) AS entry
    WHERE jsonb_typeof(entry) = 'object'
    AND btrim(COALESCE(entry->>'word', ''), E' \t\r\n') <> '';

    IF v_total_words = 0 THEN
        RETURN 'not_started';
    END IF;

    SELECT COUNT(DISTINCT lower(btrim(word, E' \t\r\n'))) INTO v_words_mastered
    FROM student_lesson_progress slp,
         LATERAL unnest(slp.words_mastered) AS word
    WHERE slp.student_id = p_student_id
    AND slp.lesson_id = p_lesson_id
    AND btrim(word, E' \t\r\n') <> '';

    SELECT
        CASE
            WHEN SUM(cards_reviewed) > 0
            THEN SUM(cards_correct)::NUMERIC / SUM(cards_reviewed)::NUMERIC
            ELSE 0
        END INTO v_flashcard_accuracy
    FROM practice_sessions
    WHERE student_id = p_student_id
    AND lesson_id = p_lesson_id
    AND practice_type = 'flashcard';

    v_mastery_score := (LEAST(v_words_mastered::NUMERIC / v_total_words::NUMERIC, 1) * 0.6) +
                       (COALESCE(v_flashcard_accuracy, 0) * 0.4);

    IF v_mastery_score >= 0.8 THEN
        RETURN 'mastered';
    ELSIF v_mastery_score >= 0.4 THEN
        RETURN 'practicing';
    ELSIF v_mastery_score > 0 THEN
        RETURN 'started';
    ELSE
        RETURN 'not_started';
    END IF;
END;
$$;

-- Ship day: coverage above now reads words_mastered instead of every word
-- found in practice_sessions. Fold those found words into words_mastered so no
-- existing student's mastery drops; from here on the engine judges them.
WITH found AS (
  SELECT DISTINCT ON (ps.student_id, ps.lesson_id, lower(btrim(w)))
         ps.student_id, ps.lesson_id, btrim(w) AS word, ps.started_at
  FROM public.practice_sessions ps,
       LATERAL unnest(ps.vocabulary_words_found) AS w
  WHERE ps.student_id IS NOT NULL
    AND ps.lesson_id IS NOT NULL
    AND btrim(w) <> ''
  ORDER BY ps.student_id, ps.lesson_id, lower(btrim(w)), ps.started_at
), per_lesson AS (
  SELECT student_id, lesson_id, array_agg(word ORDER BY started_at, word) AS words, min(started_at) AS started_at
  FROM found
  GROUP BY student_id, lesson_id
)
INSERT INTO public.student_lesson_progress AS slp (student_id, lesson_id, words_mastered, started_at)
SELECT pl.student_id, pl.lesson_id, pl.words, COALESCE(pl.started_at, now())
FROM per_lesson pl
WHERE EXISTS (SELECT 1 FROM public.vocabulary_lessons vl WHERE vl.id = pl.lesson_id)
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = pl.student_id)
ON CONFLICT (student_id, lesson_id) DO UPDATE SET words_mastered = ARRAY(
  SELECT d.w FROM (
    SELECT DISTINCT ON (lower(btrim(t.w))) t.w, t.ord
    FROM unnest(COALESCE(slp.words_mastered, '{}') || EXCLUDED.words_mastered) WITH ORDINALITY AS t(w, ord)
    WHERE btrim(t.w) <> ''
    ORDER BY lower(btrim(t.w)), t.ord
  ) d
  ORDER BY d.ord
);

-- Review rows written before the engine have the 'sprout' default. A word
-- already in words_mastered becomes flower (or the engine would drop it on its
-- next review); one with a correct repetition becomes plant. last_correct_date
-- marks a row as done, so neither statement touches it twice.
UPDATE public.word_review_state wrs
SET strength = 'flower', correct_days = 2, last_correct_date = wrs.last_review_date
WHERE wrs.strength = 'sprout'
  AND wrs.last_correct_date IS NULL
  AND EXISTS (
    SELECT 1 FROM public.student_lesson_progress slp, unnest(slp.words_mastered) AS m
    WHERE slp.student_id = wrs.student_id
      AND slp.lesson_id = wrs.lesson_id
      AND lower(btrim(m)) = lower(btrim(wrs.word))
  );

UPDATE public.word_review_state wrs
SET strength = 'plant', correct_days = 1, last_correct_date = wrs.last_review_date
WHERE wrs.strength = 'sprout'
  AND wrs.last_correct_date IS NULL
  AND wrs.repetitions >= 1;
