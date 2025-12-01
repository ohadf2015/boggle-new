-- =============================================
-- MIGRATION: Add display_name to leaderboard table
-- This fixes the issue where leaderboard shows username instead of display_name
-- =============================================

-- Add display_name column to leaderboard table
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing leaderboard entries with display_name from profiles
UPDATE leaderboard l
SET display_name = p.display_name
FROM profiles p
WHERE l.player_id = p.id;

-- Drop and recreate the sync trigger to include display_name
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
        total_score = EXCLUDED.total_score,
        games_played = EXCLUDED.games_played,
        games_won = EXCLUDED.games_won,
        ranked_mmr = EXCLUDED.ranked_mmr,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to include display_name in the trigger columns
DROP TRIGGER IF EXISTS profile_to_leaderboard_sync ON profiles;
CREATE TRIGGER profile_to_leaderboard_sync
    AFTER INSERT OR UPDATE OF username, display_name, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, ranked_mmr
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_leaderboard();

-- Add index on display_name for search
CREATE INDEX IF NOT EXISTS idx_leaderboard_display_name ON leaderboard(display_name);
