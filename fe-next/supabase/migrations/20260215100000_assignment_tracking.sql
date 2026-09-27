-- Migration: 20260215100000_assignment_tracking.sql
-- Description: Assignment tracking for teacher assignments with completion tracking
-- Dependencies: 056_teacher_vocabulary_builder.sql (classrooms, vocabulary_lessons, profiles)
-- Phase: 42-teacher-dashboard-workflows
-- Purpose: Foundation for teacher assignment features and student completion tracking

-- ============================================
-- TEACHER ASSIGNMENTS TABLE
-- ============================================
-- Tracks practice and duel assignments created by teachers
-- Links lessons to classrooms with due dates and optional instructions

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id),
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'practice' CHECK (assignment_type IN ('practice', 'duel')),
    due_date TIMESTAMPTZ,
    title TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(classroom_id, lesson_id, assignment_type)
);

COMMENT ON TABLE teacher_assignments IS 'Teacher-created assignments linking lessons to classrooms';
COMMENT ON COLUMN teacher_assignments.classroom_id IS 'Classroom receiving the assignment';
COMMENT ON COLUMN teacher_assignments.lesson_id IS 'Vocabulary lesson to practice';
COMMENT ON COLUMN teacher_assignments.teacher_id IS 'Teacher who created the assignment';
COMMENT ON COLUMN teacher_assignments.assignment_type IS 'practice (solo) or duel (multiplayer challenge)';
COMMENT ON COLUMN teacher_assignments.due_date IS 'Optional deadline (NULL = no deadline)';
COMMENT ON COLUMN teacher_assignments.title IS 'Optional custom title (NULL = auto-generated from lesson name)';
COMMENT ON COLUMN teacher_assignments.instructions IS 'Optional teacher notes/instructions';
COMMENT ON COLUMN teacher_assignments.created_at IS 'When assignment was created';
COMMENT ON COLUMN teacher_assignments.updated_at IS 'Last update timestamp';

-- ============================================
-- ASSIGNMENT COMPLETIONS TABLE
-- ============================================
-- Tracks student completion of teacher assignments
-- One record per student per assignment

CREATE TABLE IF NOT EXISTS assignment_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES teacher_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score INTEGER DEFAULT 0,
    accuracy NUMERIC(5,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    UNIQUE(assignment_id, student_id)
);

COMMENT ON TABLE assignment_completions IS 'Student completion records for teacher assignments';
COMMENT ON COLUMN assignment_completions.assignment_id IS 'Foreign key to teacher_assignments';
COMMENT ON COLUMN assignment_completions.student_id IS 'Student who completed the assignment';
COMMENT ON COLUMN assignment_completions.completed_at IS 'When student completed the assignment';
COMMENT ON COLUMN assignment_completions.score IS 'Score achieved';
COMMENT ON COLUMN assignment_completions.accuracy IS 'Percentage accuracy (0.00 - 100.00)';
COMMENT ON COLUMN assignment_completions.time_spent_seconds IS 'Time spent in seconds';

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEACHER_ASSIGNMENTS POLICIES
-- ============================================

-- Teachers can read assignments for their classrooms (via vocabulary_lessons.teacher_id)
CREATE POLICY "Teachers can read their assignments"
    ON teacher_assignments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons vl
            WHERE vl.id = teacher_assignments.lesson_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- Teachers can create assignments for their lessons
CREATE POLICY "Teachers can create assignments"
    ON teacher_assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = teacher_id
        AND EXISTS (
            SELECT 1 FROM vocabulary_lessons vl
            WHERE vl.id = teacher_assignments.lesson_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- Teachers can update their assignments
CREATE POLICY "Teachers can update their assignments"
    ON teacher_assignments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons vl
            WHERE vl.id = teacher_assignments.lesson_id
            AND vl.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons vl
            WHERE vl.id = teacher_assignments.lesson_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- Teachers can delete their assignments
CREATE POLICY "Teachers can delete their assignments"
    ON teacher_assignments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons vl
            WHERE vl.id = teacher_assignments.lesson_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- Students can view assignments for their classrooms
CREATE POLICY "Students can view classroom assignments"
    ON teacher_assignments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships cm
            WHERE cm.classroom_id = teacher_assignments.classroom_id
            AND cm.student_id = auth.uid()
        )
    );

-- ============================================
-- ASSIGNMENT_COMPLETIONS POLICIES
-- ============================================

-- Students can view their own completions
CREATE POLICY "Students can view own completions"
    ON assignment_completions FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Students can insert their own completions
CREATE POLICY "Students can insert own completions"
    ON assignment_completions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own completions
CREATE POLICY "Students can update own completions"
    ON assignment_completions FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can view completions for their assignments
CREATE POLICY "Teachers can view assignment completions"
    ON assignment_completions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM teacher_assignments ta
            JOIN vocabulary_lessons vl ON vl.id = ta.lesson_id
            WHERE ta.id = assignment_completions.assignment_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- teacher_assignments indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_classroom
    ON teacher_assignments(classroom_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_lesson
    ON teacher_assignments(lesson_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher
    ON teacher_assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_due_date
    ON teacher_assignments(due_date)
    WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_classroom_created
    ON teacher_assignments(classroom_id, created_at DESC);

-- assignment_completions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_completions_assignment
    ON assignment_completions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_completions_student
    ON assignment_completions(student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_completions_student_completed
    ON assignment_completions(student_id, completed_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
-- Auto-updates updated_at timestamp for teacher_assignments

CREATE OR REPLACE FUNCTION update_teacher_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teacher_assignment_updated_at
    BEFORE UPDATE ON teacher_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_teacher_assignment_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON teacher_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON assignment_completions TO authenticated;
GRANT EXECUTE ON FUNCTION update_teacher_assignment_updated_at() TO authenticated;
