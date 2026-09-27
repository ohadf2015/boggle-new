-- =============================================
-- FIX RLS POLICIES AND ADD XP COLUMNS
-- Migration: 005_fix_rls_and_add_xp_columns
-- Fixes:
--   1. game_results INSERT RLS policy
--   2. leaderboard INSERT/UPDATE RLS policies (for triggers)
--   3. Add missing total_xp and current_level columns to profiles
-- =============================================

-- =============================================
-- ADD MISSING XP COLUMNS TO PROFILES
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Create index for XP-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_level ON profiles(current_level DESC);

-- =============================================
-- FIX LEADERBOARD RLS POLICIES
-- The trigger needs to insert/update leaderboard from profile changes
-- =============================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Leaderboard is server-managed" ON leaderboard;

-- Allow inserts when triggered by profile sync (via SECURITY DEFINER function)
DROP POLICY IF EXISTS "Allow trigger-based leaderboard inserts" ON leaderboard;
CREATE POLICY "Allow trigger-based leaderboard inserts"
    ON leaderboard FOR INSERT
    WITH CHECK (true);

-- Allow updates when triggered by profile sync
DROP POLICY IF EXISTS "Allow trigger-based leaderboard updates" ON leaderboard;
CREATE POLICY "Allow trigger-based leaderboard updates"
    ON leaderboard FOR UPDATE
    USING (true);

-- Prevent direct deletes (only via CASCADE from profiles)
DROP POLICY IF EXISTS "Leaderboard entries cannot be deleted directly" ON leaderboard;
CREATE POLICY "Leaderboard entries cannot be deleted directly"
    ON leaderboard FOR DELETE
    USING (false);

-- =============================================
-- FIX GAME_RESULTS RLS POLICIES
-- Server needs to insert game results
-- =============================================

-- The existing "Server can insert game results" policy should work,
-- but let's ensure it's properly configured
DROP POLICY IF EXISTS "Server can insert game results" ON game_results;
CREATE POLICY "Server can insert game results"
    ON game_results FOR INSERT
    WITH CHECK (true);

-- =============================================
-- ADD XP COLUMNS TO LEADERBOARD FOR SYNC
-- =============================================
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- =============================================
-- UPDATE PROFILE-TO-LEADERBOARD SYNC FUNCTION
-- Include new XP columns
-- =============================================
CREATE OR REPLACE FUNCTION sync_profile_to_leaderboard()
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
        total_xp,
        current_level,
        last_updated
    ) VALUES (
        NEW.id,
        NEW.username,
        NEW.avatar_emoji,
        NEW.avatar_color,
        COALESCE(NEW.total_score, 0),
        COALESCE(NEW.total_games, 0),
        COALESCE(NEW.ranked_wins, 0),
        COALESCE(NEW.ranked_mmr, 1000),
        COALESCE(NEW.total_xp, 0),
        COALESCE(NEW.current_level, 1),
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
        total_xp = EXCLUDED.total_xp,
        current_level = EXCLUDED.current_level,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to include new columns
DROP TRIGGER IF EXISTS profile_to_leaderboard_sync ON profiles;
CREATE TRIGGER profile_to_leaderboard_sync
    AFTER INSERT OR UPDATE OF username, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, ranked_mmr, total_xp, current_level
    ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_to_leaderboard();

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON COLUMN profiles.total_xp IS 'Total experience points earned by the player';
COMMENT ON COLUMN profiles.current_level IS 'Current player level based on XP';
COMMENT ON COLUMN leaderboard.total_xp IS 'Total XP synced from profiles';
COMMENT ON COLUMN leaderboard.current_level IS 'Current level synced from profiles';
