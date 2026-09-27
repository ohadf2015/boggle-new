-- Exclude multiplayer games with no real opponent from the leaderboard.
--
-- A multiplayer game played by a lone human against bots should not earn
-- competitive leaderboard points (mirrors the XP gate). We capture the real
-- (non-bot) player count on each game_results row at write time and only count
-- rows with >= 2 real players.
--
-- Legacy rows (written before this column existed) have real_player_count NULL;
-- we treat NULL as "counts", so this is forward-only — we cannot reconstruct
-- historical bot rosters, and we don't retroactively strip points from old play.

ALTER TABLE public.game_results
  ADD COLUMN IF NOT EXISTS real_player_count int;

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
      -- Real-opponent gate: count a game only if it had >= 2 real players, or is
      -- a legacy row where the count was never recorded (NULL).
      AND (real_player_count IS NULL OR real_player_count >= 2)
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

-- Backfill so the live board reflects the new gate (no-op for players whose
-- multiplayer rows are all legacy/NULL).
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
