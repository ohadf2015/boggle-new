-- =============================================
-- FIX DAILY PUZZLE LEADERBOARD - ADD GUEST PLAYER COLUMNS
-- Migration: 017_fix_daily_leaderboard_guest_columns
-- Fixes: Missing columns for guest player display information
-- =============================================

-- Add missing columns to daily_puzzle_attempts for guest player display info
-- These were being inserted by the backend but columns didn't exist
ALTER TABLE daily_puzzle_attempts
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_emoji TEXT,
ADD COLUMN IF NOT EXISTS avatar_color TEXT;

-- Create index for display name searches
CREATE INDEX IF NOT EXISTS idx_daily_attempts_display_name ON daily_puzzle_attempts(display_name);

-- Drop and recreate the view to properly use guest player data
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

-- Create updated view that includes both registered users and guests
-- For registered users: use profile data
-- For guests: use data stored directly in daily_puzzle_attempts
CREATE OR REPLACE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    dpa.guest_fingerprint,
    -- Use guest data if available, otherwise fall back to profile data
    COALESCE(
        dpa.display_name,
        p.display_name,
        p.username,
        'Guest Player'
    ) as display_name,
    COALESCE(
        dpa.avatar_emoji,
        p.avatar_emoji,
        '🎯'
    ) as avatar_emoji,
    COALESCE(
        dpa.avatar_color,
        p.avatar_color,
        '#FFE135'
    ) as avatar_color,
    dpa.score,
    dpa.word_count,
    dpa.time_seconds,
    dpa.longest_word,
    dpa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dpa.puzzle_date, dpa.language
        ORDER BY dpa.score DESC, dpa.word_count DESC, dpa.time_seconds ASC
    ) as rank_position
FROM daily_puzzle_attempts dpa
LEFT JOIN profiles p ON dpa.player_id = p.id
ORDER BY dpa.puzzle_date DESC, rank_position ASC;

COMMENT ON VIEW daily_puzzle_leaderboard IS 'Daily puzzle leaderboard with player rankings (includes both registered users and guests with proper display data)';
