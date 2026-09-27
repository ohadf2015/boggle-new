-- =============================================
-- MIGRATION: Add avatar_image and profile_picture_url to daily_puzzle_attempts
-- This enables the daily leaderboard to display real player avatars and sync with profile changes
-- =============================================

-- Add avatar_image column (character avatar ID like 'broccoli-bob')
ALTER TABLE daily_puzzle_attempts ADD COLUMN IF NOT EXISTS avatar_image TEXT;

-- Add profile_picture_url column (OAuth or custom profile picture)
ALTER TABLE daily_puzzle_attempts ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add country_code column (for country flags in leaderboard)
ALTER TABLE daily_puzzle_attempts ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Update existing daily_puzzle_attempts entries with avatar data from profiles
UPDATE daily_puzzle_attempts dpa
SET
    avatar_image = p.avatar_image,
    profile_picture_url = p.profile_picture_url
FROM profiles p
WHERE dpa.player_id = p.id
AND dpa.avatar_image IS NULL;

-- Drop and recreate the daily_puzzle_leaderboard view to include new avatar fields
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

CREATE OR REPLACE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    dpa.guest_fingerprint,
    -- Use data stored in daily_puzzle_attempts first, fall back to current profile data
    -- This ensures leaderboard shows the avatar/name from when the player completed the puzzle
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
    -- New fields: avatar_image and profile_picture_url
    COALESCE(
        dpa.avatar_image,
        p.avatar_image
    ) as avatar_image,
    COALESCE(
        dpa.profile_picture_url,
        p.profile_picture_url
    ) as profile_picture_url,
    -- Country code for flag display
    dpa.country_code,
    dpa.score,
    dpa.word_count,
    dpa.time_seconds,
    dpa.longest_word,
    dpa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dpa.puzzle_date, dpa.language
        ORDER BY dpa.score DESC, dpa.word_count DESC, dpa.time_seconds ASC NULLS LAST
    ) as rank_position
FROM daily_puzzle_attempts dpa
LEFT JOIN profiles p ON dpa.player_id = p.id;
-- NOTE: No ORDER BY clause here - ordering is done in queries

COMMENT ON VIEW daily_puzzle_leaderboard IS 'Daily puzzle leaderboard with player rankings (includes both registered users and guests with full avatar support). Queries should apply their own ORDER BY.';
