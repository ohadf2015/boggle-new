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
