-- One "finish your checkout" email for a teacher whose Teacher Pro checkout started 1–24h ago
-- and never completed.
--
-- /api/subscription/checkout writes subscription_events.event_type = 'checkout_started'
-- (payload { mode, locale }); /api/cron/teacher-abandoned-checkout scans the last 25h of those
-- every hour and records 'abandoned_checkout_email_sent' after a confirmed send.
-- No new table or column: both rows live in subscription_events.
--
-- Requires vault secret 'cron_secret' matching the app CRON_SECRET env var.

CREATE INDEX IF NOT EXISTS idx_subscription_events_type_created
  ON public.subscription_events (event_type, created_at);

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-abandoned-checkout';

SELECT cron.schedule(
  'teacher-abandoned-checkout',
  '20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/teacher-abandoned-checkout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
