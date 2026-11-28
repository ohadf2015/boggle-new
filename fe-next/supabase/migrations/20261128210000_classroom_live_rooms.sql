-- Minimal room state persistence for teacher live classroom games to survive server deploys/restarts.
CREATE TABLE IF NOT EXISTS public.classroom_live_rooms (
  room_code text PRIMARY KEY,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL,
  host_identity jsonb NOT NULL,
  roster jsonb NOT NULL DEFAULT '[]'::jsonb,
  game_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  lesson_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_phase text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classroom_live_rooms_teacher_idx ON public.classroom_live_rooms (teacher_id);
CREATE INDEX IF NOT EXISTS classroom_live_rooms_classroom_idx ON public.classroom_live_rooms (classroom_id);

ALTER TABLE public.classroom_live_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can select own live rooms" ON public.classroom_live_rooms;
CREATE POLICY "Teachers can select own live rooms"
  ON public.classroom_live_rooms
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

GRANT ALL ON public.classroom_live_rooms TO service_role;
GRANT SELECT ON public.classroom_live_rooms TO authenticated;
