-- Day 1 / 3 / 7 "make your first class" email for approved teachers with no classroom.
--
-- The ledger lives on the row: /api/cron/teacher-activation-nudge appends a bucket
-- ('d1' | 'd3' | 'd7') only after a confirmed send, to every row of that email address.
-- 09:55 UTC — after teacher-trial-reminders (09:40), polar day-10 (09:45) and the 09:50 jobs.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

ALTER TABLE public.teacher_access_requests
  ADD COLUMN IF NOT EXISTS activation_nudges_sent TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.teacher_access_requests.activation_nudges_sent IS
  'First-class activation nudges already emailed to this teacher (d1 / d3 / d7).';

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-activation-nudge';

SELECT cron.schedule(
  'teacher-activation-nudge',
  '55 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-activation-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
