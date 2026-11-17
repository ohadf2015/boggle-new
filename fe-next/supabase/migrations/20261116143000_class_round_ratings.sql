-- One class-bubble rating per (student, game_code).
-- Students insert or replace only their own row, and only for a class they belong to.
-- Teachers read rows for classrooms they own. No name column: the teacher surface
-- shows a count and a mood, never who said what.
-- Not added to supabase_realtime (no postgres_changes consumer).

CREATE TABLE IF NOT EXISTS public.class_round_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  game_code text NOT NULL CHECK (char_length(game_code) BETWEEN 1 AND 32),
  rating text NOT NULL CHECK (rating IN ('bad', 'ok', 'great')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, game_code)
);

CREATE INDEX IF NOT EXISTS class_round_ratings_class_game_idx
  ON public.class_round_ratings (classroom_id, game_code);

ALTER TABLE public.class_round_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_round_ratings_insert_own ON public.class_round_ratings;
CREATE POLICY class_round_ratings_insert_own ON public.class_round_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.is_classroom_member(classroom_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS class_round_ratings_update_own ON public.class_round_ratings;
CREATE POLICY class_round_ratings_update_own ON public.class_round_ratings
  FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.is_classroom_member(classroom_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS class_round_ratings_select_own ON public.class_round_ratings;
CREATE POLICY class_round_ratings_select_own ON public.class_round_ratings
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS class_round_ratings_select_owner ON public.class_round_ratings;
CREATE POLICY class_round_ratings_select_owner ON public.class_round_ratings
  FOR SELECT TO authenticated
  USING (public.is_classroom_owner(classroom_id, (SELECT auth.uid())));

REVOKE ALL ON public.class_round_ratings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.class_round_ratings TO authenticated;
