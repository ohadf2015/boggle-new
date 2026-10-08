-- Daily Polar Teacher Pro day-10 trial expiry nudge.
--
-- Distinct from teacher-trial-reminders (access-trial t-3/t-0/t+3). This job
-- emails teachers still on a Polar 14-day Pro trial once 4 days remain, with
-- a CTA at /teacher/upgrade (Polar paid checkout). 09:45 UTC — five minutes
-- after teacher-trial-reminders, five before teacher-pro-churn-watch.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-polar-trial-day10';

SELECT cron.schedule(
  'teacher-polar-trial-day10',
  '45 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-polar-trial-day10',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
