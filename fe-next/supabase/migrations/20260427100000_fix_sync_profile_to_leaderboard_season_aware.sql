-- Fix sync_profile_to_leaderboard trigger after seasons infrastructure
-- (20260426160000) changed the leaderboard unique key from (player_id) to
-- (player_id, season_id). The previous trigger body did
-- ON CONFLICT (player_id) which no longer matches any unique index, raising
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" on every profile UPDATE.
--
-- This rewrite:
--   1. Resolves the active season at trigger time (falls back to season 1)
--   2. Inserts season_id explicitly
--   3. Targets the new composite unique constraint
--   4. SECURITY DEFINER + locked search_path preserved
--
-- Already applied to live db via Supabase MCP on 2026-04-27.

CREATE OR REPLACE FUNCTION public.sync_profile_to_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_season_id INTEGER;
BEGIN
  SELECT id INTO v_season_id
  FROM seasons
  WHERE status = 'active'
  ORDER BY id DESC
  LIMIT 1;

  IF v_season_id IS NULL THEN
    v_season_id := 1;
  END IF;

  INSERT INTO leaderboard (
    player_id,
    username,
    display_name,
    avatar_emoji,
    avatar_color,
    avatar_image,
    profile_picture_url,
    total_score,
    games_played,
    games_won,
    ranked_mmr,
    season_id,
    last_updated
  ) VALUES (
    NEW.id,
    NEW.username,
    NEW.display_name,
    NEW.avatar_emoji,
    NEW.avatar_color,
    NEW.avatar_image,
    NEW.profile_picture_url,
    COALESCE(NEW.total_score, 0),
    COALESCE(NEW.total_games, 0),
    COALESCE(NEW.ranked_wins, 0),
    COALESCE(NEW.ranked_mmr, 1000),
    v_season_id,
    NOW()
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
$function$;
