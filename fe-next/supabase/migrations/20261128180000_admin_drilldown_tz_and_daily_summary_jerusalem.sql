-- Function bodies only: no table changes, no deletes, no backfill.
-- 1. admin_drilldown weeks use the same viewer IANA timezone as admin_signup_growth
--    (PR 2224), falling back to UTC when the name is missing or invalid.
-- 2. admin_daily_summary counts a calendar day in Asia/Jerusalem, not UTC.

DROP FUNCTION IF EXISTS public.admin_drilldown(text, date);
DROP FUNCTION IF EXISTS public.admin_drilldown(text, date, text);

CREATE FUNCTION public.admin_drilldown(kind text, week date DEFAULT NULL, p_tz text DEFAULT 'UTC')
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  tz text;
BEGIN
  tz := public.admin_resolve_timezone(p_tz);
  IF kind = 'signups' THEN
    RETURN COALESCE((SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT p.id, COALESCE(p.display_name, p.username) AS name, p.created_at,
             p.country_code AS country, p.utm_source AS source, p.total_games AS games
      FROM profiles p JOIN auth.users u ON u.id = p.id
      WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE
        AND (week IS NULL OR date_trunc('week', p.created_at AT TIME ZONE tz)::date = week)
      ORDER BY p.created_at DESC LIMIT 200
    ) r), '[]'::json);
  ELSIF kind = 'payers' THEN
    RETURN COALESCE((SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT s.user_id AS id, COALESCE(p.display_name, p.username) AS name, s.tier, s.status,
             COALESCE(s.source, 'polar') AS source, s.cancel_at_period_end AS cancelling,
             s.current_period_end AS period_end, s.created_at
      FROM subscriptions s JOIN profiles p ON p.id = s.user_id
      WHERE p.is_test_account IS NOT TRUE AND s.tier = 'pro'
      ORDER BY s.created_at DESC LIMIT 200
    ) r), '[]'::json);
  ELSIF kind = 'checkouts' THEN
    RETURN COALESCE((SELECT json_agg(r ORDER BY r.created_at DESC) FROM (
      SELECT e.id, COALESCE(p.display_name, p.username, 'anonymous') AS name, e.created_at,
             e.payload->>'mode' AS mode, e.payload->>'locale' AS locale
      FROM subscription_events e LEFT JOIN profiles p ON p.id = e.user_id
      WHERE e.event_type = 'checkout_started' AND e.created_at >= NOW() - INTERVAL '30 days'
        AND (p.id IS NULL OR p.is_test_account IS NOT TRUE)
      ORDER BY e.created_at DESC LIMIT 200
    ) r), '[]'::json);
  END IF;
  RETURN '[]'::json;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_drilldown(text, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_drilldown(text, date, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_daily_summary(p_day date)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH tests AS (SELECT id FROM profiles WHERE is_test_account),
  bounds AS (
    SELECT
      p_day AS current_day,
      (p_day - 1) AS previous_day,
      (p_day::timestamp AT TIME ZONE 'Asia/Jerusalem') AS current_start,
      ((p_day + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem') AS current_end,
      ((p_day - 1)::timestamp AT TIME ZONE 'Asia/Jerusalem') AS previous_start
  ),
  counts AS (
    SELECT
      b.current_day AS day,
      (SELECT count(*) FROM game_results g, bounds b2
         WHERE g.created_at >= b2.current_start AND g.created_at < b2.current_end
           AND g.player_id NOT IN (SELECT id FROM tests))
      + (SELECT count(*) FROM game_sessions s, bounds b2
         WHERE s.started_at >= b2.current_start AND s.started_at < b2.current_end
           AND s.user_id IS NULL AND s.guest_session_id IS NOT NULL AND s.completed) AS games,
      (SELECT count(*) FROM profiles p JOIN auth.users u ON u.id = p.id, bounds b2
         WHERE p.created_at >= b2.current_start AND p.created_at < b2.current_end
           AND p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE) AS signups,
      (SELECT count(*) FROM teacher_access_requests r, bounds b2
         WHERE r.created_at >= b2.current_start AND r.created_at < b2.current_end
           AND (r.user_id IS NULL OR r.user_id NOT IN (SELECT id FROM tests))
           AND r.email NOT ILIKE '%@lexiclash.test') AS teachers
    FROM bounds b
    UNION ALL
    SELECT
      b.previous_day AS day,
      (SELECT count(*) FROM game_results g, bounds b2
         WHERE g.created_at >= b2.previous_start AND g.created_at < b2.current_start
           AND g.player_id NOT IN (SELECT id FROM tests))
      + (SELECT count(*) FROM game_sessions s, bounds b2
         WHERE s.started_at >= b2.previous_start AND s.started_at < b2.current_start
           AND s.user_id IS NULL AND s.guest_session_id IS NOT NULL AND s.completed) AS games,
      (SELECT count(*) FROM profiles p JOIN auth.users u ON u.id = p.id, bounds b2
         WHERE p.created_at >= b2.previous_start AND p.created_at < b2.current_start
           AND p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE) AS signups,
      (SELECT count(*) FROM teacher_access_requests r, bounds b2
         WHERE r.created_at >= b2.previous_start AND r.created_at < b2.current_start
           AND (r.user_id IS NULL OR r.user_id NOT IN (SELECT id FROM tests))
           AND r.email NOT ILIKE '%@lexiclash.test') AS teachers
    FROM bounds b
  )
  SELECT json_build_object(
    'current', (SELECT json_build_object('games', games, 'signups', signups, 'teachers', teachers) FROM counts WHERE day = p_day),
    'previous', (SELECT json_build_object('games', games, 'signups', signups, 'teachers', teachers) FROM counts WHERE day = p_day - 1)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.admin_daily_summary(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_daily_summary(date) TO service_role;
