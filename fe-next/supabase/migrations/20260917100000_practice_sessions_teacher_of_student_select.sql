-- Teachers could read a student's practice_sessions only for lessons the
-- teacher authored. Sessions with no lesson, or on another teacher's lesson,
-- came back as 0 rows with error:null — so the student progress report's
-- practice time / sessions metrics read 0 for most real practice.
--
-- Mirror student_lesson_progress, whose SELECT policy already admits any
-- teacher of a classroom the student belongs to (is_teacher_of_student).
DROP POLICY IF EXISTS rls_practice_sessions_select_public ON public.practice_sessions;

CREATE POLICY rls_practice_sessions_select_public ON public.practice_sessions
  FOR SELECT
  USING (
    (SELECT auth.uid()) = student_id
    OR EXISTS (
      SELECT 1 FROM public.vocabulary_lessons vl
      WHERE vl.id = practice_sessions.lesson_id
        AND vl.teacher_id = (SELECT auth.uid())
    )
    OR public.is_teacher_of_student(student_id)
  );
