-- Migration: 058_lesson_templates_and_practice.sql
-- Description: Add lesson templates (room settings) and practice sessions for educational mode
-- Dependencies: 056_teacher_vocabulary_builder.sql (vocabulary_lessons table)

-- ============================================
-- LESSON TEMPLATES TABLE
-- ============================================
-- Stores room settings as reusable templates linked to vocabulary lessons

CREATE TABLE IF NOT EXISTS lesson_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),

    -- Room settings
    timer_seconds INTEGER NOT NULL DEFAULT 180 CHECK (timer_seconds >= 30 AND timer_seconds <= 600),
    difficulty TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    min_word_length INTEGER NOT NULL DEFAULT 2 CHECK (min_word_length >= 2 AND min_word_length <= 5),
    allow_late_join BOOLEAN NOT NULL DEFAULT true,

    -- Board settings
    board_rows INTEGER DEFAULT NULL, -- NULL means use difficulty default
    board_cols INTEGER DEFAULT NULL,

    -- Metadata
    is_default BOOLEAN NOT NULL DEFAULT false, -- Mark one template as default per lesson
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lesson_templates
CREATE INDEX IF NOT EXISTS idx_lesson_templates_teacher ON lesson_templates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_templates_lesson ON lesson_templates(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_templates_default ON lesson_templates(lesson_id, is_default) WHERE is_default = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_lesson_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lesson_template_updated_at ON lesson_templates;
CREATE TRIGGER lesson_template_updated_at
    BEFORE UPDATE ON lesson_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_lesson_template_updated_at();

-- ============================================
-- PRACTICE SESSIONS TABLE
-- ============================================
-- Tracks student practice progress across all practice modes

CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    practice_type TEXT NOT NULL CHECK (practice_type IN ('flashcard', 'solo_board', 'warmup', 'word_list')),

    -- Flashcard specific data
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    cards_correct INTEGER NOT NULL DEFAULT 0,

    -- Board practice specific data (solo_board, warmup)
    words_found TEXT[] NOT NULL DEFAULT '{}',
    vocabulary_words_found TEXT[] NOT NULL DEFAULT '{}', -- Specifically vocabulary words
    total_score INTEGER NOT NULL DEFAULT 0,

    -- Common tracking
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for practice_sessions
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_lesson ON practice_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_type ON practice_sessions(lesson_id, practice_type);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_completed ON practice_sessions(student_id, lesson_id) WHERE completed_at IS NOT NULL;

-- ============================================
-- AGGREGATED PRACTICE PROGRESS VIEW
-- ============================================
-- View for quick access to student practice progress per lesson

CREATE OR REPLACE VIEW student_practice_progress AS
SELECT
    ps.student_id,
    ps.lesson_id,

    -- Flashcard stats
    COALESCE(SUM(CASE WHEN ps.practice_type = 'flashcard' THEN ps.cards_reviewed ELSE 0 END), 0) AS total_flashcards_reviewed,
    COALESCE(SUM(CASE WHEN ps.practice_type = 'flashcard' THEN ps.cards_correct ELSE 0 END), 0) AS total_flashcards_correct,

    -- Board practice stats
    COALESCE(SUM(CASE WHEN ps.practice_type IN ('solo_board', 'warmup') THEN ps.total_score ELSE 0 END), 0) AS total_practice_score,
    COALESCE(SUM(CASE WHEN ps.practice_type IN ('solo_board', 'warmup') THEN array_length(ps.vocabulary_words_found, 1) ELSE 0 END), 0) AS total_vocabulary_words_found,

    -- Session counts
    COUNT(*) FILTER (WHERE ps.practice_type = 'flashcard') AS flashcard_sessions,
    COUNT(*) FILTER (WHERE ps.practice_type = 'solo_board') AS solo_board_sessions,
    COUNT(*) FILTER (WHERE ps.practice_type = 'warmup') AS warmup_sessions,
    COUNT(*) FILTER (WHERE ps.practice_type = 'word_list') AS word_list_views,

    -- Total time
    COALESCE(SUM(ps.time_spent_seconds), 0) AS total_practice_time_seconds,

    -- Last activity
    MAX(COALESCE(ps.completed_at, ps.started_at)) AS last_practice_at

FROM practice_sessions ps
GROUP BY ps.student_id, ps.lesson_id;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE lesson_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own templates
DROP POLICY IF EXISTS "Teachers manage own templates" ON lesson_templates;
CREATE POLICY "Teachers manage own templates" ON lesson_templates
    FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Students can view templates for lessons assigned to them
DROP POLICY IF EXISTS "Students view assigned lesson templates" ON lesson_templates;
CREATE POLICY "Students view assigned lesson templates" ON lesson_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lesson_assignments la
            JOIN classroom_memberships cm ON la.classroom_id = cm.classroom_id
            WHERE la.lesson_id = lesson_templates.lesson_id
            AND cm.student_id = auth.uid()
        )
    );

-- Students can manage their own practice sessions
DROP POLICY IF EXISTS "Students manage own practice" ON practice_sessions;
CREATE POLICY "Students manage own practice" ON practice_sessions
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can view practice sessions for their lessons
DROP POLICY IF EXISTS "Teachers view student practice" ON practice_sessions;
CREATE POLICY "Teachers view student practice" ON practice_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons vl
            WHERE vl.id = practice_sessions.lesson_id
            AND vl.teacher_id = auth.uid()
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get or create default template for a lesson
CREATE OR REPLACE FUNCTION get_or_create_default_template(
    p_lesson_id UUID,
    p_teacher_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_template_id UUID;
    v_lesson_name TEXT;
BEGIN
    -- Check if default template exists
    SELECT id INTO v_template_id
    FROM lesson_templates
    WHERE lesson_id = p_lesson_id AND is_default = true
    LIMIT 1;

    IF v_template_id IS NOT NULL THEN
        RETURN v_template_id;
    END IF;

    -- Get lesson name for template name
    SELECT name INTO v_lesson_name
    FROM vocabulary_lessons
    WHERE id = p_lesson_id AND teacher_id = p_teacher_id;

    IF v_lesson_name IS NULL THEN
        RAISE EXCEPTION 'Lesson not found or not owned by teacher';
    END IF;

    -- Create default template
    INSERT INTO lesson_templates (lesson_id, teacher_id, name, is_default)
    VALUES (p_lesson_id, p_teacher_id, v_lesson_name || ' - Default', true)
    RETURNING id INTO v_template_id;

    RETURN v_template_id;
END;
$$;

-- Function to calculate student mastery level for a lesson
CREATE OR REPLACE FUNCTION calculate_lesson_mastery(
    p_student_id UUID,
    p_lesson_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_words INTEGER;
    v_words_found INTEGER;
    v_flashcard_accuracy NUMERIC;
    v_mastery_score NUMERIC;
BEGIN
    -- Get total vocabulary words in lesson
    SELECT COUNT(*) INTO v_total_words
    FROM vocabulary_words
    WHERE lesson_id = p_lesson_id;

    IF v_total_words = 0 THEN
        RETURN 'not_started';
    END IF;

    -- Get distinct vocabulary words found across all practice sessions
    SELECT COUNT(DISTINCT word) INTO v_words_found
    FROM practice_sessions ps,
         LATERAL unnest(ps.vocabulary_words_found) AS word
    WHERE ps.student_id = p_student_id
    AND ps.lesson_id = p_lesson_id;

    -- Get flashcard accuracy
    SELECT
        CASE
            WHEN SUM(cards_reviewed) > 0
            THEN SUM(cards_correct)::NUMERIC / SUM(cards_reviewed)::NUMERIC
            ELSE 0
        END INTO v_flashcard_accuracy
    FROM practice_sessions
    WHERE student_id = p_student_id
    AND lesson_id = p_lesson_id
    AND practice_type = 'flashcard';

    -- Calculate mastery score (weighted: 60% word coverage, 40% flashcard accuracy)
    v_mastery_score := (v_words_found::NUMERIC / v_total_words::NUMERIC * 0.6) +
                       (COALESCE(v_flashcard_accuracy, 0) * 0.4);

    -- Return mastery level
    IF v_mastery_score >= 0.8 THEN
        RETURN 'mastered';
    ELSIF v_mastery_score >= 0.4 THEN
        RETURN 'practicing';
    ELSIF v_mastery_score > 0 THEN
        RETURN 'started';
    ELSE
        RETURN 'not_started';
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_default_template(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_lesson_mastery(UUID, UUID) TO authenticated;
