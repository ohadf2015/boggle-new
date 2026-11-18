-- Google signup drought: 0 Google accounts in 8 daytime hours while people are still playing.
-- Scheduled hourly through the Israel afternoon (14:00–21:00 UTC = 16:00–23:00 IST) so the
-- 8-hour lookback is entirely daytime. Requires vault secret 'cron_secret'.

CREATE OR REPLACE FUNCTION public.google_signup_drought_counts(p_since timestamptz)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT json_build_object(
    'google_signups', (
      SELECT count(*) FROM auth.users u
      JOIN auth.identities i ON i.user_id = u.id
      WHERE i.provider = 'google'
        AND u.created_at >= p_since
        AND u.is_anonymous IS NOT TRUE
    ),
    'games_started', (
      SELECT count(*) FROM public.game_sessions s
      WHERE s.started_at >= p_since
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.google_signup_drought_counts(timestamptz) FROM PUBLIC, anon, authenticated;

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
