-- Backfill: heal cross-season inflation of leaderboard.games_played /
-- games_won. Same root-cause family as the score fix in
-- 20260503210000_sync_profile_to_leaderboard_metadata_only.sql:
-- updateLeaderboardEntry was writing lifetime profile.total_games and
-- lifetime (casual_wins + ranked_wins) into season-scoped rows. Code is
-- now derived (backend/modules/supabase/leaderboard.ts), so we backfill
-- existing rows with the same formula to make the DB idempotent with the
-- next runtime write.
--
-- Formula (no 10% carry — process_season_reset zeroes counters at rollover):
--   season_games_played = max(0, profile.total_games − Σ prior_snapshot.games_played)
--   season_games_won    = max(0, lifetime_wins       − Σ prior_snapshot.games_won)
-- where lifetime_wins = COALESCE(casual_wins,0) + COALESCE(ranked_wins,0).

WITH cur AS (
  SELECT COALESCE(get_current_season_id(), 1) AS sid
),
priors AS (
  SELECT
    sl.player_id,
    SUM(sl.games_played)::BIGINT AS sum_games,
    SUM(sl.games_won)::BIGINT    AS sum_wins
  FROM season_leaderboards sl, cur
  WHERE sl.season_id < cur.sid
  GROUP BY sl.player_id
),
target AS (
  SELECT
    p.id AS player_id,
    GREATEST(0,
      COALESCE(p.total_games, 0)::BIGINT - COALESCE(pr.sum_games, 0)
    )::INTEGER AS new_games,
    -- Clamp wins ≤ games to neutralise pre-fix snapshot gaps where games_won
    -- captured only ranked_wins (missing casual_wins) at S1 rollover.
    LEAST(
      GREATEST(0, COALESCE(p.total_games, 0)::BIGINT - COALESCE(pr.sum_games, 0))::INTEGER,
      GREATEST(0,
        (COALESCE(p.casual_wins, 0) + COALESCE(p.ranked_wins, 0))::BIGINT
          - COALESCE(pr.sum_wins, 0)
      )::INTEGER
    ) AS new_wins
  FROM profiles p
  LEFT JOIN priors pr ON pr.player_id = p.id
)
UPDATE leaderboard l
SET games_played = t.new_games,
    games_won    = t.new_wins,
    last_updated = NOW()
FROM target t, cur c
WHERE l.player_id = t.player_id
  AND l.season_id = c.sid;
