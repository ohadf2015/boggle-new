-- Admin dashboard counts only real people: no test accounts, and "players"
-- means registered (non-anonymous) users, with guests reported separately.

CREATE OR REPLACE FUNCTION public.admin_overview_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH real_users AS (
    SELECT p.id, p.total_words, p.total_time_played, (u.is_anonymous IS NOT TRUE) AS registered
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.is_test_account IS NOT TRUE
  )
  SELECT json_build_object(
    'totalPlayers',       (SELECT COUNT(*) FROM real_users WHERE registered),
    'totalGuests',        (SELECT COUNT(*) FROM real_users WHERE NOT registered),
    'testAccounts',       (SELECT COUNT(*) FROM profiles WHERE is_test_account),
    'totalGames',         (SELECT COUNT(*) FROM game_results g WHERE g.player_id IN (SELECT id FROM real_users)),
    'totalWords',         (SELECT COALESCE(SUM(total_words), 0) FROM real_users),
    'totalGameTimeHours', (SELECT ROUND(COALESCE(SUM(total_time_played), 0) / 3600.0, 1) FROM real_users)
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_activity_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH periods AS (
    SELECT
      NOW()::date                          AS today,
      (NOW() - INTERVAL '7 days')::date   AS week_ago,
      (NOW() - INTERVAL '30 days')::date  AS month_ago
  ),
  real_games AS (
    SELECT g.player_id, g.created_at
    FROM game_results g
    WHERE g.player_id NOT IN (SELECT id FROM profiles WHERE is_test_account)
      AND g.created_at >= (SELECT month_ago FROM periods)
  ),
  signups AS (
    SELECT p.created_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE
  )
  SELECT json_build_object(
    'gamesToday',         (SELECT COUNT(*) FROM real_games WHERE created_at::date = (SELECT today FROM periods)),
    'uniquePlayersToday', (SELECT COUNT(DISTINCT player_id) FROM real_games WHERE created_at::date = (SELECT today FROM periods)),
    'uniquePlayersWeek',  (SELECT COUNT(DISTINCT player_id) FROM real_games WHERE created_at >= (SELECT week_ago FROM periods)),
    'uniquePlayersMonth', (SELECT COUNT(DISTINCT player_id) FROM real_games),
    'signupsToday',       (SELECT COUNT(*) FROM signups WHERE created_at::date = (SELECT today FROM periods)),
    'signupsWeek',        (SELECT COUNT(*) FROM signups WHERE created_at >= (SELECT week_ago FROM periods))
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_signup_growth(weeks integer DEFAULT 26)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH reg AS (
    SELECT date_trunc('week', p.created_at)::date AS wk
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.is_test_account IS NOT TRUE AND u.is_anonymous IS NOT TRUE
  ),
  series AS (
    SELECT generate_series(
      date_trunc('week', NOW())::date - ((GREATEST(weeks, 1) - 1) * 7),
      date_trunc('week', NOW())::date,
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

REVOKE ALL ON FUNCTION public.admin_signup_growth(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_signup_growth(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_language_breakdown()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(json_object_agg(lang, cnt), '{}'::json)
  FROM (
    SELECT COALESCE(language, 'en') AS lang, COUNT(*) AS cnt
    FROM game_results
    WHERE player_id NOT IN (SELECT id FROM profiles WHERE is_test_account)
    GROUP BY 1
    ORDER BY cnt DESC
  ) sub;
$function$;

CREATE OR REPLACE FUNCTION public.admin_cohort_retention(weeks integer DEFAULT 12)
RETURNS TABLE(cohort_week date, week_offset integer, retained bigint, cohort_size bigint, retention_pct numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH cohorts AS (
    SELECT id, date_trunc('week', created_at)::date AS cohort_week
    FROM profiles
    WHERE created_at >= NOW() - (weeks || ' weeks')::INTERVAL
      AND is_test_account IS NOT TRUE
  ),
  activity AS (
    SELECT player_id, date_trunc('week', created_at)::date AS activity_week
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

CREATE OR REPLACE FUNCTION public.admin_engagement_funnel()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH new_users AS (
    SELECT id
    FROM profiles
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND user_role IS NOT NULL
      AND is_test_account IS NOT TRUE
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
