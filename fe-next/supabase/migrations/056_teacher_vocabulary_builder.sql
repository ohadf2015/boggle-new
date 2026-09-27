-- =============================================
-- TEACHER VOCABULARY BUILDER TABLES
-- Migration: 056_teacher_vocabulary_builder
-- Description: Creates tables for teacher-created classrooms, vocabulary lessons, and student progress tracking
-- =============================================

-- =============================================
-- USER ROLE ENUM
-- Extends profiles table with role-based access control
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
    END IF;
END $$;

-- Add user_role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_role user_role DEFAULT 'student';

-- Migrate existing is_admin to user_role='admin'
UPDATE profiles
SET user_role = 'admin'
WHERE is_admin = true AND user_role = 'student';

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);

COMMENT ON COLUMN profiles.user_role IS 'User role: student, teacher, or admin';

-- =============================================
-- CLASSROOMS TABLE
-- Stores teacher-created classrooms with unique join codes
-- =============================================
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 100),
    join_code TEXT UNIQUE NOT NULL CHECK (LENGTH(join_code) = 6),
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE classrooms IS 'Teacher-created classrooms with unique join codes for student access';
COMMENT ON COLUMN classrooms.teacher_id IS 'Foreign key to auth.users - the teacher who created this classroom';
COMMENT ON COLUMN classrooms.name IS 'Display name for the classroom (max 100 characters)';
COMMENT ON COLUMN classrooms.join_code IS 'Unique 6-character alphanumeric code for students to join';
COMMENT ON COLUMN classrooms.language IS 'Primary language for classroom (en, he, sv, ja)';

-- =============================================
-- CLASSROOM MEMBERSHIPS TABLE
-- Tracks which students belong to which classrooms
-- =============================================
CREATE TABLE IF NOT EXISTS classroom_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(classroom_id, student_id)
);

-- Add comments for documentation
COMMENT ON TABLE classroom_memberships IS 'Many-to-many relationship between classrooms and students';
COMMENT ON COLUMN classroom_memberships.classroom_id IS 'Foreign key to classrooms';
COMMENT ON COLUMN classroom_memberships.student_id IS 'Foreign key to auth.users - the student member';
COMMENT ON COLUMN classroom_memberships.joined_at IS 'Timestamp when student joined the classroom';

-- =============================================
-- VOCABULARY LESSONS TABLE
-- Stores teacher-created word lists with integration flags
-- =============================================
CREATE TABLE IF NOT EXISTS vocabulary_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    name TEXT NOT NULL CHECK (LENGTH(name) <= 100),
    description TEXT CHECK (description IS NULL OR LENGTH(description) <= 500),
    language TEXT NOT NULL DEFAULT 'en',
    words JSONB NOT NULL DEFAULT '[]',
    is_public BOOLEAN DEFAULT FALSE,
    source_game_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE vocabulary_lessons IS 'Teacher-created vocabulary lessons with word lists and definitions';
COMMENT ON COLUMN vocabulary_lessons.teacher_id IS 'Foreign key to auth.users - the teacher who created this lesson';
COMMENT ON COLUMN vocabulary_lessons.classroom_id IS 'Optional foreign key to classrooms - lesson can exist without classroom';
COMMENT ON COLUMN vocabulary_lessons.name IS 'Display name for the lesson (max 100 characters)';
COMMENT ON COLUMN vocabulary_lessons.description IS 'Optional description (max 500 characters)';
COMMENT ON COLUMN vocabulary_lessons.language IS 'Language of the words (en, he, sv, ja)';
COMMENT ON COLUMN vocabulary_lessons.words IS 'Array of {word, definition?, canIntegrate} objects';
COMMENT ON COLUMN vocabulary_lessons.is_public IS 'Whether other teachers can view/copy this lesson';
COMMENT ON COLUMN vocabulary_lessons.source_game_code IS 'Optional game code if lesson was created from a game session';

-- =============================================
-- LESSON ASSIGNMENTS TABLE
-- Links lessons to classrooms with optional due dates
-- =============================================
CREATE TABLE IF NOT EXISTS lesson_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id, classroom_id)
);

-- Add comments for documentation
COMMENT ON TABLE lesson_assignments IS 'Assigns vocabulary lessons to specific classrooms';
COMMENT ON COLUMN lesson_assignments.lesson_id IS 'Foreign key to vocabulary_lessons';
COMMENT ON COLUMN lesson_assignments.classroom_id IS 'Foreign key to classrooms';
COMMENT ON COLUMN lesson_assignments.due_date IS 'Optional deadline for lesson completion';

-- =============================================
-- STUDENT LESSON PROGRESS TABLE
-- Tracks student attempts and mastery of lesson words
-- =============================================
CREATE TABLE IF NOT EXISTS student_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vocabulary_lessons(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES lesson_assignments(id) ON DELETE SET NULL,
    words_attempted JSONB DEFAULT '{}',
    words_mastered TEXT[] DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(student_id, lesson_id)
);

-- Add comments for documentation
COMMENT ON TABLE student_lesson_progress IS 'Tracks individual student progress on vocabulary lessons';
COMMENT ON COLUMN student_lesson_progress.student_id IS 'Foreign key to auth.users - the student';
COMMENT ON COLUMN student_lesson_progress.lesson_id IS 'Foreign key to vocabulary_lessons';
COMMENT ON COLUMN student_lesson_progress.assignment_id IS 'Optional foreign key to lesson_assignments if from classroom assignment';
COMMENT ON COLUMN student_lesson_progress.words_attempted IS 'Map of word -> {attempts, correct, lastAttemptAt}';
COMMENT ON COLUMN student_lesson_progress.words_mastered IS 'Array of words the student has mastered';
COMMENT ON COLUMN student_lesson_progress.started_at IS 'When student first started the lesson';
COMMENT ON COLUMN student_lesson_progress.completed_at IS 'When student completed the lesson (all words mastered)';

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Classrooms indexes
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id
    ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code
    ON classrooms(join_code);

-- Classroom memberships indexes
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_classroom_id
    ON classroom_memberships(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_student_id
    ON classroom_memberships(student_id);

-- Vocabulary lessons indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_lessons_teacher_id
    ON vocabulary_lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_lessons_classroom_id
    ON vocabulary_lessons(classroom_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_lessons_is_public
    ON vocabulary_lessons(is_public) WHERE is_public = TRUE;

-- Lesson assignments indexes
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson_id
    ON lesson_assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_classroom_id
    ON lesson_assignments(classroom_id);

-- Student lesson progress indexes
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_student_id
    ON student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_lesson_id
    ON student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_assignment_id
    ON student_lesson_progress(assignment_id);

-- =============================================
-- UPDATED_AT TRIGGERS
-- Auto-updates updated_at timestamp on row changes
-- =============================================
CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_lessons_updated_at
    BEFORE UPDATE ON vocabulary_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate 6-character alphanumeric join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars (I, O, 0, 1)
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    RETURN result;
END;
$$;

COMMENT ON FUNCTION generate_join_code IS 'Generates a random 6-character alphanumeric join code (excludes confusing characters)';

-- Function to auto-generate join code on classroom insert
CREATE OR REPLACE FUNCTION auto_generate_join_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
        -- Keep trying until we get a unique code
        LOOP
            NEW.join_code := generate_join_code();
            -- Check if code is unique
            IF NOT EXISTS (SELECT 1 FROM classrooms WHERE join_code = NEW.join_code) THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_join_code
    BEFORE INSERT ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_join_code();

-- Function to check if current user is teacher of a student (via classroom membership)
CREATE OR REPLACE FUNCTION is_teacher_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM classroom_memberships cm
        JOIN classrooms c ON c.id = cm.classroom_id
        WHERE cm.student_id = p_student_id
        AND c.teacher_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION is_teacher_of_student IS 'Checks if current user is a teacher of the specified student via classroom membership';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLASSROOMS POLICIES
-- =============================================

-- Teachers can view their own classrooms
DROP POLICY IF EXISTS "Teachers can view own classrooms" ON classrooms;
CREATE POLICY "Teachers can view own classrooms"
    ON classrooms FOR SELECT
    USING (auth.uid() = teacher_id);

-- Students can view classrooms they are members of
DROP POLICY IF EXISTS "Students can view their classrooms" ON classrooms;
CREATE POLICY "Students can view their classrooms"
    ON classrooms FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships
            WHERE classroom_id = classrooms.id
            AND student_id = auth.uid()
        )
    );

-- Teachers can create classrooms (must be a teacher)
DROP POLICY IF EXISTS "Teachers can create classrooms" ON classrooms;
CREATE POLICY "Teachers can create classrooms"
    ON classrooms FOR INSERT
    WITH CHECK (
        auth.uid() = teacher_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role IN ('teacher', 'admin')
        )
    );

-- Teachers can update their own classrooms
DROP POLICY IF EXISTS "Teachers can update own classrooms" ON classrooms;
CREATE POLICY "Teachers can update own classrooms"
    ON classrooms FOR UPDATE
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete their own classrooms
DROP POLICY IF EXISTS "Teachers can delete own classrooms" ON classrooms;
CREATE POLICY "Teachers can delete own classrooms"
    ON classrooms FOR DELETE
    USING (auth.uid() = teacher_id);

-- =============================================
-- CLASSROOM MEMBERSHIPS POLICIES
-- =============================================

-- Teachers can view memberships of their classrooms
DROP POLICY IF EXISTS "Teachers can view classroom memberships" ON classroom_memberships;
CREATE POLICY "Teachers can view classroom memberships"
    ON classroom_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM classrooms
            WHERE id = classroom_memberships.classroom_id
            AND teacher_id = auth.uid()
        )
    );

-- Students can view their own memberships
DROP POLICY IF EXISTS "Students can view own memberships" ON classroom_memberships;
CREATE POLICY "Students can view own memberships"
    ON classroom_memberships FOR SELECT
    USING (auth.uid() = student_id);

-- Students can join classrooms (insert their own membership)
DROP POLICY IF EXISTS "Students can join classrooms" ON classroom_memberships;
CREATE POLICY "Students can join classrooms"
    ON classroom_memberships FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Teachers can add students to their classrooms
DROP POLICY IF EXISTS "Teachers can add students to classrooms" ON classroom_memberships;
CREATE POLICY "Teachers can add students to classrooms"
    ON classroom_memberships FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classrooms
            WHERE id = classroom_memberships.classroom_id
            AND teacher_id = auth.uid()
        )
    );

-- Students can leave classrooms (delete their own membership)
DROP POLICY IF EXISTS "Students can leave classrooms" ON classroom_memberships;
CREATE POLICY "Students can leave classrooms"
    ON classroom_memberships FOR DELETE
    USING (auth.uid() = student_id);

-- Teachers can remove students from their classrooms
DROP POLICY IF EXISTS "Teachers can remove students from classrooms" ON classroom_memberships;
CREATE POLICY "Teachers can remove students from classrooms"
    ON classroom_memberships FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM classrooms
            WHERE id = classroom_memberships.classroom_id
            AND teacher_id = auth.uid()
        )
    );

-- =============================================
-- VOCABULARY LESSONS POLICIES
-- =============================================

-- Teachers can view their own lessons
DROP POLICY IF EXISTS "Teachers can view own lessons" ON vocabulary_lessons;
CREATE POLICY "Teachers can view own lessons"
    ON vocabulary_lessons FOR SELECT
    USING (auth.uid() = teacher_id);

-- Students can view lessons assigned to their classrooms
DROP POLICY IF EXISTS "Students can view assigned lessons" ON vocabulary_lessons;
CREATE POLICY "Students can view assigned lessons"
    ON vocabulary_lessons FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lesson_assignments la
            JOIN classroom_memberships cm ON cm.classroom_id = la.classroom_id
            WHERE la.lesson_id = vocabulary_lessons.id
            AND cm.student_id = auth.uid()
        )
    );

-- Anyone can view public lessons
DROP POLICY IF EXISTS "Public lessons are viewable by all" ON vocabulary_lessons;
CREATE POLICY "Public lessons are viewable by all"
    ON vocabulary_lessons FOR SELECT
    USING (is_public = TRUE);

-- Teachers can create lessons (must be a teacher)
DROP POLICY IF EXISTS "Teachers can create lessons" ON vocabulary_lessons;
CREATE POLICY "Teachers can create lessons"
    ON vocabulary_lessons FOR INSERT
    WITH CHECK (
        auth.uid() = teacher_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role IN ('teacher', 'admin')
        )
    );

-- Teachers can update their own lessons
DROP POLICY IF EXISTS "Teachers can update own lessons" ON vocabulary_lessons;
CREATE POLICY "Teachers can update own lessons"
    ON vocabulary_lessons FOR UPDATE
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Teachers can delete their own lessons
DROP POLICY IF EXISTS "Teachers can delete own lessons" ON vocabulary_lessons;
CREATE POLICY "Teachers can delete own lessons"
    ON vocabulary_lessons FOR DELETE
    USING (auth.uid() = teacher_id);

-- =============================================
-- LESSON ASSIGNMENTS POLICIES
-- =============================================

-- Teachers can view assignments for their lessons
DROP POLICY IF EXISTS "Teachers can view lesson assignments" ON lesson_assignments;
CREATE POLICY "Teachers can view lesson assignments"
    ON lesson_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons
            WHERE id = lesson_assignments.lesson_id
            AND teacher_id = auth.uid()
        )
    );

-- Students can view assignments for their classrooms
DROP POLICY IF EXISTS "Students can view classroom assignments" ON lesson_assignments;
CREATE POLICY "Students can view classroom assignments"
    ON lesson_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM classroom_memberships
            WHERE classroom_id = lesson_assignments.classroom_id
            AND student_id = auth.uid()
        )
    );

-- Teachers can create assignments for their lessons
DROP POLICY IF EXISTS "Teachers can create lesson assignments" ON lesson_assignments;
CREATE POLICY "Teachers can create lesson assignments"
    ON lesson_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons
            WHERE id = lesson_assignments.lesson_id
            AND teacher_id = auth.uid()
        )
    );

-- Teachers can update assignments for their lessons
DROP POLICY IF EXISTS "Teachers can update lesson assignments" ON lesson_assignments;
CREATE POLICY "Teachers can update lesson assignments"
    ON lesson_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons
            WHERE id = lesson_assignments.lesson_id
            AND teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons
            WHERE id = lesson_assignments.lesson_id
            AND teacher_id = auth.uid()
        )
    );

-- Teachers can delete assignments for their lessons
DROP POLICY IF EXISTS "Teachers can delete lesson assignments" ON lesson_assignments;
CREATE POLICY "Teachers can delete lesson assignments"
    ON lesson_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM vocabulary_lessons
            WHERE id = lesson_assignments.lesson_id
            AND teacher_id = auth.uid()
        )
    );

-- =============================================
-- STUDENT LESSON PROGRESS POLICIES
-- =============================================

-- Students can view their own progress
DROP POLICY IF EXISTS "Students can view own progress" ON student_lesson_progress;
CREATE POLICY "Students can view own progress"
    ON student_lesson_progress FOR SELECT
    USING (auth.uid() = student_id);

-- Teachers can view progress of students in their classrooms
DROP POLICY IF EXISTS "Teachers can view student progress" ON student_lesson_progress;
CREATE POLICY "Teachers can view student progress"
    ON student_lesson_progress FOR SELECT
    USING (is_teacher_of_student(student_id));

-- Students can create their own progress records
DROP POLICY IF EXISTS "Students can create own progress" ON student_lesson_progress;
CREATE POLICY "Students can create own progress"
    ON student_lesson_progress FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own progress
DROP POLICY IF EXISTS "Students can update own progress" ON student_lesson_progress;
CREATE POLICY "Students can update own progress"
    ON student_lesson_progress FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Students can delete their own progress
DROP POLICY IF EXISTS "Students can delete own progress" ON student_lesson_progress;
CREATE POLICY "Students can delete own progress"
    ON student_lesson_progress FOR DELETE
    USING (auth.uid() = student_id);
