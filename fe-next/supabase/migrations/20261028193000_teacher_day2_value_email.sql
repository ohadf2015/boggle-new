-- One day-2 value email after a teacher creates their first classroom.
--
-- /api/cron/teacher-day2-value scans classrooms created in the last 7 days, keeps
-- the teacher whose FIRST classroom is 48h–7d old, and emails "N students joined,
-- M games played" with the progress report and the Teacher Pro CTA.
-- Skips Teacher Pro, a converted trial, and anyone already sent.
--
-- No new table: the send marker is teacher_lifecycle_sends
-- (kind = 'day2_value', period_key = 'once'), claimed before the send.
--
-- 35 * * * * — hourly, off the :20 abandoned-checkout minute.
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-day2-value';

SELECT cron.schedule(
  'teacher-day2-value',
  '35 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-day2-value',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
