-- =============================================
-- FIX STUDENT CLASSROOM MEMBERSHIP RLS POLICIES
-- Migration: 20260128201418_fix_student_classroom_membership_rls
-- Description: Restores missing student RLS policies for classroom_memberships
--
-- Bug: Migration 057_fix_rls_infinite_recursion.sql dropped ALL policies on
--      classroom_memberships (including student policies), but only recreated
--      teacher policies. The following student policies were dropped but NOT recreated:
--      - "Students can view own memberships" (SELECT)
--      - "Students can join classrooms" (INSERT)
--      - "Students can leave classrooms" (DELETE)
--
-- Impact: Students could not join classrooms because the INSERT policy was missing.
--         RLS blocked all INSERT operations on classroom_memberships for students.
--
-- Solution: Recreate the missing student policies that were defined in migration 056.
-- =============================================

-- =============================================
-- STEP 1: Recreate missing student policies
-- =============================================

-- Students can view their own memberships
-- (Required for students to see which classrooms they belong to)
DROP POLICY IF EXISTS "Students can view own memberships" ON classroom_memberships;
CREATE POLICY "Students can view own memberships"
    ON classroom_memberships FOR SELECT
    USING (auth.uid() = student_id);

-- Students can join classrooms (insert their own membership)
-- (Required for students to join classrooms with a join code)
DROP POLICY IF EXISTS "Students can join classrooms" ON classroom_memberships;
CREATE POLICY "Students can join classrooms"
    ON classroom_memberships FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can leave classrooms (delete their own membership)
-- (Required for students to leave classrooms they joined)
DROP POLICY IF EXISTS "Students can leave classrooms" ON classroom_memberships;
CREATE POLICY "Students can leave classrooms"
    ON classroom_memberships FOR DELETE
    USING (auth.uid() = student_id);

-- =============================================
-- VERIFICATION
-- =============================================
-- After this migration, students should be able to:
-- 1. SELECT their own memberships (auth.uid() = student_id)
-- 2. INSERT new memberships where they are the student (auth.uid() = student_id)
-- 3. DELETE their own memberships (auth.uid() = student_id)
--
-- Test with:
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = 'student-uuid';
-- INSERT INTO classroom_memberships (classroom_id, student_id) VALUES ('classroom-uuid', 'student-uuid');

COMMENT ON POLICY "Students can view own memberships" ON classroom_memberships IS
'Allows students to view their own classroom memberships. Required for student dashboard.';

COMMENT ON POLICY "Students can join classrooms" ON classroom_memberships IS
'Allows students to join classrooms by inserting membership where they are the student.';

COMMENT ON POLICY "Students can leave classrooms" ON classroom_memberships IS
'Allows students to leave classrooms by deleting their own membership.';
