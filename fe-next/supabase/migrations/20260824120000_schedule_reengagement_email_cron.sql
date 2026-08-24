-- Schedule the re-engagement email cron (Phase 2, docs/growth/2026-08-12-monetization-and-retention-plan.md).
--
-- The pipeline (/api/email/send-reengagement, lib/reengagementEmail.ts) has been built and
-- gated since before 2026-08-12 (opt-in, 14d inactivity, 30d anti-spam, 7-9AM local window)
-- but was never invoked by anything — cron.job held no entry for it. Mirrors jobid 19
-- (daily-challenge-push-reminder): hourly, because the 7-9AM local-time send window means a
-- daily job would only ever catch one timezone.
--
-- Requires a vault secret named 'cron_secret' whose value matches the app's CRON_SECRET env
-- var (checked by isAuthorizedCronRequest in lib/cronAuth.ts, fail-closed if unset).

SELECT cron.schedule(
  'reengagement-email-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/email/send-reengagement',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    )::jsonb
  );
  $$
);
