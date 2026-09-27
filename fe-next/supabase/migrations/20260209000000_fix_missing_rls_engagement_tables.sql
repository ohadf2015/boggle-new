-- =============================================
-- SECURITY FIX: Enable RLS on engagement tables
-- Migration: 20260209000000_fix_missing_rls_engagement_tables
-- Created: 2026-02-09
-- Priority: CRITICAL
--
-- These tables from migration 014 were never given RLS policies.
-- They contain personal engagement data (streaks, challenges, rewards)
-- that should only be visible to the owning player.
--
-- Also adds RLS to wikipedia_word_candidates (044) which is
-- server-managed reference data.
-- =============================================

-- =============================================
-- STEP 1: ENABLE RLS ON UNPROTECTED TABLES
-- =============================================

ALTER TABLE player_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_rewards_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wikipedia_word_candidates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: PLAYER_ENGAGEMENT POLICIES
-- Personal engagement metrics (streaks, sessions, calendar)
-- =============================================

-- Users can only view their own engagement data
DROP POLICY IF EXISTS "Users can view own engagement" ON player_engagement;
CREATE POLICY "Users can view own engagement"
    ON player_engagement FOR SELECT
    USING (auth.uid() = player_id);

-- Users can update their own engagement (streak claims, calendar)
DROP POLICY IF EXISTS "Users can update own engagement" ON player_engagement;
CREATE POLICY "Users can update own engagement"
    ON player_engagement FOR UPDATE
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- Only service role can insert (server creates on first login)
DROP POLICY IF EXISTS "Service role inserts engagement" ON player_engagement;
CREATE POLICY "Service role inserts engagement"
    ON player_engagement FOR INSERT
    WITH CHECK (false);

-- No deletion allowed
DROP POLICY IF EXISTS "Engagement cannot be deleted" ON player_engagement;
CREATE POLICY "Engagement cannot be deleted"
    ON player_engagement FOR DELETE
    USING (false);

-- =============================================
-- STEP 3: DAILY_CHALLENGES POLICIES
-- Per-player daily challenge progress
-- =============================================

-- Users can only view their own challenges
DROP POLICY IF EXISTS "Users can view own challenges" ON daily_challenges;
CREATE POLICY "Users can view own challenges"
    ON daily_challenges FOR SELECT
    USING (auth.uid() = player_id);

-- Only service role can insert challenges
DROP POLICY IF EXISTS "Service role inserts challenges" ON daily_challenges;
CREATE POLICY "Service role inserts challenges"
    ON daily_challenges FOR INSERT
    WITH CHECK (false);

-- Only service role can update challenges (progress tracking)
DROP POLICY IF EXISTS "Service role updates challenges" ON daily_challenges;
CREATE POLICY "Service role updates challenges"
    ON daily_challenges FOR UPDATE
    USING (false)
    WITH CHECK (false);

-- No deletion allowed
DROP POLICY IF EXISTS "Challenges cannot be deleted" ON daily_challenges;
CREATE POLICY "Challenges cannot be deleted"
    ON daily_challenges FOR DELETE
    USING (false);

-- =============================================
-- STEP 4: WEEKLY_QUESTS POLICIES
-- Per-player weekly quest progress
-- =============================================

-- Users can only view their own quests
DROP POLICY IF EXISTS "Users can view own quests" ON weekly_quests;
CREATE POLICY "Users can view own quests"
    ON weekly_quests FOR SELECT
    USING (auth.uid() = player_id);

-- Only service role can manage quests
DROP POLICY IF EXISTS "Service role inserts quests" ON weekly_quests;
CREATE POLICY "Service role inserts quests"
    ON weekly_quests FOR INSERT
    WITH CHECK (false);

DROP POLICY IF EXISTS "Service role updates quests" ON weekly_quests;
CREATE POLICY "Service role updates quests"
    ON weekly_quests FOR UPDATE
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "Quests cannot be deleted" ON weekly_quests;
CREATE POLICY "Quests cannot be deleted"
    ON weekly_quests FOR DELETE
    USING (false);

-- =============================================
-- STEP 5: MYSTERY_REWARDS_LOG POLICIES
-- Per-player reward history
-- =============================================

-- Users can only view their own rewards
DROP POLICY IF EXISTS "Users can view own mystery rewards" ON mystery_rewards_log;
CREATE POLICY "Users can view own mystery rewards"
    ON mystery_rewards_log FOR SELECT
    USING (auth.uid() = player_id);

-- Only service role can insert rewards
DROP POLICY IF EXISTS "Service role inserts mystery rewards" ON mystery_rewards_log;
CREATE POLICY "Service role inserts mystery rewards"
    ON mystery_rewards_log FOR INSERT
    WITH CHECK (false);

-- Rewards are immutable
DROP POLICY IF EXISTS "Mystery rewards are immutable" ON mystery_rewards_log;
CREATE POLICY "Mystery rewards are immutable"
    ON mystery_rewards_log FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Mystery rewards cannot be deleted" ON mystery_rewards_log;
CREATE POLICY "Mystery rewards cannot be deleted"
    ON mystery_rewards_log FOR DELETE
    USING (false);

-- =============================================
-- STEP 6: WIKIPEDIA_WORD_CANDIDATES POLICIES
-- Server-managed reference data
-- =============================================

-- Only admins can view candidates (used by cron jobs)
DROP POLICY IF EXISTS "Admins can view word candidates" ON wikipedia_word_candidates;
CREATE POLICY "Admins can view word candidates"
    ON wikipedia_word_candidates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Only service role can manage candidates
DROP POLICY IF EXISTS "Service role manages word candidates" ON wikipedia_word_candidates;
CREATE POLICY "Service role manages word candidates"
    ON wikipedia_word_candidates FOR ALL
    USING (false)
    WITH CHECK (false);

-- =============================================
-- STEP 7: FIX OVERLY PERMISSIVE STREAK POLICIES
-- daily_puzzle_streaks has a redundant public SELECT
-- that exposes personal streak data to all users.
-- The user-scoped policy already exists for own data.
-- Leaderboard views use SECURITY DEFINER and bypass RLS.
-- =============================================

-- Remove the overly permissive "view all" policy
DROP POLICY IF EXISTS "Users can view all streaks for leaderboard" ON daily_puzzle_streaks;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON POLICY "Users can view own engagement" ON player_engagement IS
    'Users can only view their own engagement metrics (streaks, sessions, calendar)';
COMMENT ON POLICY "Users can view own challenges" ON daily_challenges IS
    'Users can only see their own daily challenge progress';
COMMENT ON POLICY "Users can view own quests" ON weekly_quests IS
    'Users can only see their own weekly quest progress';
COMMENT ON POLICY "Users can view own mystery rewards" ON mystery_rewards_log IS
    'Users can only see their own mystery reward history';
