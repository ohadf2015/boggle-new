-- =============================================
-- SECURITY FIX: Convert SECURITY DEFINER views
-- Migration: 052_fix_security_definer_views
-- Created: 2026-01-22
-- Priority: HIGH
--
-- This migration fixes 8 views with SECURITY DEFINER property.
-- - friend_conversations: Converted to SECURITY INVOKER (sensitive data)
-- - Leaderboard views: Added security_barrier to prevent data leakage
-- =============================================

-- =============================================
-- STEP 1: FIX FRIEND_CONVERSATIONS VIEW
-- This view exposes private messages and MUST use caller's RLS
-- =============================================

DROP VIEW IF EXISTS friend_conversations;

CREATE VIEW friend_conversations
WITH (security_invoker = true, security_barrier = true) AS
SELECT DISTINCT ON (
    CASE
        WHEN sender_id < recipient_id THEN ((sender_id || '_'::text) || recipient_id)
        ELSE ((recipient_id || '_'::text) || sender_id)
    END
)
    CASE
        WHEN sender_id < recipient_id THEN ((sender_id || '_'::text) || recipient_id)
        ELSE ((recipient_id || '_'::text) || sender_id)
    END AS conversation_id,
    sender_id,
    recipient_id,
    message AS last_message,
    created_at AS last_message_at,
    read AS last_message_read,
    (SELECT count(*)
     FROM public.friend_messages
     WHERE friend_messages.recipient_id = m.sender_id
       AND friend_messages.sender_id = m.recipient_id
       AND friend_messages.read = false
       AND friend_messages.deleted_for_recipient = false) AS unread_for_sender,
    (SELECT count(*)
     FROM public.friend_messages
     WHERE friend_messages.recipient_id = m.recipient_id
       AND friend_messages.sender_id = m.sender_id
       AND friend_messages.read = false
       AND friend_messages.deleted_for_recipient = false) AS unread_for_recipient
FROM public.friend_messages m
WHERE (deleted_for_sender = false) OR (deleted_for_recipient = false)
ORDER BY
    CASE
        WHEN sender_id < recipient_id THEN ((sender_id || '_'::text) || recipient_id)
        ELSE ((recipient_id || '_'::text) || sender_id)
    END,
    created_at DESC;

-- =============================================
-- STEP 2: FIX LEADERBOARD VIEWS WITH SECURITY BARRIER
-- These aggregate public data but need security_barrier to prevent
-- data leakage through predicate pushdown attacks
-- =============================================

-- Fix daily_buzz_leaderboard
DROP VIEW IF EXISTS daily_buzz_leaderboard;

CREATE VIEW daily_buzz_leaderboard
WITH (security_barrier = true) AS
SELECT
    dba.challenge_id,
    dbc.puzzle_date,
    dbc.language,
    dbc.region,
    p.id AS player_id,
    p.username,
    p.avatar_image,
    p.avatar_emoji,
    p.avatar_color,
    dba.score,
    dba.completion_time_seconds,
    dba.submitted_at,
    row_number() OVER (PARTITION BY dbc.puzzle_date, dbc.language ORDER BY dba.score DESC, dba.completion_time_seconds) AS rank
FROM public.daily_buzz_attempts dba
JOIN public.daily_buzz_challenges dbc ON dba.challenge_id = dbc.id
LEFT JOIN public.profiles p ON dba.player_id = p.id
WHERE dba.completed = true AND dba.player_id IS NOT NULL;

-- Fix buzz_alltime_leaderboard
DROP VIEW IF EXISTS buzz_alltime_leaderboard;

CREATE VIEW buzz_alltime_leaderboard
WITH (security_barrier = true) AS
SELECT
    bs.player_id,
    p.username,
    p.avatar_image,
    p.avatar_emoji,
    p.avatar_color,
    bs.current_streak,
    bs.longest_streak,
    bs.total_challenges_completed,
    COALESCE(sum(dba.score), 0::bigint) AS total_score,
    COALESCE(avg(dba.score), 0::numeric) AS avg_score,
    row_number() OVER (ORDER BY COALESCE(sum(dba.score), 0::bigint) DESC) AS rank
FROM public.buzz_streaks bs
JOIN public.profiles p ON bs.player_id = p.id
LEFT JOIN public.daily_buzz_attempts dba ON bs.player_id = dba.player_id AND dba.completed = true
GROUP BY bs.player_id, p.username, p.avatar_image, p.avatar_emoji, p.avatar_color,
         bs.current_streak, bs.longest_streak, bs.total_challenges_completed;

-- Fix daily_word_hunt_leaderboard
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
LEFT JOIN public.profiles p ON dwa.player_id = p.id
ORDER BY dwa.puzzle_date DESC, rank_position;

-- Fix word_hunt_alltime_leaderboard
DROP VIEW IF EXISTS word_hunt_alltime_leaderboard;

CREATE VIEW word_hunt_alltime_leaderboard
WITH (security_barrier = true) AS
SELECT
    COALESCE((dwa.player_id)::text, dwa.guest_fingerprint) AS player_identifier,
    dwa.player_id,
    dwa.guest_fingerprint,
    dwa.language,
    COALESCE(p.display_name, max(dwa.display_name), 'Guest Player'::text) AS display_name,
    COALESCE(p.avatar_emoji, max(dwa.avatar_emoji), '🎯'::text) AS avatar_emoji,
    COALESCE(p.avatar_color, max(dwa.avatar_color), '#FFE135'::text) AS avatar_color,
    p.avatar_image,
    p.profile_picture_url,
    COALESCE(p.country_code, max(dwa.country_code)) AS country_code,
    (sum(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END))::integer AS total_efficiency_score,
    (count(*))::integer AS total_games,
    (count(*) FILTER (WHERE dwa.solved))::integer AS games_won,
    round(avg(dwa.attempts_used) FILTER (WHERE dwa.solved), 1) AS avg_attempts,
    max(dwa.efficiency_score) FILTER (WHERE dwa.solved) AS best_efficiency,
    max(dwa.completed_at) AS last_played_at,
    row_number() OVER (PARTITION BY dwa.language
                       ORDER BY sum(CASE WHEN dwa.solved THEN COALESCE(dwa.efficiency_score, 0) ELSE 0 END) DESC,
                                count(*) FILTER (WHERE dwa.solved) DESC,
                                max(dwa.completed_at) DESC) AS rank_position
FROM public.daily_word_hunt_attempts dwa
LEFT JOIN public.profiles p ON dwa.player_id = p.id
WHERE dwa.player_id IS NOT NULL
GROUP BY dwa.player_id, dwa.guest_fingerprint, dwa.language,
         p.display_name, p.avatar_emoji, p.avatar_color,
         p.avatar_image, p.profile_picture_url, p.country_code
ORDER BY rank_position;

-- Fix single_player_top_scores
DROP VIEW IF EXISTS single_player_top_scores;

CREATE VIEW single_player_top_scores
WITH (security_barrier = true) AS
SELECT
    guest_fingerprint,
    username,
    avatar_emoji,
    avatar_color,
    total_score,
    games_played,
    best_score,
    longest_word,
    rank() OVER (ORDER BY total_score DESC) AS rank_position,
    updated_at
FROM public.single_player_leaderboard
WHERE games_played > 0
ORDER BY total_score DESC
LIMIT 100;

-- Fix custom_puzzle_leaderboard
DROP VIEW IF EXISTS custom_puzzle_leaderboard;

CREATE VIEW custom_puzzle_leaderboard
WITH (security_barrier = true) AS
SELECT
    cp.puzzle_code,
    cpa.player_id,
    cpa.guest_fingerprint,
    cpa.display_name,
    cpa.avatar_emoji,
    cpa.avatar_color,
    cpa.avatar_image,
    cpa.profile_picture_url,
    cpa.country_code,
    cpa.solved,
    cpa.attempts_used,
    cpa.efficiency_score,
    cpa.words_discovered,
    cpa.life_remaining,
    cpa.completed_at,
    row_number() OVER (PARTITION BY cp.puzzle_code
                       ORDER BY cpa.solved DESC, cpa.efficiency_score DESC NULLS LAST,
                                cpa.attempts_used, cpa.completed_at) AS rank_position
FROM public.custom_puzzle_attempts cpa
JOIN public.custom_puzzles cp ON cp.id = cpa.puzzle_id
WHERE cpa.solved = true;

-- Fix custom_puzzle_stats
DROP VIEW IF EXISTS custom_puzzle_stats;

CREATE VIEW custom_puzzle_stats
WITH (security_barrier = true) AS
SELECT
    cp.puzzle_code,
    cp.creator_id,
    cp.creator_display_name,
    cp.language,
    cp.target_word,
    cp.created_at,
    cp.creator_efficiency_score,
    count(cpa.id) AS total_attempts,
    count(CASE WHEN cpa.solved = true THEN 1 ELSE NULL END) AS total_solved,
    round((100.0 * count(CASE WHEN cpa.solved = true THEN 1 ELSE NULL END)::numeric) /
          NULLIF(count(cpa.id), 0)::numeric, 2) AS solve_rate,
    round(avg(CASE WHEN cpa.solved = true THEN cpa.attempts_used ELSE NULL END), 2) AS avg_attempts_solved,
    round(avg(CASE WHEN cpa.solved = true THEN cpa.efficiency_score ELSE NULL END), 2) AS avg_efficiency_score,
    max(cpa.efficiency_score) AS max_efficiency_score,
    round(avg(CASE WHEN cpa.solved = true THEN cpa.life_remaining ELSE NULL END), 2) AS avg_life_remaining,
    round(avg(CASE WHEN cpa.solved = true THEN jsonb_array_length(cpa.words_discovered) ELSE NULL END), 2) AS avg_words_discovered,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 1 THEN 1 ELSE NULL END) AS solved_in_1,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 2 THEN 1 ELSE NULL END) AS solved_in_2,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 3 THEN 1 ELSE NULL END) AS solved_in_3,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 4 THEN 1 ELSE NULL END) AS solved_in_4,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 5 THEN 1 ELSE NULL END) AS solved_in_5,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 6 THEN 1 ELSE NULL END) AS solved_in_6,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 7 THEN 1 ELSE NULL END) AS solved_in_7,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 8 THEN 1 ELSE NULL END) AS solved_in_8,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 9 THEN 1 ELSE NULL END) AS solved_in_9,
    count(CASE WHEN cpa.solved = true AND cpa.attempts_used = 10 THEN 1 ELSE NULL END) AS solved_in_10,
    count(CASE WHEN cpa.solved = true AND cpa.efficiency_score > cp.creator_efficiency_score THEN 1 ELSE NULL END) AS beat_creator_count
FROM public.custom_puzzles cp
LEFT JOIN public.custom_puzzle_attempts cpa ON cp.id = cpa.puzzle_id
GROUP BY cp.puzzle_code, cp.creator_id, cp.creator_display_name, cp.language,
         cp.target_word, cp.created_at, cp.creator_efficiency_score;

-- =============================================
-- GRANT SELECT ON VIEWS
-- =============================================
GRANT SELECT ON friend_conversations TO authenticated;
GRANT SELECT ON daily_buzz_leaderboard TO anon, authenticated;
GRANT SELECT ON buzz_alltime_leaderboard TO anon, authenticated;
GRANT SELECT ON daily_word_hunt_leaderboard TO anon, authenticated;
GRANT SELECT ON word_hunt_alltime_leaderboard TO anon, authenticated;
GRANT SELECT ON single_player_top_scores TO anon, authenticated;
GRANT SELECT ON custom_puzzle_leaderboard TO anon, authenticated;
GRANT SELECT ON custom_puzzle_stats TO anon, authenticated;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON VIEW friend_conversations IS
    'Secure view for friend conversations. Uses security_invoker to respect RLS on friend_messages.';
COMMENT ON VIEW daily_buzz_leaderboard IS
    'Daily buzz challenge leaderboard with security_barrier to prevent data leakage.';
COMMENT ON VIEW buzz_alltime_leaderboard IS
    'All-time buzz leaderboard with security_barrier.';
COMMENT ON VIEW daily_word_hunt_leaderboard IS
    'Daily word hunt leaderboard with security_barrier.';
COMMENT ON VIEW word_hunt_alltime_leaderboard IS
    'All-time word hunt leaderboard with security_barrier.';
COMMENT ON VIEW single_player_top_scores IS
    'Single player top 100 scores with security_barrier.';
COMMENT ON VIEW custom_puzzle_leaderboard IS
    'Custom puzzle leaderboard with security_barrier.';
COMMENT ON VIEW custom_puzzle_stats IS
    'Custom puzzle statistics with security_barrier.';
