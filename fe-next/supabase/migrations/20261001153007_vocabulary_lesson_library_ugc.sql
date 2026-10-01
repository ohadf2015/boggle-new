-- Counts/reports live in their own tables: the owner-UPDATE policy would let an author rewrite counters on the row.

ALTER TABLE public.vocabulary_lessons
  ADD COLUMN IF NOT EXISTS source_lesson_id uuid NULL REFERENCES public.vocabulary_lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remixed_from_title text NULL,
  ADD COLUMN IF NOT EXISTS remixed_from_author text NULL,
  ADD COLUMN IF NOT EXISTS author_name text NULL,
  ADD COLUMN IF NOT EXISTS grade_band text NULL,
  ADD COLUMN IF NOT EXISTS topic text NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS vocabulary_lessons_public_language_idx
  ON public.vocabulary_lessons (language, published_at DESC)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS vocabulary_lessons_teacher_source_idx
  ON public.vocabulary_lessons (teacher_id, source_lesson_id)
  WHERE source_lesson_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vocabulary_lesson_stats (
  lesson_id uuid PRIMARY KEY REFERENCES public.vocabulary_lessons(id) ON DELETE CASCADE,
  copy_count integer NOT NULL DEFAULT 0,
  play_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vocabulary_lesson_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY vocabulary_lesson_stats_select_visible ON public.vocabulary_lesson_stats
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vocabulary_lessons l
    WHERE l.id = lesson_id AND (l.is_public = true OR l.teacher_id = (SELECT auth.uid()))
  ));

-- One row per (list, teacher, kind, day) so a single account cannot pump a counter.
CREATE TABLE IF NOT EXISTS public.vocabulary_lesson_stat_events (
  lesson_id uuid NOT NULL REFERENCES public.vocabulary_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('copy', 'play')),
  day date NOT NULL DEFAULT current_date,
  PRIMARY KEY (lesson_id, user_id, kind, day)
);
ALTER TABLE public.vocabulary_lesson_stat_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lesson_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.vocabulary_lessons(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'unplayable', 'offensive')),
  details text NULL CHECK (details IS NULL OR char_length(details) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lesson_reports_lesson_reporter_uidx
  ON public.lesson_reports (lesson_id, reporter_id);
ALTER TABLE public.lesson_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_reports_insert_own ON public.lesson_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.bump_vocabulary_lesson_stat(p_lesson_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inserted integer;
BEGIN
  IF v_uid IS NULL OR p_kind NOT IN ('copy', 'play') THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM vocabulary_lessons
    WHERE id = p_lesson_id AND is_public = true AND teacher_id <> v_uid
  ) THEN
    RETURN;
  END IF;

  INSERT INTO vocabulary_lesson_stat_events (lesson_id, user_id, kind)
  VALUES (p_lesson_id, v_uid, p_kind)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN;
  END IF;

  INSERT INTO vocabulary_lesson_stats (lesson_id, copy_count, play_count)
  VALUES (p_lesson_id, (p_kind = 'copy')::int, (p_kind = 'play')::int)
  ON CONFLICT (lesson_id) DO UPDATE SET
    copy_count = vocabulary_lesson_stats.copy_count + (p_kind = 'copy')::int,
    play_count = vocabulary_lesson_stats.play_count + (p_kind = 'play')::int,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.report_vocabulary_lesson(p_lesson_id uuid, p_reason text, p_details text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_reason NOT IN ('inappropriate', 'spam', 'unplayable', 'offensive') THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vocabulary_lessons WHERE id = p_lesson_id AND is_public = true) THEN
    RETURN false;
  END IF;

  INSERT INTO lesson_reports (lesson_id, reporter_id, reason, details)
  VALUES (p_lesson_id, v_uid, p_reason, left(p_details, 500))
  ON CONFLICT (lesson_id, reporter_id) DO NOTHING;
  RETURN true;
END;
$$;

-- Lists hidden from Discover. The floor of 3 matches AUTO_FLAG_THRESHOLD in backend/modules/ugcModeration.ts.
CREATE OR REPLACE FUNCTION public.flagged_vocabulary_lesson_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lesson_id FROM lesson_reports GROUP BY lesson_id HAVING count(*) >= 3;
$$;
