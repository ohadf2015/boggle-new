-- Migration: 062_education_xp_tracking.sql
-- Description: Add XP tracking columns to student_lesson_progress for education gamification
-- Dependencies: 056_teacher_vocabulary_builder.sql (student_lesson_progress table)
-- Phase: 18-education-xp-system

-- ============================================
-- XP TRACKING COLUMNS
-- ============================================
-- Adds XP, level, streak tracking to existing student_lesson_progress table

ALTER TABLE student_lesson_progress
ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_practice_date DATE,
ADD COLUMN IF NOT EXISTS total_practice_sessions INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
-- Index for XP leaderboards (within a lesson/classroom)
CREATE INDEX IF NOT EXISTS idx_student_progress_xp
    ON student_lesson_progress(total_xp DESC);

-- Index for streak queries (active streaks)
CREATE INDEX IF NOT EXISTS idx_student_progress_streak
    ON student_lesson_progress(current_streak DESC);

-- ============================================
-- LEVEL CALCULATION TRIGGER
-- ============================================
-- Auto-updates current_level based on total_xp
-- Formula: level = GREATEST(1, FLOOR(SQRT(total_xp / 100)))
-- This matches the JavaScript getLevelFromXp function in xpManager.ts

CREATE OR REPLACE FUNCTION update_student_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
BEGIN
    -- Calculate level from XP
    -- Uses simplified formula: level = floor(sqrt(total_xp / 100))
    -- Matches the segmented curve from backend/modules/xpManager.ts
    new_level := GREATEST(1, FLOOR(SQRT(NEW.total_xp / 100)));

    -- Cap at max level 100
    NEW.current_level := LEAST(new_level, 100);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS student_level_update ON student_lesson_progress;

-- Create trigger to auto-update level when XP changes
CREATE TRIGGER student_level_update
    BEFORE UPDATE OF total_xp ON student_lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_student_level();

-- ============================================
-- DOCUMENTATION COMMENTS
-- ============================================
COMMENT ON COLUMN student_lesson_progress.total_xp IS 'Total XP earned from practice activities (flashcards, board, lessons)';
COMMENT ON COLUMN student_lesson_progress.current_level IS 'Current level (auto-calculated from total_xp via trigger)';
COMMENT ON COLUMN student_lesson_progress.current_streak IS 'Consecutive days of practice';
COMMENT ON COLUMN student_lesson_progress.longest_streak IS 'Longest streak achieved';
COMMENT ON COLUMN student_lesson_progress.last_practice_date IS 'Date of last practice session (for streak calculation)';
COMMENT ON COLUMN student_lesson_progress.total_practice_sessions IS 'Total number of practice sessions completed';

-- ============================================
-- GRANT EXECUTE PERMISSION
-- ============================================
-- Grant trigger function permission to authenticated users
GRANT EXECUTE ON FUNCTION update_student_level() TO authenticated;
