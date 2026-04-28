-- Avatar bug + season rotate.
-- 1. sync_profile_to_leaderboard never copied avatar_config → leaderboard.avatar_config NULL → widget fell back to seeded faces.
-- 2. Top-Players widget reads leaderboard table directly with no season filter; combined with cumulative Season 1 (Jan→Apr), users perceived "stale" totals. Closing S1 + starting S2 now gives a fresh window.

-- (1) Trigger: include avatar_config in INSERT + ON CONFLICT UPDATE.
CREATE OR REPLACE FUNCTION public.sync_profile_to_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_season_id INTEGER;
BEGIN
  v_season_id := public.get_current_season_id();
  IF v_season_id IS NULL THEN
    v_season_id := 1;
  END IF;

  INSERT INTO leaderboard (
    player_id, username, display_name, avatar_emoji, avatar_color,
    avatar_image, avatar_config, profile_picture_url,
    total_score, games_played, games_won, ranked_mmr,
    season_id, last_updated
  ) VALUES (
    NEW.id, NEW.username, NEW.display_name, NEW.avatar_emoji, NEW.avatar_color,
    NEW.avatar_image, NEW.avatar_config, NEW.profile_picture_url,
    COALESCE(NEW.total_score, 0),
    COALESCE(NEW.total_games, 0),
    COALESCE(NEW.ranked_wins, 0),
    COALESCE(NEW.ranked_mmr, 1000),
    v_season_id, NOW()
  )
  ON CONFLICT (player_id, season_id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_emoji = EXCLUDED.avatar_emoji,
    avatar_color = EXCLUDED.avatar_color,
    avatar_image = EXCLUDED.avatar_image,
    avatar_config = EXCLUDED.avatar_config,
    profile_picture_url = EXCLUDED.profile_picture_url,
    total_score = EXCLUDED.total_score,
    games_played = EXCLUDED.games_played,
    games_won = EXCLUDED.games_won,
    ranked_mmr = EXCLUDED.ranked_mmr,
    last_updated = NOW();

  RETURN NEW;
END;
$$;

-- (2) Backfill avatar_config + missing avatar_image into existing leaderboard rows from profiles.
UPDATE leaderboard l
SET avatar_config = p.avatar_config,
    avatar_image  = COALESCE(l.avatar_image, p.avatar_image),
    last_updated  = NOW()
FROM profiles p
WHERE p.id = l.player_id
  AND (l.avatar_config IS DISTINCT FROM p.avatar_config
       OR (l.avatar_image IS NULL AND p.avatar_image IS NOT NULL));

-- (3) RPC return: add avatar_image + avatar_config so /leaderboard renders the picked avatar too.
DROP FUNCTION IF EXISTS public.get_leaderboard(integer, integer, text, integer);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'total_score',
  p_season_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
  player_id UUID, username TEXT, avatar_emoji TEXT, avatar_color TEXT,
  avatar_image TEXT, avatar_config JSONB,
  total_score INTEGER, games_played INTEGER, games_won INTEGER,
  ranked_mmr INTEGER, rank_position BIGINT, season_id INTEGER
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_season_id INTEGER;
BEGIN
  v_season_id := COALESCE(p_season_id, public.get_current_season_id(), 1);

  IF p_order_by = 'ranked_mmr' THEN
    RETURN QUERY
    SELECT l.player_id, l.username, l.avatar_emoji, l.avatar_color,
           l.avatar_image, l.avatar_config,
           l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.ranked_mmr DESC, l.games_won DESC) AS rank_position,
           l.season_id
    FROM leaderboard l
    WHERE (v_season_id = 0) OR (l.season_id = v_season_id)
    ORDER BY l.ranked_mmr DESC, l.games_won DESC
    LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT l.player_id, l.username, l.avatar_emoji, l.avatar_color,
           l.avatar_image, l.avatar_config,
           l.total_score, l.games_played, l.games_won, l.ranked_mmr,
           ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.games_played DESC) AS rank_position,
           l.season_id
    FROM leaderboard l
    WHERE (v_season_id = 0) OR (l.season_id = v_season_id)
    ORDER BY l.total_score DESC, l.games_played DESC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;

-- (4) Rotate seasons: close S1 at now(), start S2 at now(). Status uses 'closed' per seasons_status_check constraint.
UPDATE seasons SET end_date = now(), status = 'closed' WHERE id = 1;
UPDATE seasons SET start_date = now() WHERE id = 2;
