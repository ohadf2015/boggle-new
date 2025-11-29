-- =============================================
-- DATABASE FUNCTIONS & STORED PROCEDURES
-- Migration: 003_database_functions
-- =============================================

-- =============================================
-- LEADERBOARD FUNCTIONS
-- =============================================

-- Get paginated leaderboard with rank
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER, INTEGER, TEXT);

CREATE FUNCTION get_leaderboard(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_order_by TEXT DEFAULT 'total_score'
)
RETURNS TABLE (
    player_id UUID,
    username TEXT,
    avatar_emoji TEXT,
    avatar_color TEXT,
    total_score INTEGER,
    games_played INTEGER,
    games_won INTEGER,
    ranked_mmr INTEGER,
    rank_position BIGINT
) AS $$
BEGIN
    IF p_order_by = 'ranked_mmr' THEN
        RETURN QUERY
        SELECT
            l.player_id,
            l.username,
            l.avatar_emoji,
            l.avatar_color,
            l.total_score,
            l.games_played,
            l.games_won,
            l.ranked_mmr,
            ROW_NUMBER() OVER (ORDER BY l.ranked_mmr DESC, l.games_won DESC) as rank_position
        FROM leaderboard l
        ORDER BY l.ranked_mmr DESC, l.games_won DESC
        LIMIT p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT
            l.player_id,
            l.username,
            l.avatar_emoji,
            l.avatar_color,
            l.total_score,
            l.games_played,
            l.games_won,
            l.ranked_mmr,
            ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.games_played DESC) as rank_position
        FROM leaderboard l
        ORDER BY l.total_score DESC, l.games_played DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get user's rank position
DROP FUNCTION IF EXISTS get_user_rank(UUID);

CREATE FUNCTION get_user_rank(p_user_id UUID)
RETURNS TABLE (
    rank_position BIGINT,
    total_score INTEGER,
    games_played INTEGER,
    ranked_mmr INTEGER,
    total_players BIGINT
) AS $$
DECLARE
    user_score INTEGER;
    user_rank BIGINT;
BEGIN
    -- Get user's score
    SELECT l.total_score INTO user_score
    FROM leaderboard l
    WHERE l.player_id = p_user_id;

    IF user_score IS NULL THEN
        RETURN QUERY
        SELECT
            NULL::BIGINT,
            NULL::INTEGER,
            NULL::INTEGER,
            NULL::INTEGER,
            (SELECT COUNT(*) FROM leaderboard)::BIGINT;
        RETURN;
    END IF;

    RETURN QUERY
    WITH ranked AS (
        SELECT
            l.player_id,
            l.total_score as t_score,
            l.games_played as g_played,
            l.ranked_mmr as r_mmr,
            ROW_NUMBER() OVER (ORDER BY l.total_score DESC) as pos
        FROM leaderboard l
    )
    SELECT
        r.pos,
        r.t_score,
        r.g_played,
        r.r_mmr,
        (SELECT COUNT(*) FROM leaderboard)::BIGINT
    FROM ranked r
    WHERE r.player_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- PROFILE STATISTICS FUNCTIONS
-- =============================================

-- Atomic profile stats update after game
DROP FUNCTION IF EXISTS update_profile_stats(UUID, INTEGER, INTEGER, TEXT, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT[]);

CREATE FUNCTION update_profile_stats(
    p_player_id UUID,
    p_score INTEGER,
    p_word_count INTEGER,
    p_longest_word TEXT,
    p_time_played INTEGER,
    p_is_ranked BOOLEAN,
    p_placement INTEGER,
    p_total_players INTEGER,
    p_achievements TEXT[] DEFAULT '{}'
)
RETURNS profiles AS $$
DECLARE
    result profiles;
    current_longest_length INTEGER;
BEGIN
    -- Get current longest word length
    SELECT COALESCE(longest_word_length, 0) INTO current_longest_length
    FROM profiles WHERE id = p_player_id;

    UPDATE profiles SET
        total_games = total_games + 1,
        total_score = total_score + p_score,
        total_words = total_words + p_word_count,
        total_time_played = total_time_played + p_time_played,
        last_game_at = NOW(),
        -- Conditional game type updates
        casual_games = CASE WHEN NOT p_is_ranked THEN casual_games + 1 ELSE casual_games END,
        ranked_games = CASE WHEN p_is_ranked THEN ranked_games + 1 ELSE ranked_games END,
        ranked_wins = CASE
            WHEN p_is_ranked AND p_placement = 1 AND p_total_players > 1
            THEN ranked_wins + 1
            ELSE ranked_wins
        END,
        -- Longest word update
        longest_word = CASE
            WHEN p_longest_word IS NOT NULL AND LENGTH(p_longest_word) > current_longest_length
            THEN p_longest_word
            ELSE longest_word
        END,
        longest_word_length = CASE
            WHEN p_longest_word IS NOT NULL AND LENGTH(p_longest_word) > current_longest_length
            THEN LENGTH(p_longest_word)
            ELSE longest_word_length
        END,
        -- Achievement counts merge
        achievement_counts = CASE
            WHEN array_length(p_achievements, 1) > 0 THEN
                achievement_counts || (
                    SELECT jsonb_object_agg(
                        a,
                        COALESCE((achievement_counts->>a)::INTEGER, 0) + 1
                    )
                    FROM unnest(p_achievements) as a
                )
            ELSE achievement_counts
        END
    WHERE id = p_player_id
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RANKED MMR FUNCTIONS
-- =============================================

-- Calculate and update MMR for ranked game
DROP FUNCTION IF EXISTS update_ranked_mmr(UUID, INTEGER, INTEGER);

CREATE FUNCTION update_ranked_mmr(
    p_player_id UUID,
    p_placement INTEGER,
    p_total_players INTEGER
)
RETURNS TABLE (
    old_mmr INTEGER,
    new_mmr INTEGER,
    mmr_change INTEGER
) AS $$
DECLARE
    current_mmr INTEGER;
    current_peak INTEGER;
    mmr_delta INTEGER;
    updated_mmr INTEGER;
BEGIN
    -- Get current MMR
    SELECT ranked_mmr, peak_mmr INTO current_mmr, current_peak
    FROM profiles WHERE id = p_player_id;

    current_mmr := COALESCE(current_mmr, 1000);
    current_peak := COALESCE(current_peak, 1000);

    -- Calculate MMR change based on placement
    mmr_delta := CASE
        WHEN p_placement = 1 THEN 25
        WHEN p_placement = 2 AND p_total_players > 2 THEN 10
        WHEN p_placement = 2 THEN -15
        WHEN p_placement = 3 AND p_total_players > 3 THEN 0
        WHEN p_placement = 3 THEN -20
        ELSE -20
    END;

    updated_mmr := GREATEST(0, current_mmr + mmr_delta);

    -- Update profile
    UPDATE profiles SET
        ranked_mmr = updated_mmr,
        peak_mmr = GREATEST(updated_mmr, current_peak)
    WHERE id = p_player_id;

    RETURN QUERY SELECT current_mmr, updated_mmr, mmr_delta;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GUEST TOKEN FUNCTIONS
-- =============================================

-- Merge guest stats into authenticated profile
DROP FUNCTION IF EXISTS claim_guest_stats(UUID, TEXT);

CREATE FUNCTION claim_guest_stats(
    p_user_id UUID,
    p_token_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    guest_stats JSONB;
BEGIN
    -- Get and claim guest token
    UPDATE guest_tokens
    SET claimed_by = p_user_id
    WHERE token_hash = p_token_hash AND claimed_by IS NULL
    RETURNING stats INTO guest_stats;

    IF guest_stats IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Merge stats into profile
    UPDATE profiles SET
        total_games = total_games + COALESCE((guest_stats->>'games')::INTEGER, 0),
        total_score = total_score + COALESCE((guest_stats->>'score')::INTEGER, 0),
        total_words = total_words + COALESCE((guest_stats->>'words')::INTEGER, 0),
        total_time_played = total_time_played + COALESCE((guest_stats->>'timePlayed')::INTEGER, 0),
        longest_word = CASE
            WHEN guest_stats->>'longestWord' IS NOT NULL
                AND LENGTH(guest_stats->>'longestWord') > COALESCE(longest_word_length, 0)
            THEN guest_stats->>'longestWord'
            ELSE longest_word
        END,
        longest_word_length = CASE
            WHEN guest_stats->>'longestWord' IS NOT NULL
                AND LENGTH(guest_stats->>'longestWord') > COALESCE(longest_word_length, 0)
            THEN LENGTH(guest_stats->>'longestWord')
            ELSE longest_word_length
        END,
        achievement_counts = achievement_counts || COALESCE(guest_stats->'achievementCounts', '{}')
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Get player game history with pagination
DROP FUNCTION IF EXISTS get_player_game_history(UUID, INTEGER, INTEGER);

CREATE FUNCTION get_player_game_history(
    p_player_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    game_code TEXT,
    score INTEGER,
    word_count INTEGER,
    longest_word TEXT,
    placement INTEGER,
    is_ranked BOOLEAN,
    language TEXT,
    time_played INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gr.game_code,
        gr.score,
        gr.word_count,
        gr.longest_word,
        gr.placement,
        gr.is_ranked,
        gr.language,
        gr.time_played,
        gr.created_at
    FROM game_results gr
    WHERE gr.player_id = p_player_id
    ORDER BY gr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get player statistics summary
DROP FUNCTION IF EXISTS get_player_stats_summary(UUID);

CREATE FUNCTION get_player_stats_summary(p_player_id UUID)
RETURNS TABLE (
    total_games INTEGER,
    total_score INTEGER,
    total_words INTEGER,
    avg_score NUMERIC,
    avg_words NUMERIC,
    best_score INTEGER,
    best_word_count INTEGER,
    win_rate NUMERIC,
    ranked_win_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.total_games,
        p.total_score,
        p.total_words,
        ROUND(CASE WHEN p.total_games > 0 THEN p.total_score::NUMERIC / p.total_games ELSE 0 END, 1) as avg_score,
        ROUND(CASE WHEN p.total_games > 0 THEN p.total_words::NUMERIC / p.total_games ELSE 0 END, 1) as avg_words,
        COALESCE((SELECT MAX(gr.score) FROM game_results gr WHERE gr.player_id = p_player_id), 0) as best_score,
        COALESCE((SELECT MAX(gr.word_count) FROM game_results gr WHERE gr.player_id = p_player_id), 0) as best_word_count,
        ROUND(CASE
            WHEN p.total_games > 0 THEN
                (SELECT COUNT(*)::NUMERIC FROM game_results gr WHERE gr.player_id = p_player_id AND gr.placement = 1) / p.total_games * 100
            ELSE 0
        END, 1) as win_rate,
        ROUND(CASE
            WHEN p.ranked_games > 0 THEN p.ranked_wins::NUMERIC / p.ranked_games * 100
            ELSE 0
        END, 1) as ranked_win_rate
    FROM profiles p
    WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- SEARCH FUNCTIONS
-- =============================================

-- Search players by username (with fuzzy matching)
DROP FUNCTION IF EXISTS search_players(TEXT, INTEGER);

CREATE FUNCTION search_players(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    player_id UUID,
    username TEXT,
    avatar_emoji TEXT,
    avatar_color TEXT,
    total_score INTEGER,
    ranked_mmr INTEGER,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as player_id,
        p.username,
        p.avatar_emoji,
        p.avatar_color,
        p.total_score,
        p.ranked_mmr,
        SIMILARITY(p.username, p_query) as similarity
    FROM profiles p
    WHERE p.username ILIKE '%' || p_query || '%'
       OR SIMILARITY(p.username, p_query) > 0.2
    ORDER BY
        CASE WHEN p.username ILIKE p_query || '%' THEN 0 ELSE 1 END,
        SIMILARITY(p.username, p_query) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON FUNCTION get_leaderboard IS 'Get paginated leaderboard with computed ranks';
COMMENT ON FUNCTION get_user_rank IS 'Get specific user rank position and stats';
COMMENT ON FUNCTION update_profile_stats IS 'Atomic profile stats update after game completion';
COMMENT ON FUNCTION update_ranked_mmr IS 'Calculate and apply MMR changes for ranked games';
COMMENT ON FUNCTION claim_guest_stats IS 'Merge guest player stats into authenticated profile';
COMMENT ON FUNCTION search_players IS 'Search players by username with fuzzy matching';
