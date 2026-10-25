-- Per-teacher send ledger for lifecycle email (weekly digest per ISO week, stage nudges once,
-- activation nudges), a heartbeat row per cron so a job that stops firing raises an alert,
-- and the weekly digest pg_cron job (its 2026-09-23 schedule migration was never applied).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.teacher_lifecycle_sends (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  period_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, period_key)
);

CREATE INDEX IF NOT EXISTS teacher_lifecycle_sends_user_sent_idx
  ON public.teacher_lifecycle_sends (user_id, sent_at DESC);

-- Service role only: no policies.
ALTER TABLE public.teacher_lifecycle_sends ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cron_heartbeats (
  job text PRIMARY KEY,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  last_result jsonb
);

ALTER TABLE public.cron_heartbeats ENABLE ROW LEVEL SECURITY;

-- Seed so a digest that never runs alerts 8 days after this migration instead of never.
INSERT INTO public.cron_heartbeats (job, last_run_at, last_result)
VALUES ('teacher-weekly-digest', now(), '{"seeded": true}'::jsonb)
ON CONFLICT (job) DO NOTHING;

-- Monday 08:00 UTC (after school-leads-digest at 07:00). Requires vault secret 'cron_secret'.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-weekly-digest';

SELECT cron.schedule(
  'teacher-weekly-digest',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
