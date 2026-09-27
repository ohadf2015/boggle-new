-- Fix duplicate "fish" players bug: leaderboard returned rows across all seasons
-- because (a) sync_profile_to_leaderboard picked season_id via MAX(id) WHERE
-- status='active' (all 5 seeded seasons share status='active') and (b)
-- get_leaderboard had no season filter. Now both are date-window driven via
-- a shared helper. Drop the legacy 3-arg overload so the new signature is
-- unambiguous.

-- Helper: current season picked by date window. Authoritative source of
-- "currently active" — status column is unreliable while future seasons are
-- pre-seeded with status='active'.
CREATE OR REPLACE FUNCTION public.get_current_season_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT id
  FROM seasons
  WHERE now() >= start_date AND now() < end_date
  ORDER BY start_date DESC
  LIMIT 1;
$$;

-- Trigger: pick season_id by date, fall back to season 1.
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
    avatar_image, profile_picture_url,
    total_score, games_played, games_won, ranked_mmr,
    season_id, last_updated
  ) VALUES (
    NEW.id, NEW.username, NEW.display_name, NEW.avatar_emoji, NEW.avatar_color,
    NEW.avatar_image, NEW.profile_picture_url,
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
    profile_picture_url = EXCLUDED.profile_picture_url,
    total_score = EXCLUDED.total_score,
    games_played = EXCLUDED.games_played,
    games_won = EXCLUDED.games_won,
    ranked_mmr = EXCLUDED.ranked_mmr,
    last_updated = NOW();

  RETURN NEW;
END;
$$;

-- Drop legacy 3-arg overload to avoid ambiguity with the new 4-arg signature.
DROP FUNCTION IF EXISTS public.get_leaderboard(integer, integer, text);

-- RPC: filter by season. p_season_id NULL = current; 0 = all-time across seasons.
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'total_score',
  p_season_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
  player_id UUID, username TEXT, avatar_emoji TEXT, avatar_color TEXT,
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
