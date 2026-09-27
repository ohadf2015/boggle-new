-- get_user_current_season_rank: a player's LIVE position in the CURRENT season leaderboard.
-- Returns 0 rows when the player has no current-season entry (UI -> "Unranked").
-- Uses idx_lb_season_score (season_id, total_score DESC). tier_id mirrors get_user_tier_position thresholds.
CREATE OR REPLACE FUNCTION public.get_user_current_season_rank(p_player_id uuid)
RETURNS TABLE(
  rank_position int,
  total_score int,
  games_played int,
  season_id int,
  total_players int,
  tier_id text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH cur AS (SELECT public.get_current_season_id() AS sid),
  ranked AS (
    SELECT l.player_id,
           l.total_score,
           l.games_played,
           RANK() OVER (ORDER BY l.total_score DESC) AS rk,
           COUNT(*) OVER () AS cnt
    FROM public.leaderboard l, cur
    WHERE l.season_id = cur.sid
  )
  SELECT r.rk::int,
         r.total_score,
         r.games_played,
         (SELECT sid FROM cur),
         r.cnt::int,
         CASE
           WHEN r.total_score >= 200000 THEN 'grandmaster'
           WHEN r.total_score >=  80000 THEN 'diamond'
           WHEN r.total_score >=  30000 THEN 'platinum'
           WHEN r.total_score >=  10000 THEN 'gold'
           WHEN r.total_score >=   2500 THEN 'silver'
           WHEN r.total_score >=    500 THEN 'bronze'
           ELSE 'stone'
         END AS tier_id
  FROM ranked r
  WHERE r.player_id = p_player_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_current_season_rank(uuid) TO anon, authenticated, service_role;
