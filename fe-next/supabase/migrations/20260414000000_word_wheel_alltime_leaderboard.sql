-- =============================================
-- Word Wheel all-time leaderboard view
-- Mirrors word_hunt_alltime_leaderboard shape so the client can merge both.
-- =============================================

DROP VIEW IF EXISTS word_wheel_alltime_leaderboard;

CREATE VIEW word_wheel_alltime_leaderboard
WITH (security_barrier = true) AS
SELECT
    COALESCE(dwa.player_id::text, dwa.guest_fingerprint) AS player_identifier,
    dwa.player_id,
    dwa.guest_fingerprint,
    dwa.language,
    COALESCE(p.display_name, MAX(dwa.display_name), 'Guest Player') AS display_name,
    COALESCE(p.avatar_emoji, MAX(dwa.avatar_emoji), '🎯') AS avatar_emoji,
    COALESCE(p.avatar_color, MAX(dwa.avatar_color), '#6366f1') AS avatar_color,
    p.avatar_image,
    p.profile_picture_url,
    p.avatar_config AS custom_avatar,
    COALESCE(p.country_code, MAX(dwa.country_code)) AS country_code,
    SUM(COALESCE(dwa.score, 0))::integer AS total_efficiency_score,
    COUNT(*)::integer AS total_games,
    COUNT(*) FILTER (WHERE dwa.score > 0)::integer AS games_won,
    NULL::numeric AS avg_attempts,
    MAX(dwa.score)::integer AS best_efficiency,
    MAX(dwa.completed_at) AS last_played_at,
    ROW_NUMBER() OVER (
        PARTITION BY dwa.language
        ORDER BY
            SUM(COALESCE(dwa.score, 0)) DESC,
            COUNT(*) DESC,
            MAX(dwa.completed_at) DESC
    ) AS rank_position
FROM daily_word_wheel_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
WHERE dwa.player_id IS NOT NULL
GROUP BY dwa.player_id, dwa.guest_fingerprint, dwa.language,
         p.display_name, p.avatar_emoji, p.avatar_color,
         p.avatar_image, p.profile_picture_url, p.avatar_config, p.country_code;

GRANT SELECT ON word_wheel_alltime_leaderboard TO anon, authenticated;

COMMENT ON VIEW word_wheel_alltime_leaderboard IS
  'All-time Word Wheel leaderboard — mirrors word_hunt_alltime_leaderboard shape. Client merges both for a combined all-time daily leaderboard.';
