-- One row per completed classroom live round. Grain is the ROUND, not the
-- player: practice_sessions already carries classroom_id per student, but a
-- round-level fact (mode, player count, duration) has no home there, and
-- game_sessions is written by the guest/multiplayer logger, not the classroom path.

CREATE TABLE IF NOT EXISTS public.classroom_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_code text NOT NULL,
  game_mode text NOT NULL,
  lesson_count integer NOT NULL DEFAULT 0 CHECK (lesson_count >= 0),
  player_count integer NOT NULL DEFAULT 0 CHECK (player_count >= 0),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  started_at timestamptz,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classroom_rounds_classroom_id_idx ON public.classroom_rounds (classroom_id);
CREATE INDEX IF NOT EXISTS classroom_rounds_teacher_id_idx ON public.classroom_rounds (teacher_id);

ALTER TABLE public.classroom_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own classroom rounds"
  ON public.classroom_rounds
  FOR SELECT
  TO authenticated
  USING (teacher_id = (SELECT auth.uid()));
