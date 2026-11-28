-- 1. Engagement funnel and retention cohorts use the same real-account definition
--    as the Overview hero: profiles JOIN auth.users, not test, not anonymous.
-- 2. Calendar windows (today, last 7/30 local days, ISO weeks) follow the viewer's
--    IANA timezone, falling back to UTC when the name is missing or invalid.
-- Function bodies only: no table changes, no deletes, no backfill.

CREATE OR REPLACE FUNCTION public.admin_resolve_timezone(p_tz text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_tz IS NULL OR btrim(p_tz) = '' OR length(p_tz) > 64 THEN
    RETURN 'UTC';
  END IF;
  PERFORM date_trunc('day', now() AT TIME ZONE btrim(p_tz));
  RETURN btrim(p_tz);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'UTC';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_resolve_timezone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_timezone(text) TO service_role;

-- Today / last 7 local calendar days (including today) / last 30 local calendar days.
DROP FUNCTION IF EXISTS public.admin_activity_stats();
DROP FUNCTION IF EXISTS public.admin_activity_stats(text);
CREATE FUNCTION public.admin_activity_stats(p_tz text DEFAULT 'UTC')
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH tz AS (
    SELECT public.admin_resolve_timezone(p_tz) AS tz
  ),
  bounds AS (
    SELECT
      date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz AS today_start,
      (date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz) + interval '1 day' AS today_end,
      (date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz) - interval '6 days' AS week_start,
      (date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz) - interval '29 days' AS month_start
    FROM tz
  ),
  real_games AS (
    SELECT g.player_id, g.created_at
    FROM game_results g, bounds b
    WHERE g.player_id NOT IN (SELECT id FROM profiles WHERE is_test_account)
      AND g.created_at >= b.month_start
  ),
  signups AS (
    SELECT p.created_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE
  )
  SELECT json_build_object(
    'gamesToday',         (SELECT COUNT(*) FROM real_games, bounds b WHERE created_at >= b.today_start AND created_at < b.today_end),
    'uniquePlayersToday', (SELECT COUNT(DISTINCT player_id) FROM real_games, bounds b WHERE created_at >= b.today_start AND created_at < b.today_end),
    'uniquePlayersWeek',  (SELECT COUNT(DISTINCT player_id) FROM real_games, bounds b WHERE created_at >= b.week_start),
    'uniquePlayersMonth', (SELECT COUNT(DISTINCT player_id) FROM real_games, bounds b WHERE created_at >= b.month_start),
    'signupsToday',       (SELECT COUNT(*) FROM signups, bounds b WHERE created_at >= b.today_start AND created_at < b.today_end),
    'signupsWeek',        (SELECT COUNT(*) FROM signups, bounds b WHERE created_at >= b.week_start)
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_activity_stats(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_stats(text) TO service_role;

DROP FUNCTION IF EXISTS public.admin_real_games_stats();
DROP FUNCTION IF EXISTS public.admin_real_games_stats(text);
CREATE FUNCTION public.admin_real_games_stats(p_tz text DEFAULT 'UTC')
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '5s'
AS $function$
  WITH tz AS (
    SELECT public.admin_resolve_timezone(p_tz) AS tz
  ),
  bounds AS (
    SELECT
      date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz AS today_start,
      (date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz) + interval '1 day' AS today_end,
      (date_trunc('day', now() AT TIME ZONE tz.tz) AT TIME ZONE tz.tz) - interval '6 days' AS week_start
    FROM tz
  ),
  test_ids AS (
    SELECT id FROM profiles WHERE is_test_account
  ),
  real_games AS (
    SELECT g.created_at
    FROM game_results g
    WHERE g.word_count > 0
      AND g.game_mode IS DISTINCT FROM 'word-tower'
      AND g.player_id NOT IN (SELECT id FROM test_ids)
    UNION ALL
    SELECT COALESCE(s.completed_at, s.started_at) AS created_at
    FROM game_sessions s
    WHERE s.mode IS DISTINCT FROM 'multiplayer'
      AND s.completed
      AND jsonb_typeof(s.words_found) = 'array'
      AND jsonb_array_length(s.words_found) > 0
      AND (s.user_id IS NULL OR s.user_id NOT IN (SELECT id FROM test_ids))
  )
  SELECT json_build_object(
    'total', COUNT(*),
    'today', COUNT(*) FILTER (WHERE created_at >= b.today_start AND created_at < b.today_end),
    'week',  COUNT(*) FILTER (WHERE created_at >= b.week_start)
  )
  FROM real_games, bounds b;
$function$;

REVOKE ALL ON FUNCTION public.admin_real_games_stats(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_real_games_stats(text) TO service_role;

DROP FUNCTION IF EXISTS public.admin_signup_growth(integer);
DROP FUNCTION IF EXISTS public.admin_signup_growth(integer, text);
CREATE FUNCTION public.admin_signup_growth(weeks integer DEFAULT 26, p_tz text DEFAULT 'UTC')
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH tz AS (
    SELECT public.admin_resolve_timezone(p_tz) AS tz
  ),
  this_week AS (
    SELECT date_trunc('week', now() AT TIME ZONE tz.tz)::date AS wk FROM tz
  ),
  reg AS (
    SELECT date_trunc('week', p.created_at AT TIME ZONE (SELECT tz FROM tz))::date AS wk
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE
  ),
  series AS (
    SELECT generate_series(
      (SELECT wk FROM this_week) - ((GREATEST(weeks, 1) - 1) * 7),
      (SELECT wk FROM this_week),
      INTERVAL '7 days'
    )::date AS wk
  )
  SELECT COALESCE(json_agg(json_build_object(
    'week',    s.wk,
    'signups', (SELECT COUNT(*) FROM reg WHERE reg.wk = s.wk),
    'total',   (SELECT COUNT(*) FROM reg WHERE reg.wk <= s.wk)
  ) ORDER BY s.wk), '[]'::json)
  FROM series s;
$function$;

REVOKE ALL ON FUNCTION public.admin_signup_growth(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_growth(integer, text) TO service_role;

DROP FUNCTION IF EXISTS public.admin_cohort_retention(integer);
DROP FUNCTION IF EXISTS public.admin_cohort_retention(integer, text);
CREATE FUNCTION public.admin_cohort_retention(weeks integer DEFAULT 12, p_tz text DEFAULT 'UTC')
RETURNS TABLE(cohort_week date, week_offset integer, retained bigint, cohort_size bigint, retention_pct numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH tz AS (
    SELECT public.admin_resolve_timezone(p_tz) AS tz
  ),
  cohorts AS (
    SELECT p.id, date_trunc('week', p.created_at AT TIME ZONE (SELECT tz FROM tz))::date AS cohort_week
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.created_at >= NOW() - (weeks || ' weeks')::INTERVAL
      AND p.is_test_account IS NOT TRUE
      AND u.is_anonymous IS NOT TRUE
  ),
  activity AS (
    SELECT player_id, date_trunc('week', created_at AT TIME ZONE (SELECT tz FROM tz))::date AS activity_week
    FROM game_results
    WHERE created_at >= NOW() - (weeks || ' weeks')::INTERVAL
    GROUP BY 1, 2
  ),
  cohort_sizes AS (
    SELECT cohort_week, COUNT(DISTINCT id) AS size
    FROM cohorts
    GROUP BY cohort_week
  )
  SELECT
    c.cohort_week,
    ((a.activity_week - c.cohort_week) / 7)::INT AS week_offset,
    COUNT(DISTINCT c.id)    AS retained,
    cs.size                 AS cohort_size,
    ROUND(100.0 * COUNT(DISTINCT c.id) / NULLIF(cs.size, 0), 1) AS retention_pct
  FROM cohorts c
  JOIN activity a ON c.id = a.player_id
  JOIN cohort_sizes cs ON c.cohort_week = cs.cohort_week
  GROUP BY c.cohort_week, a.activity_week, cs.size
  ORDER BY c.cohort_week, week_offset;
$function$;

REVOKE ALL ON FUNCTION public.admin_cohort_retention(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cohort_retention(integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_engagement_funnel()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH new_users AS (
    SELECT p.id
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.created_at >= NOW() - INTERVAL '30 days'
      AND p.is_test_account IS NOT TRUE
      AND u.is_anonymous IS NOT TRUE
  ),
  activated AS (
    SELECT DISTINCT gr.player_id AS id
    FROM game_results gr
    JOIN new_users nu ON gr.player_id = nu.id
  ),
  day7 AS (
    SELECT DISTINCT gr.player_id AS id
    FROM game_results gr
    JOIN new_users nu ON gr.player_id = nu.id
    JOIN profiles p ON p.id = nu.id
    WHERE gr.created_at >= p.created_at + INTERVAL '7 days'
  ),
  day30 AS (
    SELECT DISTINCT gr.player_id AS id
    FROM game_results gr
    JOIN new_users nu ON gr.player_id = nu.id
    JOIN profiles p ON p.id = nu.id
    WHERE gr.created_at >= p.created_at + INTERVAL '30 days'
  )
  SELECT json_build_object(
    'registered',      (SELECT COUNT(*) FROM new_users),
    'playedFirstGame', (SELECT COUNT(*) FROM activated),
    'returnedDay7',    (SELECT COUNT(*) FROM day7),
    'returnedDay30',   (SELECT COUNT(*) FROM day30)
  );
$function$;

REVOKE ALL ON FUNCTION public.admin_engagement_funnel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_engagement_funnel() TO service_role;
