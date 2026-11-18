-- Hourly through the Israel afternoon (14:00-21:00 UTC), so the 8-hour lookback is all daytime.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'google-signup-drought';

SELECT cron.schedule(
  'google-signup-drought',
  '0 14-21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/google-signup-drought',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
