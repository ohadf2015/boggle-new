-- Global leaderboard: only real players with a chosen name, and their title.
-- The client board reads this RPC directly, so filtering here keeps it in step with
-- /api/leaderboard (which also runs lib/names/publicName for default and profane names).
-- Placeholder rule mirrors lib/displayName.isPlaceholderName.

CREATE OR REPLACE FUNCTION public.is_placeholder_name(p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_name IS NULL OR btrim(p_name) = '' OR btrim(p_name) ~* '^(player[_-]|guest($|[_-]))';
$$;

DROP FUNCTION IF EXISTS public.get_leaderboard(integer, integer, text, integer);

CREATE FUNCTION public.get_leaderboard(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_order_by text DEFAULT 'total_score'::text,
  p_season_id integer DEFAULT NULL::integer
)
RETURNS TABLE(
  player_id uuid, username text, display_name text, avatar_emoji text, avatar_color text,
  avatar_image text, avatar_config jsonb, total_score integer, games_played integer,
  games_won integer, ranked_mmr integer, rank_position bigint, season_id integer,
  chosen_title text, player_level integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_season_id INTEGER;
BEGIN
  v_season_id := COALESCE(p_season_id, public.get_current_season_id(), 1);
  IF v_season_id = 0 THEN
    RETURN QUERY
    SELECT pr.id, pr.username, NULLIF(pr.display_name, ''), pr.avatar_emoji, pr.avatar_color, pr.avatar_image, pr.avatar_config,
           COALESCE(pr.total_score,0), COALESCE(pr.total_games,0), COALESCE(pr.casual_wins,0)+COALESCE(pr.ranked_wins,0),
           COALESCE(pr.ranked_mmr,1000),
           ROW_NUMBER() OVER (ORDER BY COALESCE(pr.total_score,0) DESC, COALESCE(pr.total_games,0) DESC), 0,
           pr.chosen_title, COALESCE(pr.current_level, 1)
      FROM profiles pr
     WHERE COALESCE(pr.total_score,0) > 0
       AND NOT COALESCE(pr.is_test_account, false)
       AND NOT (public.is_placeholder_name(pr.display_name) AND public.is_placeholder_name(pr.username))
     ORDER BY COALESCE(pr.total_score,0) DESC, COALESCE(pr.total_games,0) DESC
     LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;
  IF p_order_by = 'ranked_mmr' THEN
    RETURN QUERY
    SELECT l.player_id, l.username, l.display_name, l.avatar_emoji, l.avatar_color, l.avatar_image, l.avatar_config,
           l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.ranked_mmr DESC, l.games_won DESC), l.season_id,
           pr.chosen_title, COALESCE(pr.current_level, 1)
      FROM leaderboard l
      LEFT JOIN profiles pr ON pr.id = l.player_id
     WHERE l.season_id = v_season_id AND COALESCE(l.total_score,0) > 0
       AND NOT COALESCE(pr.is_test_account, false)
       AND NOT (public.is_placeholder_name(l.display_name) AND public.is_placeholder_name(l.username))
     ORDER BY l.ranked_mmr DESC, l.games_won DESC LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT l.player_id, l.username, l.display_name, l.avatar_emoji, l.avatar_color, l.avatar_image, l.avatar_config,
           l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.games_played DESC), l.season_id,
           pr.chosen_title, COALESCE(pr.current_level, 1)
      FROM leaderboard l
      LEFT JOIN profiles pr ON pr.id = l.player_id
     WHERE l.season_id = v_season_id AND COALESCE(l.total_score,0) > 0
       AND NOT COALESCE(pr.is_test_account, false)
       AND NOT (public.is_placeholder_name(l.display_name) AND public.is_placeholder_name(l.username))
     ORDER BY l.total_score DESC, l.games_played DESC LIMIT p_limit OFFSET p_offset;
  END IF;
END $function$;

REVOKE ALL ON FUNCTION public.get_leaderboard(integer, integer, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer, integer, text, integer) TO anon, authenticated, service_role;
