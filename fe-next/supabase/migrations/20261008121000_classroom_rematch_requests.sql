-- A student asks their teacher for a rematch. One row per student per class per
-- day; no free text (kids' safety), so the only payload is the fact of asking.

CREATE TABLE IF NOT EXISTS public.classroom_rematch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classroom_rematch_requests_once_per_day UNIQUE (classroom_id, student_id, request_date)
);

CREATE INDEX IF NOT EXISTS classroom_rematch_requests_classroom_day_idx
  ON public.classroom_rematch_requests (classroom_id, request_date);

ALTER TABLE public.classroom_rematch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members request rematches for their own seat"
  ON public.classroom_rematch_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.classroom_memberships m
      WHERE m.classroom_id = classroom_rematch_requests.classroom_id
        AND m.student_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Students read their own rematch requests"
  ON public.classroom_rematch_requests
  FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

CREATE POLICY "Teachers read rematch requests for their classrooms"
  ON public.classroom_rematch_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_rematch_requests.classroom_id
        AND c.teacher_id = (SELECT auth.uid())
    )
  );
