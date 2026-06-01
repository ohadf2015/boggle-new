-- Two follow-ups to the event-projection season score:
--
-- 1. Daily credit-once is keyed on (player, puzzle_date, LANGUAGE) — a player
--    can credit once per language per day (the route's retry lookup filters by
--    puzzle_date AND language). The recompute deduped only by puzzle_date,
--    undercounting multi-language daily players. Dedup by (puzzle_date, language).
--
-- 2. The season branch of get_leaderboard had no score filter, so the current
--    season board rendered every player including a wall of zero-score rows for
--    people who haven't played the (young) season yet. Filter total_score > 0,
--    matching the all-time branch.

-- ── recompute: dedup daily by (puzzle_date, language) ───────────────────────
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
    total_score=EXCLUDED.total_score, games_played=EXCLUDED.games_played, games_won=EXCLUDED.games_won,
    username=EXCLUDED.username, display_name=EXCLUDED.display_name, avatar_emoji=EXCLUDED.avatar_emoji,
    avatar_color=EXCLUDED.avatar_color, ranked_mmr=EXCLUDED.ranked_mmr, last_updated=now();
END;
$function$;

-- ── get_leaderboard: hide zero-score rows on the season board ────────────────
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_order_by text DEFAULT 'total_score'::text,
  p_season_id integer DEFAULT NULL::integer
)
RETURNS TABLE(player_id uuid, username text, display_name text, avatar_emoji text,
              avatar_color text, avatar_image text, avatar_config jsonb,
              total_score integer, games_played integer, games_won integer,
              ranked_mmr integer, rank_position bigint, season_id integer)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE v_season_id INTEGER;
BEGIN
  v_season_id := COALESCE(p_season_id, public.get_current_season_id(), 1);

  IF v_season_id = 0 THEN
    RETURN QUERY
    SELECT pr.id AS player_id, pr.username, NULLIF(pr.display_name, '') AS display_name,
           pr.avatar_emoji, pr.avatar_color, pr.avatar_image, pr.avatar_config,
           COALESCE(pr.total_score, 0) AS total_score, COALESCE(pr.total_games, 0) AS games_played,
           COALESCE(pr.casual_wins, 0) + COALESCE(pr.ranked_wins, 0) AS games_won,
           COALESCE(pr.ranked_mmr, 1000) AS ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY COALESCE(pr.total_score, 0) DESC, COALESCE(pr.total_games, 0) DESC) AS rank_position,
           0 AS season_id
      FROM profiles pr
     WHERE COALESCE(pr.total_score, 0) > 0
     ORDER BY COALESCE(pr.total_score, 0) DESC, COALESCE(pr.total_games, 0) DESC
     LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  IF p_order_by = 'ranked_mmr' THEN
    RETURN QUERY
    SELECT l.player_id, l.username, l.display_name, l.avatar_emoji, l.avatar_color,
           l.avatar_image, l.avatar_config, l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.ranked_mmr DESC, l.games_won DESC) AS rank_position, l.season_id
      FROM leaderboard l
     WHERE l.season_id = v_season_id AND COALESCE(l.total_score, 0) > 0
     ORDER BY l.ranked_mmr DESC, l.games_won DESC
     LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT l.player_id, l.username, l.display_name, l.avatar_emoji, l.avatar_color,
           l.avatar_image, l.avatar_config, l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.games_played DESC) AS rank_position, l.season_id
      FROM leaderboard l
     WHERE l.season_id = v_season_id AND COALESCE(l.total_score, 0) > 0
     ORDER BY l.total_score DESC, l.games_played DESC
     LIMIT p_limit OFFSET p_offset;
  END IF;
END $function$;

-- Re-run the backfill with the per-language dedup.
DO $$
DECLARE v_sid int; v_start timestamptz; v_end timestamptz; r record;
BEGIN
  SELECT id, start_date, end_date INTO v_sid, v_start, v_end
  FROM seasons WHERE now() >= start_date AND now() < end_date ORDER BY start_date DESC LIMIT 1;
  IF v_sid IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT DISTINCT player_id FROM (
      SELECT player_id FROM leaderboard WHERE season_id = v_sid
      UNION SELECT player_id FROM daily_word_hunt_attempts WHERE completed_at >= v_start AND completed_at < v_end
      UNION SELECT player_id FROM daily_word_wheel_attempts WHERE completed_at >= v_start AND completed_at < v_end
      UNION SELECT player_id FROM game_results WHERE created_at >= v_start AND created_at < v_end
    ) s WHERE player_id IS NOT NULL
  LOOP PERFORM public.recompute_current_season_leaderboard(r.player_id); END LOOP;
END $$;
