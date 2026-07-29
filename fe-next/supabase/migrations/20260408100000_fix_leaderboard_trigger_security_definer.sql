-- =============================================
-- SECURITY FIX: Add SECURITY DEFINER to leaderboard sync trigger functions
-- Migration: 20260408100000_fix_leaderboard_trigger_security_definer
--
-- Root cause: These trigger functions insert/update the leaderboard table on
-- behalf of the authenticated user. Without SECURITY DEFINER, they run as the
-- calling user who is blocked by RLS on the leaderboard table, causing:
--   "new row violates row-level security policy for table leaderboard"
-- =============================================

-- Fix sync_profile_to_leaderboard (originally from 022_add_avatar_columns_to_leaderboard.sql)
CREATE OR REPLACE FUNCTION public.sync_profile_to_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
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

-- Fix sync_leaderboard_avatar (originally from 20260312000000_add_custom_avatar.sql)
CREATE OR REPLACE FUNCTION public.sync_leaderboard_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leaderboard
  SET avatar_image = NEW.avatar_image,
      profile_picture_url = NEW.profile_picture_url,
      avatar_config = NEW.avatar_config
  WHERE player_id = NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_profile_to_leaderboard IS
    'Syncs profile changes to leaderboard. SECURITY DEFINER required to bypass RLS on leaderboard table.';
COMMENT ON FUNCTION public.sync_leaderboard_avatar IS
    'Syncs avatar fields from profiles to leaderboard. SECURITY DEFINER required to bypass RLS on leaderboard table.';
