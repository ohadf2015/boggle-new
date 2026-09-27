-- =============================================
-- FIX DAILY WORD HUNT LEADERBOARD - REMOVE VIEW ORDER BY
-- Migration: 054_fix_daily_word_hunt_leaderboard_ordering
-- Created: 2026-01-22
--
-- Fixes: Empty leaderboard results due to ORDER BY in view definition
-- Same fix as migration 019 for daily_puzzle_leaderboard
--
-- Issue: PostgREST can return empty results when views have ORDER BY
-- clauses and queries also apply filtering/ordering. The ordering
-- should be handled by the API queries, not the view definition.
-- =============================================

-- Drop and recreate the view WITHOUT the trailing ORDER BY clause
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
-- NOTE: No ORDER BY clause here - ordering is done in API queries
-- This fixes the issue where PostgREST returns empty results

-- Grant permissions
GRANT SELECT ON daily_word_hunt_leaderboard TO anon, authenticated;

COMMENT ON VIEW daily_word_hunt_leaderboard IS
    'Daily Word Hunt leaderboard with player rankings. No ORDER BY in view definition - queries should apply their own ORDER BY to avoid PostgREST filtering issues.';
