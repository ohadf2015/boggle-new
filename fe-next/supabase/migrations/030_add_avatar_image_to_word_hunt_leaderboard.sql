-- =====================================================
-- Migration 030: Add avatar_image to Word Hunt Leaderboard Views
-- =====================================================
-- Fixes the Word Hunt leaderboard views to include avatar_image
-- from the profiles table, ensuring custom avatars display correctly.
-- =====================================================

-- Drop and recreate the daily Word Hunt leaderboard view with avatar_image
DROP VIEW IF EXISTS daily_word_hunt_leaderboard;

CREATE OR REPLACE VIEW daily_word_hunt_leaderboard AS
SELECT
    dwa.puzzle_date,
    dwa.puzzle_number,
    dwa.language,
    dwa.player_id,
    dwa.guest_fingerprint,
    COALESCE(p.display_name, dwa.display_name, 'Guest Player') as display_name,
    COALESCE(p.avatar_emoji, dwa.avatar_emoji, '🎯') as avatar_emoji,
    COALESCE(p.avatar_color, dwa.avatar_color, '#FFE135') as avatar_color,
    p.avatar_image,           -- Added: custom avatar image from profile
    p.profile_picture_url,    -- Profile picture (OAuth or custom)
    COALESCE(p.country_code, dwa.country_code) as country_code,
    dwa.solved,
    dwa.attempts_used,
    dwa.efficiency_score,
    dwa.life_remaining,
    dwa.words_discovered,
    dwa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dwa.puzzle_date, dwa.language
        ORDER BY
            dwa.solved DESC,                    -- Solved first
            dwa.efficiency_score DESC NULLS LAST,  -- Then by efficiency
            dwa.attempts_used ASC,              -- Fewer attempts better
            dwa.completed_at ASC                -- Earlier completion wins ties
    ) as rank_position
FROM daily_word_hunt_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
ORDER BY dwa.puzzle_date DESC, rank_position ASC;

COMMENT ON VIEW daily_word_hunt_leaderboard IS 'Daily Word Hunt leaderboard with player rankings by efficiency score, including avatar_image for custom avatars';

-- Drop and recreate the all-time Word Hunt leaderboard view with avatar_image
DROP VIEW IF EXISTS word_hunt_alltime_leaderboard;

CREATE OR REPLACE VIEW word_hunt_alltime_leaderboard AS
SELECT
    COALESCE(dwa.player_id::text, dwa.guest_fingerprint) as player_identifier,
    dwa.player_id,
    dwa.guest_fingerprint,
    dwa.language,
    COALESCE(p.display_name, MAX(dwa.display_name), 'Guest Player') as display_name,
    COALESCE(p.avatar_emoji, MAX(dwa.avatar_emoji), '🎯') as avatar_emoji,
    COALESCE(p.avatar_color, MAX(dwa.avatar_color), '#FFE135') as avatar_color,
    p.avatar_image,           -- Added: custom avatar image from profile
    p.profile_picture_url,
    COALESCE(p.country_code, MAX(dwa.country_code)) as country_code,
    SUM(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END)::integer as total_efficiency_score,
    COUNT(*)::integer as total_games,
    COUNT(*) FILTER (WHERE dwa.solved)::integer as games_won,
    ROUND(AVG(dwa.attempts_used) FILTER (WHERE dwa.solved), 1) as avg_attempts,
    MAX(dwa.efficiency_score) FILTER (WHERE dwa.solved) as best_efficiency,
    MAX(dwa.completed_at) as last_played_at,
    ROW_NUMBER() OVER (
        PARTITION BY dwa.language
        ORDER BY
            SUM(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END) DESC,
            COUNT(*) FILTER (WHERE dwa.solved) DESC,
            MAX(dwa.completed_at) DESC
    ) as rank_position
FROM daily_word_hunt_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
WHERE dwa.player_id IS NOT NULL  -- Only show authenticated users on all-time leaderboard
GROUP BY dwa.player_id, dwa.guest_fingerprint, dwa.language, p.display_name, p.avatar_emoji, p.avatar_color, p.avatar_image, p.profile_picture_url, p.country_code
ORDER BY rank_position ASC;

COMMENT ON VIEW word_hunt_alltime_leaderboard IS 'All-time Word Hunt leaderboard ranked by total efficiency score, including avatar_image for custom avatars';
