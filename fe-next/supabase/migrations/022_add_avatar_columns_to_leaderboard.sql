-- =============================================
-- MIGRATION: Add avatar_image and profile_picture_url to leaderboard table
-- This enables the leaderboard to display real player avatars instead of emoji fallbacks
-- =============================================

-- Add avatar_image column to leaderboard table (character avatar ID like 'broccoli-bob')
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS avatar_image TEXT;

-- Add profile_picture_url column to leaderboard table (OAuth or custom profile picture)
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Update existing leaderboard entries with avatar_image and profile_picture_url from profiles
UPDATE leaderboard l
SET
    avatar_image = p.avatar_image,
    profile_picture_url = p.profile_picture_url
FROM profiles p
WHERE l.player_id = p.id;

-- Drop and recreate the sync trigger to include avatar_image and profile_picture_url
DROP FUNCTION IF EXISTS sync_profile_to_leaderboard() CASCADE;

CREATE FUNCTION sync_profile_to_leaderboard()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Recreate trigger to include avatar_image and profile_picture_url in the trigger columns
DROP TRIGGER IF EXISTS profile_to_leaderboard_sync ON profiles;
CREATE TRIGGER profile_to_leaderboard_sync
    AFTER INSERT OR UPDATE OF username, display_name, avatar_emoji, avatar_color, avatar_image, profile_picture_url, total_score, total_games, ranked_wins, ranked_mmr
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_leaderboard();
