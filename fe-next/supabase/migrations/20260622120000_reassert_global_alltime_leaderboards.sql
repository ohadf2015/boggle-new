-- =============================================
-- Daily-challenge all-time leaderboards: re-assert GLOBAL (all-language) views
-- =============================================
-- The all-time Word Hunt / Word Wheel leaderboards are meant to rank every
-- player from around the world in a single global ranking (one row per player,
-- aggregated across ALL languages). Migration 20260621000000 introduced this,
-- but the all-time leaderboards were still showing per-language data — the most
-- likely cause is that the earlier view migration never successfully applied in
-- production (so the old per-language views are still live).
--
-- This migration re-asserts the global view definitions. It is fully idempotent
-- (DROP + CREATE), so it is a safe no-op if 20260621000000 already applied, and
-- guarantees the global views exist after the next deploy otherwise.
--
-- Column shape and order match the existing views so `select('*')` consumers are
-- unaffected; `language` reports the player's most recent language (MAX) for
-- display only. security_invoker / security_barrier hardening is retained.
-- =============================================

-- 1. All-time Word Hunt leaderboard (global, cross-language)
DROP VIEW IF EXISTS word_hunt_alltime_leaderboard;

CREATE VIEW word_hunt_alltime_leaderboard
WITH (security_invoker = on, security_barrier = on) AS
SELECT
    dwa.player_id::text AS player_identifier,
    dwa.player_id,
    MAX(dwa.guest_fingerprint) AS guest_fingerprint,
    MAX(dwa.language) AS language,
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
        ORDER BY
            SUM(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END) DESC,
            COUNT(*) FILTER (WHERE dwa.solved) DESC,
            MAX(dwa.completed_at) DESC
    ) AS rank_position
FROM daily_word_hunt_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
WHERE dwa.player_id IS NOT NULL
GROUP BY dwa.player_id,
         p.display_name, p.avatar_emoji, p.avatar_color,
         p.avatar_image, p.profile_picture_url, p.avatar_config, p.country_code;

GRANT SELECT ON word_hunt_alltime_leaderboard TO anon, authenticated;

COMMENT ON VIEW word_hunt_alltime_leaderboard IS
  'All-time Word Hunt leaderboard — aggregates each player across ALL languages and ranks globally.';

-- 2. All-time Word Wheel leaderboard (global, cross-language) — mirrors hunt shape
DROP VIEW IF EXISTS word_wheel_alltime_leaderboard;

CREATE VIEW word_wheel_alltime_leaderboard
WITH (security_invoker = on, security_barrier = on) AS
SELECT
    dwa.player_id::text AS player_identifier,
    dwa.player_id,
    MAX(dwa.guest_fingerprint) AS guest_fingerprint,
    MAX(dwa.language) AS language,
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
        ORDER BY
            SUM(COALESCE(dwa.score, 0)) DESC,
            COUNT(*) DESC,
            MAX(dwa.completed_at) DESC
    ) AS rank_position
FROM daily_word_wheel_attempts dwa
LEFT JOIN profiles p ON dwa.player_id = p.id
WHERE dwa.player_id IS NOT NULL
GROUP BY dwa.player_id,
         p.display_name, p.avatar_emoji, p.avatar_color,
         p.avatar_image, p.profile_picture_url, p.avatar_config, p.country_code;

GRANT SELECT ON word_wheel_alltime_leaderboard TO anon, authenticated;

COMMENT ON VIEW word_wheel_alltime_leaderboard IS
  'All-time Word Wheel leaderboard — aggregates each player across ALL languages and ranks globally.';
