-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- Migration: 002_row_level_security
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_progress ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view all profiles (public leaderboard)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can only insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users cannot delete profiles (handled by cascade from auth.users)
DROP POLICY IF EXISTS "Users cannot delete profiles directly" ON profiles;
CREATE POLICY "Users cannot delete profiles directly"
    ON profiles FOR DELETE
    USING (false);

-- =============================================
-- LEADERBOARD POLICIES
-- =============================================

-- Leaderboard is public read-only
DROP POLICY IF EXISTS "Leaderboard is viewable by everyone" ON leaderboard;
CREATE POLICY "Leaderboard is viewable by everyone"
    ON leaderboard FOR SELECT
    USING (true);

-- Only server can modify leaderboard (via service role)
-- Client cannot directly insert/update/delete
DROP POLICY IF EXISTS "Leaderboard is server-managed" ON leaderboard;
CREATE POLICY "Leaderboard is server-managed"
    ON leaderboard FOR ALL
    USING (false)
    WITH CHECK (false);

-- =============================================
-- GAME RESULTS POLICIES
-- =============================================

-- Users can view their own game results
DROP POLICY IF EXISTS "Users can view own game results" ON game_results;
CREATE POLICY "Users can view own game results"
    ON game_results FOR SELECT
    USING (auth.uid() = player_id);

-- Game results are inserted by server only
-- Using anon key with proper validation in backend
DROP POLICY IF EXISTS "Server can insert game results" ON game_results;
CREATE POLICY "Server can insert game results"
    ON game_results FOR INSERT
    WITH CHECK (true); -- Server handles validation

-- Users cannot modify game results
DROP POLICY IF EXISTS "Game results are immutable" ON game_results;
CREATE POLICY "Game results are immutable"
    ON game_results FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Game results cannot be deleted" ON game_results;
CREATE POLICY "Game results cannot be deleted"
    ON game_results FOR DELETE
    USING (false);

-- =============================================
-- GUEST TOKENS POLICIES
-- =============================================

-- Anyone can view unclaimed tokens by hash (needed for guest flow)
DROP POLICY IF EXISTS "Unclaimed tokens viewable by hash" ON guest_tokens;
CREATE POLICY "Unclaimed tokens viewable by hash"
    ON guest_tokens FOR SELECT
    USING (claimed_by IS NULL);

-- Anyone can create guest tokens
DROP POLICY IF EXISTS "Anyone can create guest tokens" ON guest_tokens;
CREATE POLICY "Anyone can create guest tokens"
    ON guest_tokens FOR INSERT
    WITH CHECK (claimed_by IS NULL);

-- Anyone can update unclaimed tokens (for stats updates)
DROP POLICY IF EXISTS "Unclaimed tokens can be updated" ON guest_tokens;
CREATE POLICY "Unclaimed tokens can be updated"
    ON guest_tokens FOR UPDATE
    USING (claimed_by IS NULL);

-- Only auth users can claim tokens (set claimed_by)
DROP POLICY IF EXISTS "Auth users can claim tokens" ON guest_tokens;
CREATE POLICY "Auth users can claim tokens"
    ON guest_tokens FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (claimed_by = auth.uid() OR claimed_by IS NULL);

-- =============================================
-- RANKED PROGRESS POLICIES
-- =============================================

-- Users can view their own ranked progress
DROP POLICY IF EXISTS "Users can view own ranked progress" ON ranked_progress;
CREATE POLICY "Users can view own ranked progress"
    ON ranked_progress FOR SELECT
    USING (auth.uid() = player_id);

-- Server manages ranked progress
DROP POLICY IF EXISTS "Server manages ranked progress" ON ranked_progress;
CREATE POLICY "Server manages ranked progress"
    ON ranked_progress FOR ALL
    USING (true)
    WITH CHECK (true); -- Server handles validation

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to check if user owns a profile
CREATE OR REPLACE FUNCTION is_profile_owner(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_emoji TEXT,
    avatar_color TEXT,
    total_games INTEGER,
    total_score INTEGER,
    ranked_mmr INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.username,
        p.display_name,
        p.avatar_emoji,
        p.avatar_color,
        p.total_games,
        p.total_score,
        p.ranked_mmr
    FROM profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADMIN BYPASS POLICY
-- For service role key (used by backend)
-- =============================================

-- Note: Service role key bypasses RLS by default in Supabase
-- These policies only apply to anon and authenticated roles

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON POLICY "Profiles are viewable by everyone" ON profiles IS 'Allow public profile viewing for leaderboards';
COMMENT ON POLICY "Users can update own profile" ON profiles IS 'Users can only modify their own profile data';
COMMENT ON POLICY "Leaderboard is viewable by everyone" ON leaderboard IS 'Public leaderboard access';
COMMENT ON POLICY "Users can view own game results" ON game_results IS 'Users can view their game history';
