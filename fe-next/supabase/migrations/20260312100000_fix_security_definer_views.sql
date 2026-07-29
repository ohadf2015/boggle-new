-- =============================================
-- FIX: Convert remaining SECURITY DEFINER views to SECURITY INVOKER
-- Migration: 20260312100000_fix_security_definer_views
--
-- The Supabase linter flagged two views still using SECURITY DEFINER:
--   1. daily_word_hunt_leaderboard (last recreated in 054)
--   2. student_practice_progress (created in 058)
--
-- security_barrier alone does NOT fix the SECURITY DEFINER issue.
-- security_invoker = true is required so the view respects the
-- calling user's RLS policies instead of the view creator's.
-- =============================================

-- 1. daily_word_hunt_leaderboard
DROP VIEW IF EXISTS daily_word_hunt_leaderboard;

CREATE VIEW daily_word_hunt_leaderboard
WITH (security_invoker = true, security_barrier = true) AS
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

GRANT SELECT ON daily_word_hunt_leaderboard TO anon, authenticated;

-- 2. student_practice_progress
DROP VIEW IF EXISTS student_practice_progress;

CREATE VIEW student_practice_progress
WITH (security_invoker = true) AS
SELECT
    ps.student_id,
    ps.lesson_id,
    COALESCE(SUM(CASE WHEN ps.practice_type = 'flashcard' THEN ps.cards_reviewed ELSE 0 END), 0) AS total_flashcards_reviewed,
    COALESCE(SUM(CASE WHEN ps.practice_type = 'flashcard' THEN ps.cards_correct ELSE 0 END), 0) AS total_flashcards_correct,
    COALESCE(SUM(CASE WHEN ps.practice_type IN ('solo_board', 'warmup') THEN ps.total_score ELSE 0 END), 0) AS total_practice_score,
    COALESCE(SUM(CASE WHEN ps.practice_type IN ('solo_board', 'warmup') THEN array_length(ps.vocabulary_words_found, 1) ELSE 0 END), 0) AS total_vocabulary_words_found,
    COUNT(*) FILTER (WHERE ps.practice_type = 'flashcard') AS flashcard_sessions,
    COUNT(*) FILTER (WHERE ps.practice_type = 'solo_board') AS solo_board_sessions,
    COUNT(*) FILTER (WHERE ps.practice_type = 'warmup') AS warmup_sessions,
    COUNT(*) FILTER (WHERE ps.practice_type = 'word_list') AS word_list_views,
    COALESCE(SUM(ps.time_spent_seconds), 0) AS total_practice_time_seconds,
    MAX(COALESCE(ps.completed_at, ps.started_at)) AS last_practice_at
FROM practice_sessions ps
GROUP BY ps.student_id, ps.lesson_id;

GRANT SELECT ON student_practice_progress TO authenticated;
