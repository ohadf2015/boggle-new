-- Daily challenge season-windowed leaderboard views.
-- Aggregates daily_*_attempts within [seasons.start_date, seasons.end_date).
-- No schema change to underlying daily tables; existing puzzle_date indexes
-- carry the season filter through the JOIN.

BEGIN;

-- ── Word Hunt season aggregate ─────────────────────────────────────────
CREATE OR REPLACE VIEW daily_word_hunt_season_leaderboard AS
WITH agg AS (
  SELECT
    a.player_id,
    a.language,
    s.id AS season_id,
    SUM(CASE WHEN a.solved THEN 1 ELSE 0 END) AS solves,
    COALESCE(SUM(a.efficiency_score), 0) AS season_score,
    COUNT(*) AS attempts,
    MAX(a.completed_at) AS last_played_at
  FROM daily_word_hunt_attempts a
  JOIN seasons s
    ON a.puzzle_date >= s.start_date::date
   AND a.puzzle_date <  s.end_date::date
  WHERE a.player_id IS NOT NULL
  GROUP BY a.player_id, a.language, s.id
)
SELECT
  agg.season_id,
  agg.player_id,
  p.username,
  p.avatar_emoji,
  p.avatar_color,
  agg.language,
  agg.solves,
  agg.season_score,
  agg.attempts,
  agg.last_played_at,
  ROW_NUMBER() OVER (
    PARTITION BY agg.season_id, agg.language
    ORDER BY agg.season_score DESC, agg.solves DESC, agg.last_played_at ASC
  ) AS rank_position
FROM agg
LEFT JOIN profiles p ON p.id = agg.player_id;

-- ── Word Wheel season aggregate ────────────────────────────────────────
CREATE OR REPLACE VIEW daily_word_wheel_season_leaderboard AS
WITH agg AS (
  SELECT
    a.player_id,
    a.language,
    s.id AS season_id,
    COALESCE(SUM(a.score), 0) AS season_score,
    COALESCE(SUM(a.word_count), 0) AS total_words,
    COUNT(*) AS attempts,
    MAX(a.completed_at) AS last_played_at
  FROM daily_word_wheel_attempts a
  JOIN seasons s
    ON a.puzzle_date >= s.start_date::date
   AND a.puzzle_date <  s.end_date::date
  WHERE a.player_id IS NOT NULL
  GROUP BY a.player_id, a.language, s.id
)
SELECT
  agg.season_id,
  agg.player_id,
  p.username,
  p.avatar_emoji,
  p.avatar_color,
  agg.language,
  agg.season_score,
  agg.total_words,
  agg.attempts,
  agg.last_played_at,
  ROW_NUMBER() OVER (
    PARTITION BY agg.season_id, agg.language
    ORDER BY agg.season_score DESC, agg.total_words DESC, agg.last_played_at ASC
  ) AS rank_position
FROM agg
LEFT JOIN profiles p ON p.id = agg.player_id;

-- ── Daily puzzle (legacy) season aggregate ─────────────────────────────
CREATE OR REPLACE VIEW daily_puzzle_season_leaderboard AS
WITH agg AS (
  SELECT
    a.player_id,
    a.language,
    s.id AS season_id,
    COALESCE(SUM(a.score), 0) AS season_score,
    COALESCE(SUM(a.word_count), 0) AS total_words,
    COUNT(*) AS attempts,
    MAX(a.completed_at) AS last_played_at
  FROM daily_puzzle_attempts a
  JOIN seasons s
    ON a.puzzle_date >= s.start_date::date
   AND a.puzzle_date <  s.end_date::date
  WHERE a.player_id IS NOT NULL
  GROUP BY a.player_id, a.language, s.id
)
SELECT
  agg.season_id,
  agg.player_id,
  p.username,
  p.avatar_emoji,
  p.avatar_color,
  agg.language,
  agg.season_score,
  agg.total_words,
  agg.attempts,
  agg.last_played_at,
  ROW_NUMBER() OVER (
    PARTITION BY agg.season_id, agg.language
    ORDER BY agg.season_score DESC, agg.total_words DESC, agg.last_played_at ASC
  ) AS rank_position
FROM agg
LEFT JOIN profiles p ON p.id = agg.player_id;

-- Force security_invoker so RLS of the calling user applies (Postgres
-- defaults views to SECURITY DEFINER otherwise, which leaks RLS).
ALTER VIEW daily_word_hunt_season_leaderboard SET (security_invoker = true);
ALTER VIEW daily_word_wheel_season_leaderboard SET (security_invoker = true);
ALTER VIEW daily_puzzle_season_leaderboard SET (security_invoker = true);

GRANT SELECT ON daily_word_hunt_season_leaderboard TO anon, authenticated, service_role;
GRANT SELECT ON daily_word_wheel_season_leaderboard TO anon, authenticated, service_role;
GRANT SELECT ON daily_puzzle_season_leaderboard TO anon, authenticated, service_role;

COMMIT;
