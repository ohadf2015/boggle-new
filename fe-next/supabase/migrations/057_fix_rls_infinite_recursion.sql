-- =============================================
-- FIX RLS INFINITE RECURSION IN TEACHER TABLES
-- Migration: 057_fix_rls_infinite_recursion
-- Description: Fixes infinite recursion in RLS policies for classrooms and vocabulary_lessons
--
-- Root Cause: The original policies created circular dependencies:
--   - "Students can view their classrooms" queries classroom_memberships
--   - "Teachers can view classroom memberships" queries classrooms
--   This causes PostgreSQL error 42P17 (infinite recursion detected in policy)
--
-- Solution: Use SECURITY DEFINER helper functions that bypass RLS checks
-- =============================================

-- =============================================
-- STEP 1: Drop all affected policies first (before touching functions)
-- =============================================

-- Drop classrooms policies
DROP POLICY IF EXISTS "Students can view their classrooms" ON classrooms;

-- Drop classroom_memberships policies
DROP POLICY IF EXISTS "Teachers can view classroom memberships" ON classroom_memberships;
DROP POLICY IF EXISTS "Teachers can add students to classrooms" ON classroom_memberships;
DROP POLICY IF EXISTS "Teachers can remove students from classrooms" ON classroom_memberships;

-- Drop vocabulary_lessons policies
DROP POLICY IF EXISTS "Students can view assigned lessons" ON vocabulary_lessons;

-- Drop lesson_assignments policies
DROP POLICY IF EXISTS "Teachers can view lesson assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Students can view classroom assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Teachers can create lesson assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Teachers can update lesson assignments" ON lesson_assignments;
DROP POLICY IF EXISTS "Teachers can delete lesson assignments" ON lesson_assignments;

-- Drop student_lesson_progress policies (MUST be before dropping function)
DROP POLICY IF EXISTS "Teachers can view student progress" ON student_lesson_progress;

-- =============================================
-- STEP 2: Create/Update SECURITY DEFINER helper functions
-- =============================================

-- Check if user is a member of a specific classroom (for students)
CREATE OR REPLACE FUNCTION is_classroom_member(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM classroom_memberships
        WHERE classroom_id = p_classroom_id
        AND student_id = p_user_id
    );
$$;

COMMENT ON FUNCTION is_classroom_member IS 'Checks if a user is a member of a classroom (SECURITY DEFINER to avoid RLS recursion)';

-- Check if user owns a specific classroom (for teachers)
CREATE OR REPLACE FUNCTION is_classroom_owner(p_classroom_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM classrooms
        WHERE id = p_classroom_id
        AND teacher_id = p_user_id
    );
$$;

COMMENT ON FUNCTION is_classroom_owner IS 'Checks if a user owns a classroom (SECURITY DEFINER to avoid RLS recursion)';

-- Check if user owns a specific lesson (for teachers)
CREATE OR REPLACE FUNCTION is_lesson_owner(p_lesson_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM vocabulary_lessons
        WHERE id = p_lesson_id
        AND teacher_id = p_user_id
    );
$$;

COMMENT ON FUNCTION is_lesson_owner IS 'Checks if a user owns a lesson (SECURITY DEFINER to avoid RLS recursion)';

-- Check if user has access to a lesson (as student via classroom assignment)
CREATE OR REPLACE FUNCTION has_lesson_access(p_lesson_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM lesson_assignments la
        JOIN classroom_memberships cm ON cm.classroom_id = la.classroom_id
        WHERE la.lesson_id = p_lesson_id
        AND cm.student_id = p_user_id
    );
$$;

COMMENT ON FUNCTION has_lesson_access IS 'Checks if a user has access to a lesson via classroom assignment (SECURITY DEFINER to avoid RLS recursion)';

-- Update is_teacher_of_student with proper search_path
CREATE OR REPLACE FUNCTION is_teacher_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM classroom_memberships cm
        JOIN classrooms c ON c.id = cm.classroom_id
        WHERE cm.student_id = p_student_id
        AND c.teacher_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION is_teacher_of_student IS 'Checks if current user is a teacher of the specified student via classroom membership (SECURITY DEFINER to avoid RLS recursion)';

-- =============================================
-- STEP 3: Recreate all policies with SECURITY DEFINER functions
-- =============================================

-- CLASSROOMS POLICIES
CREATE POLICY "Students can view their classrooms"
    ON classrooms FOR SELECT
    USING (is_classroom_member(id, auth.uid()));

-- CLASSROOM_MEMBERSHIPS POLICIES
CREATE POLICY "Teachers can view classroom memberships"
    ON classroom_memberships FOR SELECT
    USING (is_classroom_owner(classroom_id, auth.uid()));

CREATE POLICY "Teachers can add students to classrooms"
    ON classroom_memberships FOR INSERT
    WITH CHECK (is_classroom_owner(classroom_id, auth.uid()));

CREATE POLICY "Teachers can remove students from classrooms"
    ON classroom_memberships FOR DELETE
    USING (is_classroom_owner(classroom_id, auth.uid()));

-- VOCABULARY_LESSONS POLICIES
CREATE POLICY "Students can view assigned lessons"
    ON vocabulary_lessons FOR SELECT
    USING (has_lesson_access(id, auth.uid()));

-- LESSON_ASSIGNMENTS POLICIES
CREATE POLICY "Teachers can view lesson assignments"
    ON lesson_assignments FOR SELECT
    USING (is_lesson_owner(lesson_id, auth.uid()));

CREATE POLICY "Students can view classroom assignments"
    ON lesson_assignments FOR SELECT
    USING (is_classroom_member(classroom_id, auth.uid()));

CREATE POLICY "Teachers can create lesson assignments"
    ON lesson_assignments FOR INSERT
    WITH CHECK (is_lesson_owner(lesson_id, auth.uid()));

CREATE POLICY "Teachers can update lesson assignments"
    ON lesson_assignments FOR UPDATE
    USING (is_lesson_owner(lesson_id, auth.uid()))
    WITH CHECK (is_lesson_owner(lesson_id, auth.uid()));

CREATE POLICY "Teachers can delete lesson assignments"
    ON lesson_assignments FOR DELETE
    USING (is_lesson_owner(lesson_id, auth.uid()));

-- STUDENT_LESSON_PROGRESS POLICIES
CREATE POLICY "Teachers can view student progress"
    ON student_lesson_progress FOR SELECT
    USING (is_teacher_of_student(student_id));
