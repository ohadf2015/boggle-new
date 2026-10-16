-- Daily Polar Teacher Pro trial-expiry conversion emails (t-0 / t+3).
--
-- Distinct from teacher-polar-trial-day10 (4–1 days remaining) and
-- teacher-trial-reminders (access-trial clock). 09:50 UTC — five minutes
-- after the day-10 job.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-polar-trial-expiry';

SELECT cron.schedule(
  'teacher-polar-trial-expiry',
  '50 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-polar-trial-expiry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
