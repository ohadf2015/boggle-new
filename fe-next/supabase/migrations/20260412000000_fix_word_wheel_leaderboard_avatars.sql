-- =============================================
-- Fix Word Wheel leaderboard view to include avatar_image and custom_avatar
-- These fields were added to other leaderboard views but missed when
-- the word wheel view was created.
-- Also removes ORDER BY from view (PostgREST best practice).
-- =============================================

DROP VIEW IF EXISTS daily_word_wheel_leaderboard;

CREATE VIEW daily_word_wheel_leaderboard
WITH (security_barrier = true) AS
SELECT
    dwa.puzzle_date,
    dwa.puzzle_number,
    dwa.language,
    dwa.player_id,
    dwa.guest_fingerprint,
    COALESCE(p.display_name, dwa.display_name, 'Guest Player') AS display_name,
    COALESCE(p.avatar_emoji, dwa.avatar_emoji, '🎯') AS avatar_emoji,
    COALESCE(p.avatar_color, dwa.avatar_color, '#6366f1') AS avatar_color,
    p.avatar_image,
    p.profile_picture_url,
    p.avatar_config AS custom_avatar,
    COALESCE(p.country_code, dwa.country_code) AS country_code,
    dwa.score,
    dwa.word_count,
    dwa.longest_word,
    dwa.time_seconds,
    dwa.center_letter,
    dwa.completed_at,
    ROW_NUMBER() OVER (
        PARTITION BY dwa.puzzle_date, dwa.language
        ORDER BY
            dwa.score DESC,
            dwa.word_count DESC,
            dwa.completed_at ASC
    ) AS rank_position
FROM daily_word_wheel_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id;

GRANT SELECT ON daily_word_wheel_leaderboard TO anon, authenticated;

COMMENT ON VIEW daily_word_wheel_leaderboard IS 'Daily Word Wheel leaderboard with avatar support. No ORDER BY - queries apply their own.';
