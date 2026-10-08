-- Owner nudges to teachers from the education admin rescue list. One row per action
-- (copied nudge, opened email, or marked done). Service role only: no client policies.

CREATE TABLE IF NOT EXISTS public.admin_edu_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('copy', 'email', 'marked')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_edu_outreach_teacher_idx
  ON public.admin_edu_outreach (teacher_id, created_at DESC);

ALTER TABLE public.admin_edu_outreach ENABLE ROW LEVEL SECURITY;
