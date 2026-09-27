-- =============================================
-- ADD UNIQUE DAYS PLAYED TRACKING
-- Migration: 038_add_unique_days_played
--
-- Adds tracking for lifetime achievements:
-- - DEDICATION (7 unique days)
-- - LOYAL_PLAYER (30 unique days)
-- =============================================

-- Add unique_days_played column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unique_days_played INTEGER DEFAULT 0;

-- Add index for achievement queries
CREATE INDEX IF NOT EXISTS idx_profiles_unique_days_played ON profiles(unique_days_played DESC);

-- Add comment explaining the column
COMMENT ON COLUMN profiles.unique_days_played IS 'Number of unique calendar days the user has played games. Used for DEDICATION and LOYAL_PLAYER lifetime achievements.';
