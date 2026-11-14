-- Native app (Capacitor android/ios) users from analytics_events: one id per person,
-- guest sessions folded into the player who signed in on them. Admin drill-down only.
CREATE OR REPLACE FUNCTION public.admin_native_app_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '5s'
AS $function$
  WITH ev AS (
    SELECT player_id, session_id, created_at
    FROM analytics_events
    WHERE metadata->>'platform' IN ('android', 'ios')
      AND (player_id IS NULL OR player_id NOT IN (SELECT id FROM profiles WHERE is_test_account))
  ),
  link AS (
    SELECT session_id, min(player_id::text) AS pid
    FROM ev
    WHERE player_id IS NOT NULL AND session_id IS NOT NULL
    GROUP BY 1
  ),
  people AS (
    SELECT coalesce(e.player_id::text, l.pid, e.session_id) AS id, min(e.created_at) AS first_seen, max(e.created_at) AS last_seen
    FROM ev e
    LEFT JOIN link l USING (session_id)
    GROUP BY 1
  )
  SELECT json_build_object(
    'total',    count(*),
    'new7',     count(*) FILTER (WHERE first_seen > now() - interval '7 days'),
    'new30',    count(*) FILTER (WHERE first_seen > now() - interval '30 days'),
    'active7',  count(*) FILTER (WHERE last_seen > now() - interval '7 days'),
    'active30', count(*) FILTER (WHERE last_seen > now() - interval '30 days')
  )
  FROM people;
$function$;

REVOKE ALL ON FUNCTION public.admin_native_app_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_native_app_stats() TO service_role;
