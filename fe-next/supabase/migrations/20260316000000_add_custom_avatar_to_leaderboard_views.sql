-- =============================================
-- Migration: Add custom_avatar (avatar_config) to all leaderboard views
-- The avatar builder feature added avatar_config to profiles but the
-- leaderboard views were never updated to include it.
-- =============================================

-- 1. Daily Word Hunt leaderboard
DROP VIEW IF EXISTS daily_word_hunt_leaderboard;

CREATE VIEW daily_word_hunt_leaderboard
WITH (security_barrier = true) AS
SELECT
    dwa.puzzle_date,
    dwa.puzzle_number,
    dwa.language,
    dwa.player_id,
    dwa.guest_fingerprint,
    COALESCE(p.display_name, dwa.display_name, 'Guest Player'::text) AS display_name,
    COALESCE(p.avatar_emoji, dwa.avatar_emoji, '🎯'::text) AS avatar_emoji,
    COALESCE(p.avatar_color, dwa.avatar_color, '#FFE135'::text) AS avatar_color,
    p.avatar_image,
    p.profile_picture_url,
    p.avatar_config AS custom_avatar,
    COALESCE(p.country_code, dwa.country_code) AS country_code,
    dwa.solved,
    dwa.attempts_used,
    dwa.efficiency_score,
    dwa.life_remaining,
    dwa.words_discovered,
    dwa.completed_at,
    row_number() OVER (PARTITION BY dwa.puzzle_date, dwa.language
                       ORDER BY dwa.solved DESC, dwa.efficiency_score DESC NULLS LAST,
                                dwa.attempts_used, dwa.completed_at) AS rank_position
FROM public.daily_word_hunt_attempts dwa
LEFT JOIN public.profiles p ON dwa.player_id = p.id;

GRANT SELECT ON daily_word_hunt_leaderboard TO anon, authenticated;

-- 2. All-time Word Hunt leaderboard
DROP VIEW IF EXISTS word_hunt_alltime_leaderboard;

CREATE VIEW word_hunt_alltime_leaderboard AS
SELECT
    COALESCE(dwa.player_id::text, dwa.guest_fingerprint) AS player_identifier,
    dwa.player_id,
    dwa.guest_fingerprint,
    dwa.language,
    COALESCE(p.display_name, MAX(dwa.display_name), 'Guest Player') AS display_name,
    COALESCE(p.avatar_emoji, MAX(dwa.avatar_emoji), '🎯') AS avatar_emoji,
    COALESCE(p.avatar_color, MAX(dwa.avatar_color), '#FFE135') AS avatar_color,
    p.avatar_image,
    p.profile_picture_url,
    p.avatar_config AS custom_avatar,
    COALESCE(p.country_code, MAX(dwa.country_code)) AS country_code,
    SUM(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END)::integer AS total_efficiency_score,
    COUNT(*)::integer AS total_games,
    COUNT(*) FILTER (WHERE dwa.solved)::integer AS games_won,
    ROUND(AVG(dwa.attempts_used) FILTER (WHERE dwa.solved), 1) AS avg_attempts,
    MAX(dwa.efficiency_score) FILTER (WHERE dwa.solved) AS best_efficiency,
    MAX(dwa.completed_at) AS last_played_at,
    ROW_NUMBER() OVER (
        PARTITION BY dwa.language
        ORDER BY
            SUM(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END) DESC,
            COUNT(*) FILTER (WHERE dwa.solved) DESC,
            MAX(dwa.completed_at) DESC
    ) AS rank_position
FROM daily_word_hunt_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
WHERE dwa.player_id IS NOT NULL
GROUP BY dwa.player_id, dwa.guest_fingerprint, dwa.language,
         p.display_name, p.avatar_emoji, p.avatar_color,
         p.avatar_image, p.profile_picture_url, p.avatar_config, p.country_code;

GRANT SELECT ON word_hunt_alltime_leaderboard TO anon, authenticated;

-- 3. Daily puzzle leaderboard (classic mode)
DROP VIEW IF EXISTS daily_puzzle_leaderboard;

CREATE VIEW daily_puzzle_leaderboard AS
SELECT
    dpa.puzzle_date,
    dpa.puzzle_number,
    dpa.language,
    dpa.player_id,
    dpa.guest_fingerprint,
    COALESCE(dpa.display_name, p.display_name, p.username, 'Guest Player') AS display_name,
    COALESCE(dpa.avatar_emoji, p.avatar_emoji, '🎯') AS avatar_emoji,
    COALESCE(dpa.avatar_color, p.avatar_color, '#FFE135') AS avatar_color,
    COALESCE(dpa.avatar_image, p.avatar_image) AS avatar_image,
    COALESCE(dpa.profile_picture_url, p.profile_picture_url) AS profile_picture_url,
    p.avatar_config AS custom_avatar,
    dpa.country_code,
    dpa.score,
    dpa.word_count,
    dpa.time_seconds,
    dpa.longest_word,
    dpa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dpa.puzzle_date, dpa.language
        ORDER BY dpa.score DESC, dpa.word_count DESC, dpa.time_seconds ASC NULLS LAST
    ) AS rank_position
FROM daily_puzzle_attempts dpa
LEFT JOIN profiles p ON dpa.player_id = p.id;

GRANT SELECT ON daily_puzzle_leaderboard TO anon, authenticated;

COMMENT ON VIEW daily_word_hunt_leaderboard IS 'Daily Word Hunt leaderboard with custom avatar support';
COMMENT ON VIEW word_hunt_alltime_leaderboard IS 'All-time Word Hunt leaderboard with custom avatar support';
COMMENT ON VIEW daily_puzzle_leaderboard IS 'Daily puzzle leaderboard with custom avatar support';
