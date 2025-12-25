-- =============================================
-- Add casual_wins column to profiles table
-- Migration: 018_add_casual_wins
-- =============================================

-- Add casual_wins column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS casual_wins INTEGER DEFAULT 0;

-- Add index for casual_wins (for potential leaderboards)
CREATE INDEX IF NOT EXISTS idx_profiles_casual_wins ON profiles(casual_wins DESC);

-- Update sync function to include casual_wins
-- Drop existing function if return type changed
DROP FUNCTION IF EXISTS sync_profile_to_leaderboard() CASCADE;

CREATE FUNCTION sync_profile_to_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leaderboard (
        player_id,
        username,
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
        NEW.avatar_emoji,
        NEW.avatar_color,
        COALESCE(NEW.total_score, 0),
        COALESCE(NEW.total_games, 0),
        -- Use sum of casual_wins + ranked_wins for total games_won
        COALESCE(NEW.casual_wins, 0) + COALESCE(NEW.ranked_wins, 0),
        COALESCE(NEW.ranked_mmr, 1000),
        NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
        username = EXCLUDED.username,
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

-- Re-create trigger with updated column list
DROP TRIGGER IF EXISTS profile_to_leaderboard_sync ON profiles;
CREATE TRIGGER profile_to_leaderboard_sync
    AFTER INSERT OR UPDATE OF username, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, casual_wins, ranked_mmr
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_leaderboard();

-- Add comment for documentation
COMMENT ON COLUMN profiles.casual_wins IS 'Number of casual game wins (placement=1 with >1 player)';
