/**
 * Stamp a finished practice session onto the assignment it satisfies.
 *
 * The teacher's assignment tracking (`getClassroomAssignments` /
 * `getAssignmentCompletions`) counts `student_lesson_progress` rows with
 * `assignment_id` + `completed_at` set — and before this, nothing ever wrote
 * either column (11 rows in prod, 0 with an assignment). Called from the
 * practice PATCH completion path with the student's own client: the
 * `lesson_assignments` SELECT policy already limits rows to classrooms the
 * student belongs to, and the student may upsert their own progress row.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { readAssignmentMode, sessionCompletesAssignment } from './wordcraftAssignment';

/**
 * The assignment (newest first) that a finished session of this lesson
 * satisfies, or null. Runs alongside the PATCH's streak read so it costs no
 * extra round trip.
 */
export async function findSatisfiedAssignment(
  client: SupabaseClient,
  args: { lessonId: string; sessionMode: string | null | undefined },
): Promise<string | null> {
  const { data: assignments, error } = await client
    .from('lesson_assignments')
    .select('id, practice_focus')
    .eq('lesson_id', args.lessonId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('findSatisfiedAssignment: assignment lookup failed', error);
    return null;
  }
  const match = (assignments ?? []).find((a: { id: string; practice_focus: string | null }) => {
    const mode = readAssignmentMode(a);
    return mode !== null && sessionCompletesAssignment(mode, { mode: args.sessionMode });
  });
  return match?.id ?? null;
}

/** Stamp the student's progress row with the assignment; true on success. */
export async function stampAssignmentCompletion(
  client: SupabaseClient,
  args: { studentId: string; lessonId: string; assignmentId: string; now?: string },
): Promise<boolean> {
  const { error } = await client.from('student_lesson_progress').upsert(
    {
      student_id: args.studentId,
      lesson_id: args.lessonId,
      assignment_id: args.assignmentId,
      completed_at: args.now ?? new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' },
  );
  if (error) {
    logger.error('stampAssignmentCompletion: progress upsert failed', error);
    return false;
  }
  return true;
}
