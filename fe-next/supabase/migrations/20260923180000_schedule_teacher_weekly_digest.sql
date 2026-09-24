-- Weekly 7-day classroom progress digest for teachers.
-- Conversion email: completion/accuracy + Polar CTA at /{locale}/teacher/upgrade.
-- Monday 08:00 UTC (after school-leads-digest at 07:00).
-- Requires vault secret 'cron_secret' matching CRON_SECRET.

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
    timeout_milliseconds := 120000
  );
  $$
);
