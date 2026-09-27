-- =============================================
-- FIX DAILY PUZZLE LEADERBOARD - REMOVE VIEW ORDER BY
-- Migration: 019_fix_daily_leaderboard_view_ordering
-- Fixes: Empty leaderboard results due to ORDER BY in view definition
-- =============================================

-- Drop and recreate the view WITHOUT the ORDER BY clause
-- ORDER BY in views can interfere with filtered queries in PostgREST
-- The ordering should be handled by the queries themselves, not the view
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

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
        ORDER BY dpa.score DESC, dpa.word_count DESC, dpa.time_seconds ASC NULLS LAST
    ) as rank_position
FROM daily_puzzle_attempts dpa
LEFT JOIN profiles p ON dpa.player_id = p.id;
-- NOTE: No ORDER BY clause here - ordering is done in queries

COMMENT ON VIEW daily_puzzle_leaderboard IS 'Daily puzzle leaderboard with player rankings (includes both registered users and guests with proper display data). Queries should apply their own ORDER BY.';
