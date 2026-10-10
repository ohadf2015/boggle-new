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
import { uniqueWordCount, wordListPracticed } from './wordGoalAssignment';
import { captureAssignmentCompletedServer } from './assignmentEvents';

export interface SatisfiedAssignmentLookup {
  lessonId: string;
  sessionMode: string | null | undefined;
  wordsAttempted?: Record<string, { attempts?: number; correct?: number }> | null;
  extraWords?: readonly string[];
  /** Lesson/list words the student actually found (PATCH vocabulary_words_found). */
  vocabularyWordsFound?: readonly string[];
  /** Pasted word-list homework. When set, completion is coverage of this list — not any-session. */
  goalWords?: readonly string[];
}

export interface SatisfiedAssignment {
  id: string;
  classroomId: string | null;
}

/**
 * The assignment (newest first) that a finished session of this lesson
 * satisfies, or null. Runs alongside the PATCH's streak read so it costs no
 * extra round trip.
 */
export async function findSatisfiedAssignment(
  client: SupabaseClient,
  args: SatisfiedAssignmentLookup,
): Promise<SatisfiedAssignment | null> {
  const { data: assignments, error } = await client
    .from('lesson_assignments')
    .select('id, practice_focus, word_count_target, classroom_id')
    .eq('lesson_id', args.lessonId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('findSatisfiedAssignment: assignment lookup failed', error);
    return null;
  }
  const extra = [
    ...(args.extraWords ?? []),
    ...(args.vocabularyWordsFound ?? []),
  ];
  const found = uniqueWordCount(args.wordsAttempted, extra);
  const match = (assignments ?? []).find((a: {
    id: string;
    practice_focus: string | null;
    word_count_target?: number | null;
    classroom_id?: string | null;
  }) => {
    const target = a.word_count_target;
    if (typeof target === 'number' && target > 0) {
      return found >= target;
    }
    if (args.goalWords && args.goalWords.length > 0) {
      return wordListPracticed(args.goalWords, args.wordsAttempted, extra) >= args.goalWords.length;
    }
    const mode = readAssignmentMode(a);
    return mode !== null && sessionCompletesAssignment(mode, { mode: args.sessionMode });
  });
  if (!match) return null;
  return { id: match.id, classroomId: match.classroom_id ?? null };
}

export async function classroomIdForAssignment(
  client: SupabaseClient,
  assignmentId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('lesson_assignments')
    .select('classroom_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (error) return null;
  return (data as { classroom_id?: string } | null)?.classroom_id ?? null;
}

/** Stamp the student's progress row with the assignment; true on success. */
export async function stampAssignmentCompletion(
  client: SupabaseClient,
  args: {
    studentId: string;
    lessonId: string;
    assignmentId: string;
    now?: string;
    classroomId?: string | null;
  },
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
  captureAssignmentCompletedServer({
    classroom_id: args.classroomId ?? null,
    assignment_id: args.assignmentId,
    student_id: args.studentId,
  });
  return true;
}
