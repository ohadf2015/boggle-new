-- Migration: 20260215200000_award_education_xp.sql
-- Description: Create RPC function for atomic education XP award to student_lesson_progress
-- Dependencies: 062_education_xp_tracking.sql (student_lesson_progress table + trigger)
-- Phase: 45-practice-xp-server-side-wiring

-- ============================================
-- AWARD EDUCATION XP FUNCTION
-- ============================================
-- Atomically awards XP to student_lesson_progress, updates streak tracking,
-- and triggers automatic level recalculation via update_student_level() trigger.
--
-- Used by:
-- - Practice API (app/api/education/practice/route.ts) - with lesson_id
-- - Duel handlers (backend/handlers/duel/realtime.ts, gameplay.ts, disconnection.ts) - without lesson_id (NULL default)
--
-- CRITICAL DESIGN:
-- - p_lesson_id defaults to NULL for backward compatibility with existing duel handler calls
-- - When p_lesson_id IS NOT NULL: updates student_lesson_progress for practice sessions
-- - When p_lesson_id IS NULL: skips student_lesson_progress update (duel XP tracked separately)

CREATE OR REPLACE FUNCTION award_education_xp(
  p_student_id UUID,
  p_xp_amount INTEGER,
  p_lesson_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update student_lesson_progress if lesson_id is provided (practice sessions)
  -- Duel XP is tracked separately and passes NULL for lesson_id
  IF p_lesson_id IS NOT NULL THEN
    -- Upsert student_lesson_progress
    INSERT INTO student_lesson_progress (
      student_id,
      lesson_id,
      total_xp,
      total_practice_sessions,
      last_practice_date
    )
    VALUES (
      p_student_id,
      p_lesson_id,
      p_xp_amount,
      1,
      CURRENT_DATE
    )
    ON CONFLICT (student_id, lesson_id) DO UPDATE
    SET
      total_xp = student_lesson_progress.total_xp + p_xp_amount,
      total_practice_sessions = student_lesson_progress.total_practice_sessions + 1,
      last_practice_date = CURRENT_DATE;

    -- update_student_level() trigger runs automatically on total_xp UPDATE
    -- (from migration 062_education_xp_tracking.sql)
  END IF;
END;
$$;

-- ============================================
-- GRANT EXECUTE PERMISSION
-- ============================================
-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION award_education_xp(UUID, INTEGER, UUID) TO authenticated;

-- ============================================
-- DOCUMENTATION
-- ============================================
COMMENT ON FUNCTION award_education_xp IS 'Awards XP to student for a lesson (practice sessions only). When lesson_id is NULL (duel XP), skips student_lesson_progress update. Automatically recalculates level via trigger.';
