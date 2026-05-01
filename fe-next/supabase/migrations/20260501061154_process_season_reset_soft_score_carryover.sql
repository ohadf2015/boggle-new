-- Soften season reset: keep 10% of total_score instead of zeroing it.
-- Rationale: dropping every player to 0 makes the new-season podium feel
-- empty/random for hours-to-days until enough games accrue. Carrying 10%
-- preserves leaderboard signal on day-1 while still resetting the race.
-- games_played / games_won stay at 0 (fresh activity counters).
--
-- Already applied to live db via Supabase MCP on 2026-05-01.
-- Companion one-time backfill (season 2 from season 1 archive) executed
-- separately:
--   UPDATE leaderboard lb
--   SET total_score = FLOOR(sl.total_score * 0.10), last_updated = now()
--   FROM season_leaderboards sl
--   WHERE lb.season_id = 2 AND sl.season_id = 1
--     AND sl.player_id = lb.player_id AND sl.total_score > 0;

CREATE OR REPLACE FUNCTION process_season_reset(p_season_id INTEGER)
RETURNS TABLE(snapshotted INTEGER, reset_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snap_count INTEGER := 0;
  v_reset_count INTEGER := 0;
  v_next_id INTEGER := p_season_id + 1;
BEGIN
  -- Phase 1: archive snapshot
  WITH ranked AS (
    SELECT
      lb.player_id,
      lb.username,
      COALESCE(lb.total_score, 0) AS total_score,
      COALESCE(lb.games_played, 0) AS games_played,
      COALESCE(lb.games_won, 0) AS games_won,
      lb.ranked_mmr,
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(lb.total_score, 0) DESC,
                 COALESCE(lb.games_won, 0) DESC
      ) AS rank_position,
      CASE
        WHEN COALESCE(lb.ranked_mmr, 0) >= 2800 THEN 'Grandmaster'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 2400 THEN 'Master'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 2000 THEN 'Diamond'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 1600 THEN 'Platinum'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 1200 THEN 'Gold'
        WHEN COALESCE(lb.ranked_mmr, 0) >= 800  THEN 'Silver'
        ELSE 'Bronze'
      END AS peak_tier
    FROM leaderboard lb
    WHERE lb.season_id = p_season_id
  )
  INSERT INTO season_leaderboards
    (season_id, player_id, username, total_score, games_played,
     games_won, ranked_mmr, rank_position, peak_tier)
  SELECT
    p_season_id, player_id, username, total_score, games_played,
    games_won, ranked_mmr, rank_position, peak_tier
  FROM ranked
  ON CONFLICT (season_id, player_id) DO NOTHING;

  GET DIAGNOSTICS v_snap_count = ROW_COUNT;

  -- Phase 2: append peak tier into profiles.season_peak_tier (idempotent)
  UPDATE profiles p
  SET season_peak_tier = COALESCE(p.season_peak_tier, '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'seasonId', sl.season_id,
      'tier', sl.peak_tier,
      'rankPosition', sl.rank_position,
      'claimedAt', NULL
    ))
  FROM season_leaderboards sl
  WHERE sl.season_id = p_season_id
    AND sl.player_id = p.id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
      WHERE (e->>'seasonId')::int = sl.season_id
    );

  -- Phase 3: soft MMR reset, soft score carryover (10%), bump season
  UPDATE leaderboard
  SET season_id   = v_next_id,
      ranked_mmr  = GREATEST(800, FLOOR(COALESCE(ranked_mmr, 1000) * 0.75) + 250),
      total_score = FLOOR(COALESCE(total_score, 0) * 0.10),
      games_played = 0,
      games_won   = 0,
      last_updated = now()
  WHERE season_id = p_season_id;

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  -- Phase 4: close season
  UPDATE seasons SET status = 'closed' WHERE id = p_season_id;

  RETURN QUERY SELECT v_snap_count, v_reset_count;
END;
$$;
