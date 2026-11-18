-- Daily Teacher Pro dunning escalation.
--
-- The past_due webhook sends day 0. This job is the grace-day follow-up:
-- day 1, then a day-5 escalation whose link opens the Polar card form.
-- 10:05 UTC, after the 09:xx teacher mail pile, so a vault/http miss on those
-- jobs is visible before this one also fails.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.
-- The route is read-only on a dry/hook call and only emails past_due Teacher Pro.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-pro-dunning';

SELECT cron.schedule(
  'teacher-pro-dunning',
  '5 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-pro-dunning',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
