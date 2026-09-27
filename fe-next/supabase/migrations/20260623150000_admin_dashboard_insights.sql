-- Admin dashboard "insights" bundle: one read-only SQL function returning a
-- jsonb object with every insight section, so the API route makes a single
-- round-trip (mirrors admin_cohort_retention / admin_engagement_funnel).
--
-- Read-only. NOT added to supabase_realtime (no consumer, see rule 50).
-- All time buckets are UTC (project timezone). Day-of-week is tz-robust;
-- hour-of-day is labelled UTC on the client.

CREATE OR REPLACE FUNCTION public.admin_dashboard_insights(p_days INT DEFAULT 90)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH gr AS (
  SELECT player_id, game_mode, score, word_count, language, created_at
  FROM game_results
  WHERE created_at > now() - make_interval(days => p_days)
),
-- Day-of-week histogram (0=Sun .. 6=Sat, UTC)
dow AS (
  SELECT extract(dow FROM created_at)::int AS bucket, count(*) AS games
  FROM gr GROUP BY 1
),
-- Hour-of-day histogram (0..23, UTC)
hod AS (
  SELECT extract(hour FROM created_at)::int AS bucket, count(*) AS games
  FROM gr GROUP BY 1
),
-- Mode affinity: of players who played mode A, what % also played mode B
pm AS (
  SELECT DISTINCT player_id, game_mode FROM gr WHERE player_id IS NOT NULL
),
mode_players AS (SELECT game_mode, count(*) AS players FROM pm GROUP BY 1),
affinity AS (
  SELECT a.game_mode AS from_mode, b.game_mode AS to_mode,
         count(*) AS both_cnt, c.players AS from_players,
         round(100.0 * count(*) / c.players)::int AS pct
  FROM pm a
  JOIN pm b ON a.player_id = b.player_id AND a.game_mode <> b.game_mode
  JOIN mode_players c ON c.game_mode = a.game_mode
  WHERE c.players >= 5
  GROUP BY 1, 2, c.players
  ORDER BY pct DESC, both_cnt DESC
  LIMIT 12
),
-- Daily totals for records / deltas (last 120d regardless of p_days)
daily AS (
  SELECT date_trunc('day', created_at)::date AS day, count(*) AS games
  FROM game_results WHERE created_at > now() - interval '120 days'
  GROUP BY 1
),
-- Fastest-growing mode: this 7d vs prior 7d (min volume guard)
mode_growth AS (
  SELECT game_mode,
         count(*) FILTER (WHERE created_at > now() - interval '7 days')  AS this_week,
         count(*) FILTER (WHERE created_at > now() - interval '14 days'
                            AND created_at <= now() - interval '7 days') AS prev_week
  FROM game_results WHERE created_at > now() - interval '14 days'
  GROUP BY 1
),
fastest AS (
  SELECT game_mode,
         round(100.0 * (this_week - prev_week) / NULLIF(prev_week, 0))::int AS growth_pct
  FROM mode_growth
  WHERE prev_week >= 3 AND this_week > prev_week
  ORDER BY growth_pct DESC NULLS LAST
  LIMIT 1
),
-- Join-without-playing rate per mode (the "0 words / 0 score" noise, reframed)
no_show AS (
  SELECT game_mode AS mode, count(*) AS total,
         count(*) FILTER (WHERE score = 0 AND word_count = 0) AS no_shows,
         round(100.0 * count(*) FILTER (WHERE score = 0 AND word_count = 0)
                     / NULLIF(count(*), 0), 1) AS pct
  FROM gr GROUP BY 1 ORDER BY total DESC
),
-- Word-quality / dictionary-gap pressure per language (last 30d):
-- accepted words (game_results.word_count) vs rejected submissions queued
-- for review. High reject rate => weak dictionary coverage for that language.
inv AS (
  SELECT language, count(*) AS invalid FROM invalid_word_submissions
  WHERE COALESCE(rejected_at, created_at) > now() - interval '30 days'
  GROUP BY 1
),
val AS (
  SELECT language, COALESCE(sum(word_count), 0) AS valid FROM game_results
  WHERE created_at > now() - interval '30 days' GROUP BY 1
),
word_quality AS (
  SELECT COALESCE(v.language, i.language) AS language,
         COALESCE(v.valid, 0)   AS valid,
         COALESCE(i.invalid, 0) AS invalid,
         round(100.0 * COALESCE(i.invalid, 0)
               / NULLIF(COALESCE(v.valid, 0) + COALESCE(i.invalid, 0), 0), 1) AS reject_rate
  FROM val v FULL OUTER JOIN inv i ON v.language = i.language
  WHERE COALESCE(v.language, i.language) IS NOT NULL
  ORDER BY valid DESC
)
SELECT json_build_object(
  'dayOfWeek',   COALESCE((SELECT json_agg(json_build_object('dow', bucket, 'games', games) ORDER BY bucket) FROM dow), '[]'::json),
  'hourOfDay',   COALESCE((SELECT json_agg(json_build_object('hour', bucket, 'games', games) ORDER BY bucket) FROM hod), '[]'::json),
  'modeAffinity', COALESCE((SELECT json_agg(json_build_object('fromMode', from_mode, 'toMode', to_mode, 'both', both_cnt, 'fromPlayers', from_players, 'pct', pct)) FROM affinity), '[]'::json),
  'records', json_build_object(
    'today',        COALESCE((SELECT games FROM daily WHERE day = (now() AT TIME ZONE 'UTC')::date), 0),
    'yesterday',    COALESCE((SELECT games FROM daily WHERE day = (now() AT TIME ZONE 'UTC')::date - 1), 0),
    'bestDay',      (SELECT day FROM daily ORDER BY games DESC, day DESC LIMIT 1),
    'bestDayGames', COALESCE((SELECT max(games) FROM daily), 0),
    'fastestMode',  (SELECT game_mode FROM fastest),
    'fastestPct',   (SELECT growth_pct FROM fastest)
  ),
  'noShowByMode', COALESCE((SELECT json_agg(json_build_object('mode', mode, 'total', total, 'noShows', no_shows, 'pct', pct)) FROM no_show), '[]'::json),
  'wordQualityByLang', COALESCE((SELECT json_agg(json_build_object('language', language, 'valid', valid, 'invalid', invalid, 'rejectRate', reject_rate)) FROM word_quality), '[]'::json)
);
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_insights(INT) TO service_role;
