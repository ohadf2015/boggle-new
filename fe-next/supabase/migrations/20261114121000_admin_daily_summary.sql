-- Daily admin summary: games, signups and teacher signups for one UTC day and the day
-- before. Same definitions as the admin Overview: games = signed-in results plus completed
-- guest sessions; signups skip anonymous and test accounts; teacher signups are access
-- requests (the teacher funnel's entry point) minus test accounts.

CREATE OR REPLACE FUNCTION public.admin_daily_summary(p_day date)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH tests AS (SELECT id FROM profiles WHERE is_test_account),
  counts AS (
    SELECT d::date AS day,
      (SELECT count(*) FROM game_results g
         WHERE g.created_at >= d AND g.created_at < d + interval '1 day'
           AND g.player_id NOT IN (SELECT id FROM tests))
      + (SELECT count(*) FROM game_sessions s
         WHERE s.started_at >= d AND s.started_at < d + interval '1 day'
           AND s.user_id IS NULL AND s.guest_session_id IS NOT NULL AND s.completed) AS games,
      (SELECT count(*) FROM profiles p JOIN auth.users u ON u.id = p.id
         WHERE p.created_at >= d AND p.created_at < d + interval '1 day'
           AND p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE) AS signups,
      (SELECT count(*) FROM teacher_access_requests r
         WHERE r.created_at >= d AND r.created_at < d + interval '1 day'
           AND (r.user_id IS NULL OR r.user_id NOT IN (SELECT id FROM tests))
           AND r.email NOT ILIKE '%@lexiclash.test') AS teachers
    FROM (VALUES (p_day::timestamptz), ((p_day - 1)::timestamptz)) v(d)
  )
  SELECT json_build_object(
    'current', (SELECT json_build_object('games', games, 'signups', signups, 'teachers', teachers) FROM counts WHERE day = p_day),
    'previous', (SELECT json_build_object('games', games, 'signups', signups, 'teachers', teachers) FROM counts WHERE day = p_day - 1)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.admin_daily_summary(date) FROM PUBLIC, anon, authenticated;

-- 05:00 UTC = 07:00/08:00 Israel. Requires vault secret 'cron_secret' matching CRON_SECRET.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'admin-daily-summary';

SELECT cron.schedule(
  'admin-daily-summary',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/cron/admin-daily-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
