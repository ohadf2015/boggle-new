-- Hourly world-record refresh. Apply only after /api/cron/game-records is deployed.
-- Requires vault secret 'cron_secret' matching CRON_SECRET.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'game-records-refresh';

SELECT cron.schedule(
  'game-records-refresh',
  '23 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/game-records',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
