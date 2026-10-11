-- Daily teacher emails: homework due in 24h + overdue nudge to the progress report.
-- 09:50 UTC, after teacher-trial-reminders at 09:40.
-- Requires vault secret 'cron_secret' matching CRON_SECRET.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'assignment-due-reminders';

SELECT cron.schedule(
  'assignment-due-reminders',
  '50 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/assignment-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
