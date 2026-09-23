-- Daily Polar poll of the Teacher Pro subscription.
--
-- Webhook dunning emails the teacher on past_due; this job Telegrams Ohad
-- if Polar flips customer #1 (or any later Teacher Pro sub) to
-- past_due/canceled, or the row disappears. 09:50 UTC — ten minutes after
-- teacher-trial-reminders so a vault/http outage on that job is visible
-- before this one also fails.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-pro-churn-watch';

SELECT cron.schedule(
  'teacher-pro-churn-watch',
  '50 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-pro-churn-watch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
