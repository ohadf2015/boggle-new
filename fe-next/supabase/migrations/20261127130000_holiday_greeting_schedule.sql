-- Holiday greeting email: per-player send ledger + 15-minute cron trigger.
-- Idempotent. Service role only (RLS on, no policies). Not in supabase_realtime (no consumer).
-- Requires vault secret 'cron_secret'.

CREATE TABLE IF NOT EXISTS public.holiday_greeting_sent (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign)
);

ALTER TABLE public.holiday_greeting_sent ENABLE ROW LEVEL SECURITY;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'holiday-greeting';

SELECT cron.schedule(
  'holiday-greeting',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/holiday-greeting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
