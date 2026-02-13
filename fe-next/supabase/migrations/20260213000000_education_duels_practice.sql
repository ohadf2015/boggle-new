-- Migration: 20260213000000_education_duels_practice.sql
-- Description: Database foundation for duels and practice sessions
-- Dependencies: 056_teacher_vocabulary_builder.sql (classrooms, vocabulary_lessons, profiles)
-- Phase: 36-foundation-refactoring
-- Purpose: Establishes database schema for Phase 37 (Practice Modes), Phase 38 (Async Duels), Phase 39 (Real-Time Duels)

-- ============================================
-- STUDENT DUELS TABLE
-- ============================================
-- Tracks async and real-time duels between students within a classroom
-- Stores board state, scores, and game lifecycle (pending → active → completed)

CREATE TABLE IF NOT EXISTS student_duels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    opponent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    duel_type VARCHAR(20) NOT NULL CHECK (duel_type IN ('async', 'realtime')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired')),
    board_state JSONB,
    challenger_score INTEGER DEFAULT 0,
    opponent_score INTEGER DEFAULT 0,
    winner_id UUID REFERENCES profiles(id),
    xp_awarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

COMMENT ON TABLE student_duels IS 'Student duels (async/realtime) with board state and scores';
COMMENT ON COLUMN student_duels.classroom_id IS 'Classroom where duel takes place';
COMMENT ON COLUMN student_duels.challenger_id IS 'Student who initiated the duel';
COMMENT ON COLUMN student_duels.opponent_id IS 'Student who was challenged';
COMMENT ON COLUMN student_duels.lesson_id IS 'Vocabulary lesson used for word validation';
COMMENT ON COLUMN student_duels.duel_type IS 'async (turn-based) or realtime (simultaneous)';
COMMENT ON COLUMN student_duels.status IS 'pending (awaiting opponent) | active (in progress) | completed | cancelled | expired';
COMMENT ON COLUMN student_duels.board_state IS 'Current board configuration (for async duels)';
COMMENT ON COLUMN student_duels.challenger_score IS 'Challenger total score';
COMMENT ON COLUMN student_duels.opponent_score IS 'Opponent total score';
COMMENT ON COLUMN student_duels.winner_id IS 'Winner profile ID (set on completion)';
COMMENT ON COLUMN student_duels.xp_awarded IS 'Whether XP has been awarded for this duel';
COMMENT ON COLUMN student_duels.created_at IS 'When duel was created';
COMMENT ON COLUMN student_duels.started_at IS 'When opponent accepted duel';
COMMENT ON COLUMN student_duels.completed_at IS 'When duel finished';
COMMENT ON COLUMN student_duels.expires_at IS 'When pending duel expires (24h default)';

-- ============================================
-- DUEL TURNS TABLE
-- ============================================
-- Tracks individual turns in async duels (realtime duels don't use turns)
-- Each turn captures words found, score, and board snapshot

CREATE TABLE IF NOT EXISTS duel_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_id UUID NOT NULL REFERENCES student_duels(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    words_found JSONB NOT NULL DEFAULT '[]'::jsonb,
    board_state_snapshot JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE duel_turns IS 'Individual turns in async duels (realtime duels skip turns)';
COMMENT ON COLUMN duel_turns.duel_id IS 'Foreign key to student_duels';
COMMENT ON COLUMN duel_turns.player_id IS 'Student who took this turn';
COMMENT ON COLUMN duel_turns.score IS 'Score for this turn';
COMMENT ON COLUMN duel_turns.words_found IS 'Array of words found in this turn';
COMMENT ON COLUMN duel_turns.board_state_snapshot IS 'Board state at turn start (for replay/verification)';
COMMENT ON COLUMN duel_turns.started_at IS 'When turn started';
COMMENT ON COLUMN duel_turns.completed_at IS 'When turn finished';

-- ============================================
-- PRACTICE SESSIONS TABLE
-- ============================================
-- Tracks solo practice sessions across different modes (matching, spelling, blitz, flashcard, board)
-- Used for XP calculation, achievement progress, and student analytics

CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('matching', 'spelling', 'blitz', 'flashcard', 'board')),
    score INTEGER NOT NULL DEFAULT 0,
    accuracy REAL,
    words_attempted INTEGER NOT NULL DEFAULT 0,
    words_correct INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    results JSONB,
    xp_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE practice_sessions IS 'Solo practice sessions across different modes';
COMMENT ON COLUMN practice_sessions.student_id IS 'Student who completed the session';
COMMENT ON COLUMN practice_sessions.lesson_id IS 'Vocabulary lesson used';
COMMENT ON COLUMN practice_sessions.classroom_id IS 'Optional classroom context (NULL for personal practice)';
COMMENT ON COLUMN practice_sessions.mode IS 'matching (pair words) | spelling | blitz (timed) | flashcard | board (find words)';
COMMENT ON COLUMN practice_sessions.score IS 'Total points earned';
COMMENT ON COLUMN practice_sessions.accuracy IS 'Percentage correct (0.0 - 1.0)';
COMMENT ON COLUMN practice_sessions.words_attempted IS 'Total words attempted';
COMMENT ON COLUMN practice_sessions.words_correct IS 'Words answered correctly';
COMMENT ON COLUMN practice_sessions.duration_seconds IS 'Time spent in seconds';
COMMENT ON COLUMN practice_sessions.results IS 'Detailed results (mode-specific structure)';
COMMENT ON COLUMN practice_sessions.xp_awarded IS 'XP points awarded for this session';
COMMENT ON COLUMN practice_sessions.created_at IS 'When session started';
COMMENT ON COLUMN practice_sessions.completed_at IS 'When session finished';

-- ============================================
-- STUDENT ACHIEVEMENTS PROGRESS TABLE
-- ============================================
-- Tracks real-time progress toward achievement tiers (Bronze → Silver → Gold → Platinum)
-- Separate from student_achievements (which stores unlocked achievements)
-- This table tracks incremental progress before unlock

CREATE TABLE IF NOT EXISTS student_achievements_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_key VARCHAR(50) NOT NULL,
    current_count INTEGER NOT NULL DEFAULT 0,
    target_count INTEGER NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, achievement_key, tier)
);

COMMENT ON TABLE student_achievements_progress IS 'Real-time progress tracking toward achievement tiers';
COMMENT ON COLUMN student_achievements_progress.student_id IS 'Student tracking progress';
COMMENT ON COLUMN student_achievements_progress.achievement_key IS 'Achievement identifier (e.g., word_master, streak_champion)';
COMMENT ON COLUMN student_achievements_progress.current_count IS 'Current progress value';
COMMENT ON COLUMN student_achievements_progress.target_count IS 'Target value to unlock this tier';
COMMENT ON COLUMN student_achievements_progress.tier IS 'Tier being tracked: bronze, silver, gold, platinum';
COMMENT ON COLUMN student_achievements_progress.unlocked_at IS 'When tier was unlocked (NULL if still in progress)';
COMMENT ON COLUMN student_achievements_progress.created_at IS 'When progress tracking started';
COMMENT ON COLUMN student_achievements_progress.updated_at IS 'Last progress update';

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE student_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STUDENT_DUELS POLICIES
-- ============================================

-- Students can read their own duels (as challenger or opponent)
CREATE POLICY "Students can read own duels"
    ON student_duels FOR SELECT
    TO authenticated
    USING (
        auth.uid() = challenger_id
        OR auth.uid() = opponent_id
    );

-- Students can read classmates' duels (for lobby/leaderboard)
CREATE POLICY "Students can read classmate duels"
    ON student_duels FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm
            WHERE cm.classroom_id = student_duels.classroom_id
            AND cm.student_id = auth.uid()
        )
    );

-- Students can create duels as challenger
CREATE POLICY "Students can create duels as challenger"
    ON student_duels FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = challenger_id);

-- Students can update duels they are part of
CREATE POLICY "Students can update their duels"
    ON student_duels FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = challenger_id
        OR auth.uid() = opponent_id
    )
    WITH CHECK (
        auth.uid() = challenger_id
        OR auth.uid() = opponent_id
    );

-- Teachers can read all duels in their classrooms
CREATE POLICY "Teachers can read classroom duels"
    ON student_duels FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classrooms c
            WHERE c.id = student_duels.classroom_id
            AND c.teacher_id = auth.uid()
        )
    );

-- ============================================
-- DUEL_TURNS POLICIES
-- ============================================

-- Students can read turns from duels they are part of
CREATE POLICY "Students can read own duel turns"
    ON duel_turns FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM student_duels sd
            WHERE sd.id = duel_turns.duel_id
            AND (sd.challenger_id = auth.uid() OR sd.opponent_id = auth.uid())
        )
    );

-- Students can insert turns in duels they are part of
CREATE POLICY "Students can insert own duel turns"
    ON duel_turns FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = player_id
        AND EXISTS (
            SELECT 1 FROM student_duels sd
            WHERE sd.id = duel_turns.duel_id
            AND (sd.challenger_id = auth.uid() OR sd.opponent_id = auth.uid())
        )
    );

-- Teachers can read all turns in their classroom duels
CREATE POLICY "Teachers can read classroom duel turns"
    ON duel_turns FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM student_duels sd
            JOIN classrooms c ON c.id = sd.classroom_id
            WHERE sd.id = duel_turns.duel_id
            AND c.teacher_id = auth.uid()
        )
    );

-- ============================================
-- PRACTICE_SESSIONS POLICIES
-- ============================================

-- Students can read their own practice sessions
CREATE POLICY "Students can read own practice sessions"
    ON practice_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Students can insert their own practice sessions
CREATE POLICY "Students can insert own practice sessions"
    ON practice_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own practice sessions
CREATE POLICY "Students can update own practice sessions"
    ON practice_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can read practice sessions of students in their classrooms
CREATE POLICY "Teachers can read classroom practice sessions"
    ON practice_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm
            JOIN classrooms c ON c.id = cm.classroom_id
            WHERE cm.student_id = practice_sessions.student_id
            AND c.teacher_id = auth.uid()
        )
    );

-- ============================================
-- STUDENT_ACHIEVEMENTS_PROGRESS POLICIES
-- ============================================

-- Students can read their own achievement progress
CREATE POLICY "Students can read own achievement progress"
    ON student_achievements_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Students can insert their own achievement progress
CREATE POLICY "Students can insert own achievement progress"
    ON student_achievements_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own achievement progress
CREATE POLICY "Students can update own achievement progress"
    ON student_achievements_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can read achievement progress of students in their classrooms
CREATE POLICY "Teachers can read classroom achievement progress"
    ON student_achievements_progress FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm
            JOIN classrooms c ON c.id = cm.classroom_id
            WHERE cm.student_id = student_achievements_progress.student_id
            AND c.teacher_id = auth.uid()
        )
    );

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- student_duels indexes
CREATE INDEX IF NOT EXISTS idx_student_duels_challenger_status
    ON student_duels(challenger_id, status);

CREATE INDEX IF NOT EXISTS idx_student_duels_opponent_status
    ON student_duels(opponent_id, status);

CREATE INDEX IF NOT EXISTS idx_student_duels_classroom_status_created
    ON student_duels(classroom_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_duels_lesson
    ON student_duels(lesson_id);

-- duel_turns indexes
CREATE INDEX IF NOT EXISTS idx_duel_turns_duel_player
    ON duel_turns(duel_id, player_id);

CREATE INDEX IF NOT EXISTS idx_duel_turns_player_started
    ON duel_turns(player_id, started_at DESC);

-- practice_sessions indexes
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_lesson_created
    ON practice_sessions(student_id, lesson_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_classroom_mode
    ON practice_sessions(classroom_id, mode);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_mode
    ON practice_sessions(student_id, mode);

-- student_achievements_progress indexes
CREATE INDEX IF NOT EXISTS idx_student_achievements_progress_student_key
    ON student_achievements_progress(student_id, achievement_key);

CREATE INDEX IF NOT EXISTS idx_student_achievements_progress_student_unlocked
    ON student_achievements_progress(student_id, unlocked_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
-- Auto-updates updated_at timestamp for student_achievements_progress

CREATE OR REPLACE FUNCTION update_achievement_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_achievement_progress_updated_at
    BEFORE UPDATE ON student_achievements_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_achievement_progress_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON student_duels TO authenticated;
GRANT SELECT, INSERT ON duel_turns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON practice_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON student_achievements_progress TO authenticated;

GRANT EXECUTE ON FUNCTION update_achievement_progress_updated_at() TO authenticated;
