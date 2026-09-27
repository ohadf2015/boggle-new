-- =============================================
-- DAILY PUZZLE LEADERBOARD WITH GUESTS
-- Migration: 016_daily_leaderboard_with_guests
-- Features: Include guest players in daily leaderboard
-- =============================================

-- Drop the old view and create a new one that includes guests
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

-- Create updated view that includes both registered users and guests
CREATE OR REPLACE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    dpa.guest_fingerprint,
    COALESCE(p.display_name, p.username, 'Guest Player') as display_name,
    COALESCE(p.avatar_emoji, '🎯') as avatar_emoji,
    COALESCE(p.avatar_color, '#FFE135') as avatar_color,
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

-- Add policy to allow reading leaderboard data for everyone
DROP POLICY IF EXISTS "Leaderboard data is public" ON daily_puzzle_attempts;
CREATE POLICY "Leaderboard data is public"
    ON daily_puzzle_attempts FOR SELECT
    USING (true);

COMMENT ON VIEW daily_puzzle_leaderboard IS 'Daily puzzle leaderboard with player rankings (includes both registered users and guests)';
