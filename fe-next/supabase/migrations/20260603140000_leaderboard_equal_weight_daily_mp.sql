-- Equalize daily and multiplayer leaderboard weighting.
--
-- Previously the season leaderboard amplified daily play (efficiency_score * 3,
-- wheel score * 3) and attenuated multiplayer (game score * 0.25) — a ~60:1
-- per-game ratio that made multiplayer wins effectively worthless on the board
-- (e.g. a player who won 2 multiplayer games sat below a player who did a couple
-- of dailies and won nothing).
--
-- New policy: ALL sources count at 1x. The season score is the raw sum of earned
-- points. Daily still tends to rank high because its raw per-game scores are
-- larger, but multiplayer now counts fully and compounds across games.
--
-- This MUST stay in sync with the TypeScript weights in
-- backend/modules/leaderboardScoring.ts (DAILY_LEADERBOARD_WEIGHT,
-- CASUAL_LEADERBOARD_WEIGHT), both now 1.

CREATE OR REPLACE FUNCTION public.recompute_current_season_leaderboard(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sid int; v_start timestamptz; v_end timestamptz;
  v_score numeric := 0; v_games bigint := 0; v_wins bigint := 0;
  v_username text; v_display text; v_emoji text; v_color text; v_mmr int;
BEGIN
  SELECT id, start_date, end_date INTO v_sid, v_start, v_end
  FROM seasons WHERE now() >= start_date AND now() < end_date
  ORDER BY start_date DESC LIMIT 1;
  IF v_sid IS NULL THEN RETURN; END IF;

  SELECT username, display_name, avatar_emoji, avatar_color, COALESCE(ranked_mmr, 1000)
  INTO v_username, v_display, v_emoji, v_color, v_mmr
  FROM profiles WHERE id = p_player_id;
  IF v_username IS NULL THEN RETURN; END IF;

  WITH first_hunt AS (
    SELECT DISTINCT ON (puzzle_date, language) completed_at, solved, efficiency_score
    FROM daily_word_hunt_attempts WHERE player_id = p_player_id
    ORDER BY puzzle_date, language, completed_at ASC
  ),
  first_wheel AS (
    SELECT DISTINCT ON (puzzle_date, language) completed_at, score
    FROM daily_word_wheel_attempts WHERE player_id = p_player_id
    ORDER BY puzzle_date, language, completed_at ASC
  ),
  mp AS (
    SELECT score, placement, created_at FROM game_results
    WHERE player_id = p_player_id
      AND game_mode IS DISTINCT FROM 'word-tower' AND game_mode IS DISTINCT FROM 'shiritori'
  )
  SELECT
    COALESCE((SELECT SUM(ROUND(efficiency_score * 1)) FROM first_hunt
              WHERE solved AND efficiency_score > 0 AND completed_at >= v_start AND completed_at < v_end), 0)
  + COALESCE((SELECT SUM(ROUND(score * 1)) FROM first_wheel
              WHERE score > 0 AND completed_at >= v_start AND completed_at < v_end), 0)
  + COALESCE((SELECT SUM(ROUND(score * 1)) FROM mp
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
    total_score=EXCLUDED.total_score, games_played=EXCLUDED.games_played, games_won=EXCLUDED.games_won,
    username=EXCLUDED.username, display_name=EXCLUDED.display_name, avatar_emoji=EXCLUDED.avatar_emoji,
    avatar_color=EXCLUDED.avatar_color, ranked_mmr=EXCLUDED.ranked_mmr, last_updated=now();
END;
$function$;

-- Backfill: recompute every player who has any current-season events or an
-- existing leaderboard row, so the live board reflects the new 1x weighting.
DO $$
DECLARE r record; v_sid int;
BEGIN
  SELECT id INTO v_sid FROM seasons
  WHERE now() >= start_date AND now() < end_date
  ORDER BY start_date DESC LIMIT 1;
  IF v_sid IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT DISTINCT player_id FROM (
      SELECT player_id FROM daily_word_hunt_attempts
      UNION SELECT player_id FROM daily_word_wheel_attempts
      UNION SELECT player_id FROM game_results
      UNION SELECT player_id FROM leaderboard WHERE season_id = v_sid
    ) u
    WHERE player_id IS NOT NULL
  LOOP
    PERFORM public.recompute_current_season_leaderboard(r.player_id);
  END LOOP;
END $$;
