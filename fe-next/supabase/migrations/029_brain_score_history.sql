-- =============================================
-- BRAIN SCORE HISTORY TABLE
-- Migration: 029_brain_score_history
-- Created: 2026-01-09
-- Purpose: Track brain score progression over time
-- =============================================

-- Brain Score History table (daily/weekly/monthly snapshots)
CREATE TABLE IF NOT EXISTS brain_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    overall_score INTEGER DEFAULT 0,
    processing_speed INTEGER DEFAULT 0,
    working_memory INTEGER DEFAULT 0,
    attention INTEGER DEFAULT 0,
    flexibility INTEGER DEFAULT 0,
    vocabulary INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    drills_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period_type, period_start)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_brain_score_history_user_id ON brain_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_brain_score_history_period ON brain_score_history(period_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_brain_score_history_user_period ON brain_score_history(user_id, period_type, period_start DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE brain_score_history ENABLE ROW LEVEL SECURITY;

-- Brain Score History: Users manage their own history
CREATE POLICY "Users can view own brain_score_history" ON brain_score_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brain_score_history" ON brain_score_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brain_score_history" ON brain_score_history
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for updated_at (reuse existing function from 027)
DROP TRIGGER IF EXISTS brain_score_history_updated_at ON brain_score_history;
CREATE TRIGGER brain_score_history_updated_at
    BEFORE UPDATE ON brain_score_history
    FOR EACH ROW
    EXECUTE FUNCTION update_brain_training_updated_at();
