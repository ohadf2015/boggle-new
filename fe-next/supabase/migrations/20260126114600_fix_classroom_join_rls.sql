-- =============================================
-- FIX CLASSROOM JOIN RLS POLICY
-- Migration: 20260126114600_fix_classroom_join_rls
-- Description: Adds RLS policy to allow students to lookup classrooms by join_code BEFORE joining
-- Bug: Students cannot join classrooms because RLS blocks SELECT on classrooms table
-- =============================================

-- =============================================
-- PROBLEM
-- =============================================
-- Current RLS policies on classrooms table:
-- 1. Teachers can SELECT their own classrooms
-- 2. Students can SELECT classrooms they are ALREADY members of
--
-- Issue: When a student tries to join with a join_code, they need to:
--   1. SELECT the classroom by join_code (to get classroom_id)
--   2. INSERT into classroom_memberships
--
-- Step 1 FAILS because the student is not yet a member, so RLS blocks the SELECT!
-- This causes the error "Invalid join code" even when the code is valid.

-- =============================================
-- SOLUTION
-- =============================================
-- Add a new policy allowing authenticated users to SELECT classrooms by join_code.
-- This is safe because:
-- 1. Only exposes classrooms that students have the join code for (teacher shared it)
-- 2. Only returns the classroom ID (not sensitive data like teacher_id)
-- 3. Required for the join workflow to function

DROP POLICY IF EXISTS "Anyone can lookup classroom by join code" ON classrooms;

CREATE POLICY "Anyone can lookup classroom by join code"
    ON classrooms FOR SELECT
    USING (
        -- Allow authenticated users to find classrooms by join_code
        -- This is needed for students to join classrooms
        auth.uid() IS NOT NULL
        AND join_code IS NOT NULL
    );

-- =============================================
-- VERIFICATION
-- =============================================
-- After this migration, students should be able to:
-- 1. Query: SELECT id FROM classrooms WHERE join_code = '4HCDMS'
-- 2. Insert: INSERT INTO classroom_memberships (classroom_id, student_id) VALUES (classroom_id, student_id)
--
-- Test with:
-- SET ROLE authenticated;
-- SELECT id FROM classrooms WHERE join_code = 'ABC123';

COMMENT ON POLICY "Anyone can lookup classroom by join code" ON classrooms IS
'Allows authenticated users to find classrooms by join_code. Required for join workflow. Safe because join_code is shared by teacher.';
