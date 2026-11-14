-- All-time count of real games for the admin Overview hero.
-- A real game is one person's finished game where they found at least one word:
--   * signed-in players' results (game_results), test accounts and the admin-only
--     word-tower preview left out;
--   * finished solo and daily-challenge games (game_sessions, non-multiplayer), by guests
--     or signed-in non-test players. Multiplayer sessions mirror game_results, so they
--     are not counted twice.
-- Bots never write rows, so bot opponents add nothing. "today" is the UTC day and
-- "week" the last 7 days, the same windows the signup counts use.
CREATE OR REPLACE FUNCTION public.admin_real_games_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET statement_timeout TO '5s'
AS $function$
  WITH test_ids AS (
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
    'today', COUNT(*) FILTER (WHERE created_at::date = NOW()::date),
    'week',  COUNT(*) FILTER (WHERE created_at >= (NOW() - INTERVAL '7 days')::date)
  )
  FROM real_games;
$function$;

REVOKE ALL ON FUNCTION public.admin_real_games_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_real_games_stats() TO service_role;
