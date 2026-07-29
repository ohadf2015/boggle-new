-- Add 10% prior-season carryover to daily challenge season leaderboards
-- so a fresh season feels populated on day 1. Mirrors the table-based
-- soft reset shipped for `leaderboard` (process_season_reset) on the
-- same day.
--
-- DROP + CREATE rather than CREATE OR REPLACE because the language column
-- type narrows from base varchar (in the new CTE) back to varchar(5)
-- (existing column declaration), which CREATE OR REPLACE rejects. No
-- dependent views (verified via pg_views before applying).
--
-- Already applied to live db via Supabase MCP on 2026-05-01.

BEGIN;

DROP VIEW IF EXISTS daily_word_hunt_season_leaderboard;
DROP VIEW IF EXISTS daily_word_wheel_season_leaderboard;
DROP VIEW IF EXISTS daily_puzzle_season_leaderboard;

-- ── Word Hunt season aggregate ─────────────────────────────────────────
CREATE VIEW daily_word_hunt_season_leaderboard AS
WITH current_agg AS (
  SELECT
    a.player_id,
    a.language,
    s.id AS season_id,
    SUM(CASE WHEN a.solved THEN 1 ELSE 0 END)::bigint AS solves,
    COALESCE(SUM(a.efficiency_score), 0)::bigint AS season_score,
    COUNT(*)::bigint AS attempts,
    MAX(a.completed_at) AS last_played_at
  FROM daily_word_hunt_attempts a
  JOIN seasons s
    ON a.puzzle_date >= s.start_date::date
   AND a.puzzle_date <  s.end_date::date
  WHERE a.player_id IS NOT NULL
  GROUP BY a.player_id, a.language, s.id
),
prior_carry AS (
  SELECT
    c.player_id,
    c.language,
    (c.season_id + 1) AS season_id,
    FLOOR(c.season_score * 0.10)::bigint AS carry_score
  FROM current_agg c
  WHERE c.season_score > 0
),
combined AS (
  SELECT
    COALESCE(c.player_id, p.player_id) AS player_id,
    COALESCE(c.language, p.language)::varchar(5) AS language,
    COALESCE(c.season_id, p.season_id) AS season_id,
    COALESCE(c.solves, 0)::bigint AS solves,
    (COALESCE(c.season_score, 0) + COALESCE(p.carry_score, 0))::bigint AS season_score,
    COALESCE(c.attempts, 0)::bigint AS attempts,
    c.last_played_at
  FROM current_agg c
  FULL OUTER JOIN prior_carry p
    ON c.player_id = p.player_id
   AND c.language  = p.language
   AND c.season_id = p.season_id
)
SELECT
  combined.season_id,
  combined.player_id,
  pr.username,
  pr.avatar_emoji,
  pr.avatar_color,
  combined.language,
  combined.solves,
  combined.season_score,
  combined.attempts,
  combined.last_played_at,
  ROW_NUMBER() OVER (
    PARTITION BY combined.season_id, combined.language
    ORDER BY combined.season_score DESC, combined.solves DESC, combined.last_played_at ASC NULLS LAST
  ) AS rank_position
FROM combined
LEFT JOIN profiles pr ON pr.id = combined.player_id;

-- ── Word Wheel season aggregate ────────────────────────────────────────
CREATE VIEW daily_word_wheel_season_leaderboard AS
WITH current_agg AS (
  SELECT
    a.player_id,
    a.language,
    s.id AS season_id,
    COALESCE(SUM(a.score), 0)::bigint AS season_score,
    COALESCE(SUM(a.word_count), 0)::bigint AS total_words,
    COUNT(*)::bigint AS attempts,
    MAX(a.completed_at) AS last_played_at
  FROM daily_word_wheel_attempts a
  JOIN seasons s
    ON a.puzzle_date >= s.start_date::date
   AND a.puzzle_date <  s.end_date::date
  WHERE a.player_id IS NOT NULL
  GROUP BY a.player_id, a.language, s.id
),
prior_carry AS (
  SELECT
    c.player_id,
    c.language,
    (c.season_id + 1) AS season_id,
    FLOOR(c.season_score * 0.10)::bigint AS carry_score
  FROM current_agg c
  WHERE c.season_score > 0
),
combined AS (
  SELECT
    COALESCE(c.player_id, p.player_id) AS player_id,
    COALESCE(c.language, p.language)::varchar(5) AS language,
    COALESCE(c.season_id, p.season_id) AS season_id,
    (COALESCE(c.season_score, 0) + COALESCE(p.carry_score, 0))::bigint AS season_score,
    COALESCE(c.total_words, 0)::bigint AS total_words,
    COALESCE(c.attempts, 0)::bigint AS attempts,
    c.last_played_at
  FROM current_agg c
  FULL OUTER JOIN prior_carry p
    ON c.player_id = p.player_id
   AND c.language  = p.language
   AND c.season_id = p.season_id
)
SELECT
  combined.season_id,
  combined.player_id,
  pr.username,
  pr.avatar_emoji,
  pr.avatar_color,
  combined.language,
  combined.season_score,
  combined.total_words,
  combined.attempts,
  combined.last_played_at,
  ROW_NUMBER() OVER (
    PARTITION BY combined.season_id, combined.language
    ORDER BY combined.season_score DESC, combined.total_words DESC, combined.last_played_at ASC NULLS LAST
  ) AS rank_position
FROM combined
LEFT JOIN profiles pr ON pr.id = combined.player_id;

-- ── Daily puzzle (legacy) season aggregate — language is text ──────────
CREATE VIEW daily_puzzle_season_leaderboard AS
WITH current_agg AS (
  SELECT
    a.player_id,
    a.language,
    s.id AS season_id,
    COALESCE(SUM(a.score), 0)::bigint AS season_score,
    COALESCE(SUM(a.word_count), 0)::bigint AS total_words,
    COUNT(*)::bigint AS attempts,
    MAX(a.completed_at) AS last_played_at
  FROM daily_puzzle_attempts a
  JOIN seasons s
    ON a.puzzle_date >= s.start_date::date
   AND a.puzzle_date <  s.end_date::date
  WHERE a.player_id IS NOT NULL
  GROUP BY a.player_id, a.language, s.id
),
prior_carry AS (
  SELECT
    c.player_id,
    c.language,
    (c.season_id + 1) AS season_id,
    FLOOR(c.season_score * 0.10)::bigint AS carry_score
  FROM current_agg c
  WHERE c.season_score > 0
),
combined AS (
  SELECT
    COALESCE(c.player_id, p.player_id) AS player_id,
    COALESCE(c.language, p.language)::text AS language,
    COALESCE(c.season_id, p.season_id) AS season_id,
    (COALESCE(c.season_score, 0) + COALESCE(p.carry_score, 0))::bigint AS season_score,
    COALESCE(c.total_words, 0)::bigint AS total_words,
    COALESCE(c.attempts, 0)::bigint AS attempts,
    c.last_played_at
  FROM current_agg c
  FULL OUTER JOIN prior_carry p
    ON c.player_id = p.player_id
   AND c.language  = p.language
   AND c.season_id = p.season_id
)
SELECT
  combined.season_id,
  combined.player_id,
  pr.username,
  pr.avatar_emoji,
  pr.avatar_color,
  combined.language,
  combined.season_score,
  combined.total_words,
  combined.attempts,
  combined.last_played_at,
  ROW_NUMBER() OVER (
    PARTITION BY combined.season_id, combined.language
    ORDER BY combined.season_score DESC, combined.total_words DESC, combined.last_played_at ASC NULLS LAST
  ) AS rank_position
FROM combined
LEFT JOIN profiles pr ON pr.id = combined.player_id;

ALTER VIEW daily_word_hunt_season_leaderboard  SET (security_invoker = true);
ALTER VIEW daily_word_wheel_season_leaderboard SET (security_invoker = true);
ALTER VIEW daily_puzzle_season_leaderboard     SET (security_invoker = true);

GRANT SELECT ON daily_word_hunt_season_leaderboard  TO anon, authenticated, service_role;
GRANT SELECT ON daily_word_wheel_season_leaderboard TO anon, authenticated, service_role;
GRANT SELECT ON daily_puzzle_season_leaderboard     TO anon, authenticated, service_role;

COMMIT;
