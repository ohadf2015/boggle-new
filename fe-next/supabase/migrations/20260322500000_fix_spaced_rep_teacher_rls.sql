-- Fix teacher RLS policy on word_review_state
-- The original policy only checked vl.teacher_id = auth.uid() without verifying
-- the student is actually in the teacher's classroom via classroom_memberships.

DROP POLICY IF EXISTS "Teachers can view student review data" ON word_review_state;

CREATE POLICY "Teachers can read review data for their classroom students"
  ON word_review_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_lessons vl
      JOIN classroom_memberships cm ON cm.classroom_id = vl.classroom_id
      WHERE vl.id = word_review_state.lesson_id
        AND vl.teacher_id = auth.uid()
        AND cm.student_id = word_review_state.student_id
    )
  );
