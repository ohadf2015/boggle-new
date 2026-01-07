-- =============================================
-- BRAIN TRAINING SYSTEM TABLES
-- Migration: 027_brain_training_tables
-- Created: 2026-01-07
-- =============================================

-- Game Sessions table (for analytics tracking)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    guest_session_id TEXT,
    mode TEXT NOT NULL,
    language TEXT NOT NULL,
    difficulty TEXT,
    score INTEGER DEFAULT 0,
    words_found JSONB DEFAULT '[]',
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    daily_puzzle_number INTEGER,
    target_word TEXT,
    target_found BOOLEAN DEFAULT FALSE,
    attempts_used INTEGER,
    life_remaining INTEGER,
    life_gained INTEGER DEFAULT 0,
    tokens_earned INTEGER DEFAULT 0,
    tokens_spent INTEGER DEFAULT 0,
    clues_used INTEGER DEFAULT 0,
    room_code TEXT,
    player_count INTEGER,
    final_rank INTEGER,
    device_type TEXT,
    browser TEXT,
    country TEXT,
    referrer_source TEXT,
    is_first_game BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brain Scores table (overall user cognitive profile)
CREATE TABLE IF NOT EXISTS brain_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    overall_score INTEGER DEFAULT 0,
    processing_speed INTEGER DEFAULT 0,
    working_memory INTEGER DEFAULT 0,
    attention INTEGER DEFAULT 0,
    flexibility INTEGER DEFAULT 0,
    vocabulary INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'novice',
    tier_progress INTEGER DEFAULT 0,
    games_analyzed INTEGER DEFAULT 0,
    drills_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Cognitive Scores (per-game cognitive metrics)
CREATE TABLE IF NOT EXISTS game_cognitive_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
    processing_speed INTEGER DEFAULT 0,
    working_memory INTEGER DEFAULT 0,
    attention INTEGER DEFAULT 0,
    flexibility INTEGER DEFAULT 0,
    vocabulary INTEGER DEFAULT 0,
    words_per_minute NUMERIC(6,2),
    avg_word_length NUMERIC(4,2),
    max_combo INTEGER DEFAULT 0,
    unique_word_lengths INTEGER DEFAULT 0,
    rare_word_count INTEGER DEFAULT 0,
    legendary_word_count INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    grid_size INTEGER DEFAULT 16,
    game_duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill Sessions table (individual drill attempts)
CREATE TABLE IF NOT EXISTS drill_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    drill_type TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    score INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    words_found INTEGER DEFAULT 0,
    domain_score_earned INTEGER,
    extra_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drill Progress table (per-user per-drill-type progress)
CREATE TABLE IF NOT EXISTS drill_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    drill_type TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    high_score INTEGER DEFAULT 0,
    total_plays INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    avg_score INTEGER DEFAULT 0,
    last_played_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, drill_type)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_guest_session_id ON game_sessions(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_mode ON game_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_brain_scores_user_id ON brain_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_brain_scores_overall_score ON brain_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_user_id ON game_cognitive_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_cognitive_scores_created_at ON game_cognitive_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_sessions_user_id ON drill_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_sessions_drill_type ON drill_sessions(drill_type);
CREATE INDEX IF NOT EXISTS idx_drill_sessions_created_at ON drill_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_progress_user_id ON drill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_drill_type ON drill_progress(drill_type);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_cognitive_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_progress ENABLE ROW LEVEL SECURITY;

-- Game Sessions: Users can read/write their own, service can write for guests
CREATE POLICY "Users can view own game_sessions" ON game_sessions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own game_sessions" ON game_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own game_sessions" ON game_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Brain Scores: Users manage their own cognitive profile
CREATE POLICY "Users can view own brain_scores" ON brain_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brain_scores" ON brain_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brain_scores" ON brain_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Game Cognitive Scores: Users manage their own scores
CREATE POLICY "Users can view own game_cognitive_scores" ON game_cognitive_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game_cognitive_scores" ON game_cognitive_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game_cognitive_scores" ON game_cognitive_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Drill Sessions: Users manage their own drill data
CREATE POLICY "Users can view own drill_sessions" ON drill_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drill_sessions" ON drill_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drill Progress: Users manage their own progress
CREATE POLICY "Users can view own drill_progress" ON drill_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drill_progress" ON drill_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drill_progress" ON drill_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brain_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS brain_scores_updated_at ON brain_scores;
CREATE TRIGGER brain_scores_updated_at
    BEFORE UPDATE ON brain_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_brain_training_updated_at();

DROP TRIGGER IF EXISTS drill_progress_updated_at ON drill_progress;
CREATE TRIGGER drill_progress_updated_at
    BEFORE UPDATE ON drill_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_brain_training_updated_at();
