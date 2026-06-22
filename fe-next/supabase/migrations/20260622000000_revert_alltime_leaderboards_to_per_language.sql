-- =============================================
-- Daily-challenge all-time leaderboards: revert to PER-LANGUAGE ranking
-- =============================================
-- Migration 20260621000000 globalised the all-time Word Hunt / Word Wheel views
-- so every player was aggregated across ALL languages into one global ranking.
-- Because each language plays a DIFFERENT puzzle, merging scores across languages
-- produced inaccurate rankings and inflated counts. This migration restores the
-- original per-language behaviour:
--   * GROUP BY (player_id, guest_fingerprint, language)  → one row per player PER language
--   * PARTITION rank_position BY language                → ranks restart at #1 per language
--
-- Column shape and order are preserved so `select('*')` consumers are unaffected.
-- security_invoker / security_barrier hardening (see 20260418100000) is retained.
-- =============================================

-- 1. All-time Word Hunt leaderboard (per-language)
DROP VIEW IF EXISTS word_hunt_alltime_leaderboard;

CREATE VIEW word_hunt_alltime_leaderboard
WITH (security_invoker = on, security_barrier = on) AS
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

COMMENT ON VIEW word_hunt_alltime_leaderboard IS
  'All-time Word Hunt leaderboard — ranked per language (each language plays a different puzzle).';

-- 2. All-time Word Wheel leaderboard (per-language) — mirrors hunt shape
DROP VIEW IF EXISTS word_wheel_alltime_leaderboard;

CREATE VIEW word_wheel_alltime_leaderboard
WITH (security_invoker = on, security_barrier = on) AS
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
  'All-time Word Wheel leaderboard — ranked per language (each language plays a different puzzle). Mirrors word_hunt_alltime_leaderboard shape; client merges both.';
