-- Make get_user_rank season-aware. Pre-seasons it ranked across the whole
-- leaderboard table; post-seasons the table can briefly hold rows on
-- multiple seasons during the cron's transition window, which would
-- inflate rank counts. Restrict to the requesting player's current season.

CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id uuid)
RETURNS TABLE(rank_position bigint, total_score integer, games_played integer, ranked_mmr integer, total_players bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  user_score INTEGER;
  user_season INTEGER;
BEGIN
  SELECT l.total_score, l.season_id
  INTO   user_score, user_season
  FROM   public.leaderboard l
  WHERE  l.player_id = p_user_id
  ORDER BY l.season_id DESC
  LIMIT 1;

  IF user_score IS NULL THEN
    RETURN QUERY
    SELECT
      NULL::BIGINT,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::INTEGER,
      (SELECT COUNT(*) FROM public.leaderboard
       WHERE season_id = (SELECT MAX(season_id) FROM public.leaderboard))::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      l.player_id,
      l.total_score AS t_score,
      l.games_played AS g_played,
      l.ranked_mmr AS r_mmr,
      ROW_NUMBER() OVER (ORDER BY l.total_score DESC) AS pos
    FROM public.leaderboard l
    WHERE l.season_id = user_season
  )
  SELECT
    r.pos,
    r.t_score,
    r.g_played,
    r.r_mmr,
    (SELECT COUNT(*) FROM public.leaderboard WHERE season_id = user_season)::BIGINT
  FROM ranked r
  WHERE r.player_id = p_user_id;
END;
$function$;
