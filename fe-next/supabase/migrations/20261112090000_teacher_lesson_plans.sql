-- The teacher's next real lesson per class, so the warm-up email lands an hour before it.
-- reminded_at: set after the send, reset to NULL by the API on a new time.
-- Idempotent. Not in supabase_realtime (no consumer). Requires vault secret 'cron_secret'.

CREATE TABLE IF NOT EXISTS public.teacher_lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  lesson_at timestamptz NOT NULL,
  timezone text,
  locale text,
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id)
);

CREATE INDEX IF NOT EXISTS teacher_lesson_plans_due_idx
  ON public.teacher_lesson_plans (lesson_at)
  WHERE reminded_at IS NULL;

ALTER TABLE public.teacher_lesson_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_lesson_plans_select_own ON public.teacher_lesson_plans;
CREATE POLICY teacher_lesson_plans_select_own ON public.teacher_lesson_plans
  FOR SELECT TO authenticated
  USING (teacher_id = (select auth.uid()));

DROP POLICY IF EXISTS teacher_lesson_plans_insert_own ON public.teacher_lesson_plans;
CREATE POLICY teacher_lesson_plans_insert_own ON public.teacher_lesson_plans
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = (select auth.uid()));

DROP POLICY IF EXISTS teacher_lesson_plans_update_own ON public.teacher_lesson_plans;
CREATE POLICY teacher_lesson_plans_update_own ON public.teacher_lesson_plans
  FOR UPDATE TO authenticated
  USING (teacher_id = (select auth.uid()))
  WITH CHECK (teacher_id = (select auth.uid()));

DROP POLICY IF EXISTS teacher_lesson_plans_delete_own ON public.teacher_lesson_plans;
CREATE POLICY teacher_lesson_plans_delete_own ON public.teacher_lesson_plans
  FOR DELETE TO authenticated
  USING (teacher_id = (select auth.uid()));

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-lesson-reminder';

SELECT cron.schedule(
  'teacher-lesson-reminder',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-lesson-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
