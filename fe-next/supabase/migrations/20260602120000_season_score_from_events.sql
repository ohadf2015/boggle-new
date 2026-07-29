-- Season leaderboard = projection of DATED scoring events into the season
-- window. Replaces the broken "lifetime − archived priors" derivation, which
-- dumped homeless historical earnings (daily play that never hit the leaderboard
-- table before this week) onto the freshly-started season — e.g. Ron showed
-- 61,496 in a 1-day-old season for ~2 games of actual play.
--
-- profiles.total_score only ever accrues from three sources (verified):
--   • Word Hunt daily : credited ×3, ONCE per (player, puzzle_date) on the
--                       first submission, if solved (efficiency_score).
--   • Word Wheel daily: credited ×3, once per (player, puzzle_date) (score).
--   • Multiplayer     : credited ×0.25 per game_results row (gated modes 0).
-- So the season score is exactly the sum of those credited events whose credit
-- happened inside the season window. Daily credit time = first submission's
-- completed_at (handles retries via DISTINCT ON, and catch-ups land in the
-- season they were played, matching when total_score moved). MP = created_at.

-- ─────────────────────────────────────────────────────────────────────────────
-- recompute_current_season_leaderboard(player): upsert the player's row for the
-- CURRENT season from their in-window events. Idempotent; safe to call after
-- every game and for backfills.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_current_season_leaderboard(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sid int;
  v_start timestamptz;
  v_end timestamptz;
  v_score numeric := 0;
  v_games bigint := 0;
  v_wins bigint := 0;
  v_username text;
  v_display text;
  v_emoji text;
  v_color text;
  v_mmr int;
BEGIN
  SELECT id, start_date, end_date INTO v_sid, v_start, v_end
  FROM seasons
  WHERE now() >= start_date AND now() < end_date
  ORDER BY start_date DESC
  LIMIT 1;
  IF v_sid IS NULL THEN RETURN; END IF;

  SELECT username, display_name, avatar_emoji, avatar_color, COALESCE(ranked_mmr, 1000)
  INTO v_username, v_display, v_emoji, v_color, v_mmr
  FROM profiles WHERE id = p_player_id;
  IF v_username IS NULL THEN RETURN; END IF;

  WITH first_hunt AS (
    -- first-ever submission per puzzle = the one that credited total_score
    SELECT DISTINCT ON (puzzle_date) puzzle_date, completed_at, solved, efficiency_score
    FROM daily_word_hunt_attempts
    WHERE player_id = p_player_id
    ORDER BY puzzle_date, completed_at ASC
  ),
  first_wheel AS (
    SELECT DISTINCT ON (puzzle_date) puzzle_date, completed_at, score
    FROM daily_word_wheel_attempts
    WHERE player_id = p_player_id
    ORDER BY puzzle_date, completed_at ASC
  ),
  mp AS (
    SELECT score, placement, created_at
    FROM game_results
    WHERE player_id = p_player_id
      AND game_mode IS DISTINCT FROM 'word-tower'
      AND game_mode IS DISTINCT FROM 'shiritori'
  )
  SELECT
    COALESCE((SELECT SUM(ROUND(efficiency_score * 3)) FROM first_hunt
              WHERE solved AND efficiency_score > 0 AND completed_at >= v_start AND completed_at < v_end), 0)
  + COALESCE((SELECT SUM(ROUND(score * 3)) FROM first_wheel
              WHERE score > 0 AND completed_at >= v_start AND completed_at < v_end), 0)
  + COALESCE((SELECT SUM(ROUND(score * 0.25)) FROM mp
              WHERE score > 0 AND created_at >= v_start AND created_at < v_end), 0),
    COALESCE((SELECT count(*) FROM first_hunt
              WHERE solved AND completed_at >= v_start AND completed_at < v_end), 0)
  + COALESCE((SELECT count(*) FROM first_wheel
              WHERE score > 0 AND completed_at >= v_start AND completed_at < v_end), 0)
  + COALESCE((SELECT count(*) FROM mp
              WHERE created_at >= v_start AND created_at < v_end), 0),
    COALESCE((SELECT count(*) FROM mp
              WHERE placement = 1 AND created_at >= v_start AND created_at < v_end), 0)
  INTO v_score, v_games, v_wins;

  INSERT INTO leaderboard
    (player_id, season_id, username, display_name, avatar_emoji, avatar_color,
     total_score, games_played, games_won, ranked_mmr, last_updated)
  VALUES
    (p_player_id, v_sid, v_username, v_display, v_emoji, v_color,
     GREATEST(0, v_score)::int, GREATEST(0, v_games)::int,
     LEAST(GREATEST(0, v_games), GREATEST(0, v_wins))::int, v_mmr, now())
  ON CONFLICT (player_id, season_id) DO UPDATE SET
    total_score  = EXCLUDED.total_score,
    games_played = EXCLUDED.games_played,
    games_won    = EXCLUDED.games_won,
    username     = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_emoji = EXCLUDED.avatar_emoji,
    avatar_color = EXCLUDED.avatar_color,
    ranked_mmr   = EXCLUDED.ranked_mmr,
    last_updated = now();
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- process_season_reset: start the new season EMPTY (total_score 0). The event
-- recompute fills each row on the player's first game of the season, so there
-- is no carry-inflation and non-players correctly show 0. (Identical to the
-- live definition except Phase 3 no longer carries 10% of the prior score.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_season_reset(p_season_id integer)
RETURNS TABLE(snapshotted integer, reset_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_snap_count INTEGER := 0;
  v_reset_count INTEGER := 0;
  v_next_id INTEGER := p_season_id + 1;
BEGIN
  WITH ranked AS (
    SELECT
      lb.player_id, lb.username,
      COALESCE(lb.total_score, 0) AS total_score,
      COALESCE(lb.games_played, 0) AS games_played,
      COALESCE(lb.games_won, 0) AS games_won,
      lb.ranked_mmr,
      ROW_NUMBER() OVER (ORDER BY COALESCE(lb.total_score, 0) DESC,
                                  COALESCE(lb.games_won, 0) DESC) AS rank_position,
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
  SELECT p_season_id, player_id, username, total_score, games_played,
         games_won, ranked_mmr, rank_position, peak_tier
  FROM ranked
  ON CONFLICT (season_id, player_id) DO NOTHING;

  GET DIAGNOSTICS v_snap_count = ROW_COUNT;

  UPDATE profiles p
  SET season_peak_tier = COALESCE(p.season_peak_tier, '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
      'seasonId', sl.season_id, 'tier', sl.peak_tier,
      'rankPosition', sl.rank_position, 'claimedAt', NULL))
  FROM season_leaderboards sl
  WHERE sl.season_id = p_season_id AND sl.player_id = p.id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(p.season_peak_tier, '[]'::jsonb)) e
      WHERE (e->>'seasonId')::int = sl.season_id);

  -- Phase 3: soft MMR reset, bump season, START SCORE AT ZERO (no carry).
  UPDATE leaderboard
  SET season_id    = v_next_id,
      ranked_mmr   = GREATEST(800, FLOOR(COALESCE(ranked_mmr, 1000) * 0.75) + 250),
      total_score  = 0,
      games_played = 0,
      games_won    = 0,
      last_updated = now()
  WHERE season_id = p_season_id;

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  UPDATE seasons SET status = 'closed' WHERE id = p_season_id;

  RETURN QUERY SELECT v_snap_count, v_reset_count;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: recompute every current-season row + anyone with in-window events
-- (daily-only players who lacked a row). Replaces the carry-inflated values.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_sid int; v_start timestamptz; v_end timestamptz; r record;
BEGIN
  SELECT id, start_date, end_date INTO v_sid, v_start, v_end
  FROM seasons WHERE now() >= start_date AND now() < end_date
  ORDER BY start_date DESC LIMIT 1;
  IF v_sid IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT DISTINCT player_id FROM (
      SELECT player_id FROM leaderboard WHERE season_id = v_sid
      UNION SELECT player_id FROM daily_word_hunt_attempts WHERE completed_at >= v_start AND completed_at < v_end
      UNION SELECT player_id FROM daily_word_wheel_attempts WHERE completed_at >= v_start AND completed_at < v_end
      UNION SELECT player_id FROM game_results WHERE created_at >= v_start AND created_at < v_end
    ) s
    WHERE player_id IS NOT NULL
  LOOP
    PERFORM public.recompute_current_season_leaderboard(r.player_id);
  END LOOP;
END $$;
