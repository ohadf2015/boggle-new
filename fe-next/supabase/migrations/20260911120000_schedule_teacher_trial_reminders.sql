-- Schedule the teacher trial-expiry reminder cron.
--
-- /api/cron/teacher-trial-reminders has existed since 2026-08-25 (trial_reminders_sent
-- ledger + t-3 / t-0 / t+3 buckets) but, like the re-engagement cron before
-- 2026-08-24, the HTTP handler was never invoked by pg_cron. Research called this
-- the "D2 trial-expiry cron" — it is the same job as teacher-trial-reminders, not a
-- separate revoke-role job (hard enforcement is deliberately omitted; see
-- 20260626120000_teacher_access_trial_expiry.sql).
--
-- Prod already ran this as jobid 26 (40 9 * * *, 30s timeout) then jobid 29
-- (120s timeout, 2026-09-11, t_99aacb85). This file makes the schedule
-- idempotent in git so a fresh environment does not silently drop the ask.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-trial-reminders';

SELECT cron.schedule(
  'teacher-trial-reminders',
  '40 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-trial-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
