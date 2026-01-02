-- =============================================
-- COGNITIVE SCORES DATABASE SCHEMA
-- Migration: 025_cognitive_scores
-- Features: Per-game cognitive scores, rolling averages, trends
-- =============================================

-- =============================================
-- GAME COGNITIVE SCORES TABLE
-- Stores per-game cognitive assessment
-- =============================================
CREATE TABLE IF NOT EXISTS game_cognitive_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    game_code TEXT NOT NULL,

    -- Domain scores (0-100 each)
    processing_speed INTEGER NOT NULL CHECK (processing_speed >= 0 AND processing_speed <= 100),
    working_memory INTEGER NOT NULL CHECK (working_memory >= 0 AND working_memory <= 100),
    attention INTEGER NOT NULL CHECK (attention >= 0 AND attention <= 100),
    cognitive_flexibility INTEGER NOT NULL CHECK (cognitive_flexibility >= 0 AND cognitive_flexibility <= 100),
    vocabulary INTEGER NOT NULL CHECK (vocabulary >= 0 AND vocabulary <= 100),

    -- Weighted average brain score
    brain_score INTEGER NOT NULL CHECK (brain_score >= 0 AND brain_score <= 100),

    -- Game context
    game_mode TEXT NOT NULL DEFAULT 'multiplayer' CHECK (game_mode IN ('singleplayer', 'multiplayer')),
    grid_size TEXT NOT NULL DEFAULT '5x5',
    game_duration INTEGER NOT NULL DEFAULT 180,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADD COGNITIVE PROFILE COLUMN TO PROFILES
-- Stores rolling averages and peaks as JSONB
-- Structure:
-- {
--   "currentScores": { "processingSpeed": 0, "workingMemory": 0, ... },
--   "currentBrainScore": 0,
--   "peakScores": { "processingSpeed": 0, "workingMemory": 0, ... },
--   "peakBrainScore": 0,
--   "trends": { "processingSpeed": 0, "workingMemory": 0, ..., "overall": 0 },
--   "gamesAnalyzed": 0,
--   "lastUpdated": "ISO date"
-- }
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cognitive_profile JSONB DEFAULT NULL;

-- Add brain score to leaderboard for optional display/sorting
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS brain_score INTEGER DEFAULT NULL;

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Index for fetching player's cognitive scores (most recent first)
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_player_id
    ON game_cognitive_scores(player_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_created_at
    ON game_cognitive_scores(created_at DESC);

-- Index for brain score leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_brain_score
    ON game_cognitive_scores(brain_score DESC);

-- Composite index for player recent scores (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_player_recent
    ON game_cognitive_scores(player_id, created_at DESC);

-- Index for leaderboard brain score sorting
CREATE INDEX IF NOT EXISTS idx_leaderboard_brain_score
    ON leaderboard(brain_score DESC NULLS LAST);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE game_cognitive_scores ENABLE ROW LEVEL SECURITY;

-- Users can read their own cognitive scores
CREATE POLICY "Users can read own cognitive scores"
    ON game_cognitive_scores
    FOR SELECT
    USING (auth.uid() = player_id);

-- Users can insert their own cognitive scores
CREATE POLICY "Users can insert own cognitive scores"
    ON game_cognitive_scores
    FOR INSERT
    WITH CHECK (auth.uid() = player_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access to cognitive scores"
    ON game_cognitive_scores
    USING (auth.role() = 'service_role');

-- =============================================
-- FUNCTION: Get recent cognitive scores for a player
-- Returns last N games' cognitive scores
-- =============================================
CREATE OR REPLACE FUNCTION get_recent_cognitive_scores(
    p_player_id UUID,
    p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
    processing_speed INTEGER,
    working_memory INTEGER,
    attention INTEGER,
    cognitive_flexibility INTEGER,
    vocabulary INTEGER,
    brain_score INTEGER,
    game_mode TEXT,
    grid_size TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gcs.processing_speed,
        gcs.working_memory,
        gcs.attention,
        gcs.cognitive_flexibility,
        gcs.vocabulary,
        gcs.brain_score,
        gcs.game_mode,
        gcs.grid_size,
        gcs.created_at
    FROM game_cognitive_scores gcs
    WHERE gcs.player_id = p_player_id
    ORDER BY gcs.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNCTION: Calculate and update cognitive profile
-- Called after each game to update rolling averages
-- =============================================
CREATE OR REPLACE FUNCTION update_cognitive_profile(
    p_player_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_profile JSONB;
    v_stats RECORD;
    v_peaks RECORD;
    v_games_count INTEGER;
    v_previous_brain_score INTEGER;
BEGIN
    -- Get previous brain score for trend calculation
    SELECT (cognitive_profile->>'currentBrainScore')::INTEGER
    INTO v_previous_brain_score
    FROM profiles
    WHERE id = p_player_id;

    -- Get count and averages from recent games (rolling 30-game window)
    SELECT
        COUNT(*)::INTEGER as games_count,
        ROUND(AVG(processing_speed))::INTEGER as avg_processing_speed,
        ROUND(AVG(working_memory))::INTEGER as avg_working_memory,
        ROUND(AVG(attention))::INTEGER as avg_attention,
        ROUND(AVG(cognitive_flexibility))::INTEGER as avg_cognitive_flexibility,
        ROUND(AVG(vocabulary))::INTEGER as avg_vocabulary,
        ROUND(AVG(brain_score))::INTEGER as avg_brain_score
    INTO v_stats
    FROM (
        SELECT * FROM game_cognitive_scores
        WHERE player_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 30
    ) recent_games;

    -- Get all-time peaks
    SELECT
        MAX(processing_speed)::INTEGER as peak_processing_speed,
        MAX(working_memory)::INTEGER as peak_working_memory,
        MAX(attention)::INTEGER as peak_attention,
        MAX(cognitive_flexibility)::INTEGER as peak_cognitive_flexibility,
        MAX(vocabulary)::INTEGER as peak_vocabulary,
        MAX(brain_score)::INTEGER as peak_brain_score
    INTO v_peaks
    FROM game_cognitive_scores
    WHERE player_id = p_player_id;

    -- Calculate games count
    SELECT COUNT(*)::INTEGER INTO v_games_count
    FROM game_cognitive_scores
    WHERE player_id = p_player_id;

    -- Build profile JSON
    v_profile := jsonb_build_object(
        'currentScores', jsonb_build_object(
            'processingSpeed', COALESCE(v_stats.avg_processing_speed, 0),
            'workingMemory', COALESCE(v_stats.avg_working_memory, 0),
            'attention', COALESCE(v_stats.avg_attention, 0),
            'cognitiveFlexibility', COALESCE(v_stats.avg_cognitive_flexibility, 0),
            'vocabulary', COALESCE(v_stats.avg_vocabulary, 0)
        ),
        'currentBrainScore', COALESCE(v_stats.avg_brain_score, 0),
        'peakScores', jsonb_build_object(
            'processingSpeed', COALESCE(v_peaks.peak_processing_speed, 0),
            'workingMemory', COALESCE(v_peaks.peak_working_memory, 0),
            'attention', COALESCE(v_peaks.peak_attention, 0),
            'cognitiveFlexibility', COALESCE(v_peaks.peak_cognitive_flexibility, 0),
            'vocabulary', COALESCE(v_peaks.peak_vocabulary, 0)
        ),
        'peakBrainScore', COALESCE(v_peaks.peak_brain_score, 0),
        'trends', jsonb_build_object(
            'processingSpeed', 0,
            'workingMemory', 0,
            'attention', 0,
            'cognitiveFlexibility', 0,
            'vocabulary', 0,
            'overall', CASE
                WHEN v_previous_brain_score IS NULL THEN 0
                WHEN COALESCE(v_stats.avg_brain_score, 0) - v_previous_brain_score >= 3 THEN 1
                WHEN COALESCE(v_stats.avg_brain_score, 0) - v_previous_brain_score <= -3 THEN -1
                ELSE 0
            END
        ),
        'gamesAnalyzed', v_games_count,
        'lastUpdated', NOW()
    );

    -- Update profile
    UPDATE profiles
    SET cognitive_profile = v_profile
    WHERE id = p_player_id;

    -- Update brain_score in leaderboard for sorting/display
    UPDATE leaderboard
    SET brain_score = COALESCE(v_stats.avg_brain_score, 0)
    WHERE player_id = p_player_id;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE game_cognitive_scores IS 'Per-game cognitive domain scores for brain training tracking';
COMMENT ON COLUMN game_cognitive_scores.processing_speed IS 'Score (0-100) for word finding speed normalized by grid size';
COMMENT ON COLUMN game_cognitive_scores.working_memory IS 'Score (0-100) for pattern tracking and long word finding';
COMMENT ON COLUMN game_cognitive_scores.attention IS 'Score (0-100) for combo maintenance and focus';
COMMENT ON COLUMN game_cognitive_scores.cognitive_flexibility IS 'Score (0-100) for word length diversity and strategy adaptation';
COMMENT ON COLUMN game_cognitive_scores.vocabulary IS 'Score (0-100) for rare/unusual word knowledge';
COMMENT ON COLUMN game_cognitive_scores.brain_score IS 'Weighted average of all cognitive domains (0-100)';
COMMENT ON COLUMN profiles.cognitive_profile IS 'Rolling average cognitive scores and peaks (JSONB)';
COMMENT ON COLUMN leaderboard.brain_score IS 'Current average brain score for leaderboard display';
