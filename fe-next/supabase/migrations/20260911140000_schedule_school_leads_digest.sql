-- Weekly digest of school_leads captured in the last 7 days.
-- Instant notify on POST /api/education/school-lead is the primary path;
-- this is the unread-pipeline safety net for the $39/term Classroom plan.
--
-- Monday 07:00 UTC. Requires vault secret 'cron_secret' matching CRON_SECRET.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'school-leads-digest';

SELECT cron.schedule(
  'school-leads-digest',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/school-leads-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
