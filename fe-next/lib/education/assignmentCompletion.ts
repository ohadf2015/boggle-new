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
import { captureAssignmentCompletedServer, captureAssignmentStartedServer } from './assignmentEvents.server';

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

/**
 * The newest assignment on a lesson, or null. The `lesson_assignments` SELECT
 * policy already limits rows to classrooms the student belongs to, so no
 * membership filter is needed here (same policy findSatisfiedAssignment relies
 * on). Used at session START, before any completion criteria can be scored.
 */
export async function findAssignmentForLesson(
  client: SupabaseClient,
  lessonId: string,
): Promise<SatisfiedAssignment | null> {
  const { data, error } = await client
    .from('lesson_assignments')
    .select('id, classroom_id')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) {
    logger.error('findAssignmentForLesson: assignment lookup failed', error);
    return null;
  }
  const row = (data ?? [])[0] as { id: string; classroom_id?: string | null } | undefined;
  return row ? { id: row.id, classroomId: row.classroom_id ?? null } : null;
}

/**
 * Record that the student STARTED an assignment: a `student_lesson_progress`
 * row with `assignment_id` + `started_at` and `completed_at` still null. That
 * row is what the student hub derives status 'started' from (resume card) and
 * what the teacher matrix reads as "started, not finished" — the same store
 * stampAssignmentCompletion finishes, not a parallel one.
 *
 * `assignment_started` fires only when this call actually stamps the start:
 * an existing row (already started, or finished) stays silent, so the funnel
 * counts each student once per lesson.
 */
export async function stampAssignmentStarted(
  client: SupabaseClient,
  args: {
    studentId: string;
    lessonId: string;
    assignmentId: string;
    classroomId?: string | null;
    now?: string;
  },
): Promise<boolean> {
  const { data: existing, error: readError } = await client
    .from('student_lesson_progress')
    .select('assignment_id, completed_at')
    .eq('student_id', args.studentId)
    .eq('lesson_id', args.lessonId)
    .maybeSingle();
  if (readError) {
    logger.error('stampAssignmentStarted: progress read failed', readError);
    return false;
  }
  if (existing) {
    const row = existing as { assignment_id: string | null; completed_at: string | null };
    // Already stamped for an assignment, or already finished — nothing to do.
    if (row.assignment_id || row.completed_at) return false;
    // Legacy row (free practice before the assignment existed): adopt it so
    // the teacher sees the start.
    const { error } = await client
      .from('student_lesson_progress')
      .update({ assignment_id: args.assignmentId })
      .eq('student_id', args.studentId)
      .eq('lesson_id', args.lessonId);
    if (error) {
      logger.error('stampAssignmentStarted: progress update failed', error);
      return false;
    }
  } else {
    const { error } = await client.from('student_lesson_progress').insert({
      student_id: args.studentId,
      lesson_id: args.lessonId,
      assignment_id: args.assignmentId,
      started_at: args.now ?? new Date().toISOString(),
    });
    if (error) {
      logger.error('stampAssignmentStarted: progress insert failed', error);
      return false;
    }
  }
  captureAssignmentStartedServer({
    classroom_id: args.classroomId ?? null,
    assignment_id: args.assignmentId,
    student_id: args.studentId,
  });
  return true;
}

/**
 * The practice-POST hook: find the lesson's assignment (if any) and stamp the
 * student's start on it. Never throws — a telemetry/stamp failure must not
 * break session creation.
 */
export async function stampAssignmentStartForLesson(
  client: SupabaseClient,
  args: { studentId: string; lessonId: string; now?: string },
): Promise<boolean> {
  try {
    const assignment = await findAssignmentForLesson(client, args.lessonId);
    if (!assignment) return false;
    return await stampAssignmentStarted(client, {
      studentId: args.studentId,
      lessonId: args.lessonId,
      assignmentId: assignment.id,
      classroomId: assignment.classroomId,
      now: args.now,
    });
  } catch (err) {
    logger.error('stampAssignmentStartForLesson failed', err);
    return false;
  }
}
