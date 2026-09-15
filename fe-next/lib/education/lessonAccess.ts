import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * "Is this lesson mine to practise" — shared by every route that must answer
 * that question. `lesson_assignments` is metadata (due date, pinned focus),
 * never the gate: a lesson sitting in a classroom the student belongs to is
 * practisable whether or not a teacher ever created an assignment row for it.
 *
 * Must be called with the SERVICE-ROLE client. The `vocabulary_lessons` RLS
 * SELECT policy for a student is assignment-shaped (`has_lesson_access`), so
 * reading with the student's own session returns zero rows / `error: null`
 * for exactly the lessons this function needs to see — the quiet RLS failure
 * this repo keeps getting bitten by. See app/api/education/practice/lessons/route.ts.
 */

/** Classroom ids a student belongs to. */
export async function getStudentClassroomIds(
  admin: SupabaseClient,
  studentId: string
): Promise<string[]> {
  const { data } = await admin
    .from('classroom_memberships')
    .select('classroom_id')
    .eq('student_id', studentId);

  return (data ?? [])
    .map((m: { classroom_id: string | null }) => m.classroom_id)
    .filter((id: string | null): id is string => !!id);
}

/**
 * True if the student owns the lesson (teacher practising their own
 * material), belongs to the classroom the lesson lives in, or belongs to a
 * classroom the lesson was assigned into. False for a missing lesson or a
 * student outside all of those.
 */
export async function canStudentPracticeLesson(
  admin: SupabaseClient,
  studentId: string,
  lessonId: string
): Promise<boolean> {
  const { data: lesson } = await admin
    .from('vocabulary_lessons')
    .select('teacher_id, classroom_id')
    .eq('id', lessonId)
    .single();

  if (!lesson) return false;
  if (lesson.teacher_id === studentId) return true;

  const classroomIds = await getStudentClassroomIds(admin, studentId);
  if (classroomIds.length === 0) return false;
  if (lesson.classroom_id && classroomIds.includes(lesson.classroom_id)) return true;

  // A lesson assigned into one of my classrooms (not its home one) — the
  // lesson list route shows these, so starting one must not 403.
  const { data: assigned } = await admin
    .from('lesson_assignments')
    .select('lesson_id')
    .eq('lesson_id', lessonId)
    .in('classroom_id', classroomIds)
    .limit(1);
  return (assigned ?? []).length > 0;
}
