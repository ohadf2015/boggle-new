/**
 * Usage-triggered Teacher Pro ask — the pay prompt tied to a real limit hit.
 *
 * The milestone ask (teacherProMilestone.ts) fires on engagement (3 students,
 * 5 completed games). This one fires on the usage limits Teacher Pro actually
 * lifts, so the copy can name the thing the teacher just ran into:
 *
 *   - a classroom roster at TEACHER_USAGE_PROMPT_MIN_STUDENTS+ students, or
 *   - TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS+ assignments created in one
 *     classroom (the FREE_TIER_LIMITS.assignmentsPerClass soft cap — see
 *     AssignmentCreator's upsell panel).
 *
 * Per classroom on purpose, same reasoning as the milestone file: two quiet
 * classes of 2 are not one engaged class of 4.
 *
 * Pure on purpose so the trigger is unit-testable without a classroom, a
 * socket, or Polar. Entitlement (already Pro?) and dismiss live with the
 * callers; this file only answers "has this teacher earned the usage ask".
 */

export const TEACHER_USAGE_PROMPT_MIN_STUDENTS = 10;
export const TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS = 3;

export const TEACHER_USAGE_PROMPT_DISMISS_KEY = 'lexiclash.teacher_usage_prompt_dismissed';

export type TeacherUsagePromptReason = 'students' | 'assignments';

export type TeacherUsageClassroomSnapshot = {
  studentCount: number;
  assignmentCreatedCount?: number;
};

/**
 * Which limit a single classroom hit, if any. 'students' wins a tie — the
 * roster is the stronger buying signal and its count is already loaded,
 * so the card never has to wait on the assignment query to explain itself.
 */
export function classroomUsagePromptReason(
  classroom: TeacherUsageClassroomSnapshot,
): TeacherUsagePromptReason | null {
  if ((classroom.studentCount ?? 0) >= TEACHER_USAGE_PROMPT_MIN_STUDENTS) return 'students';
  if ((classroom.assignmentCreatedCount ?? 0) >= TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS) {
    return 'assignments';
  }
  return null;
}

/**
 * The reason to show, or null. The count that triggered it travels with the
 * reason so the card copy can say "14 students" / "3 assignments" without a
 * second derivation.
 */
export function teacherUsagePrompt(
  classrooms: TeacherUsageClassroomSnapshot[],
): { reason: TeacherUsagePromptReason; count: number } | null {
  let maxStudents = 0;
  for (const c of classrooms) maxStudents = Math.max(maxStudents, c.studentCount ?? 0);
  if (maxStudents >= TEACHER_USAGE_PROMPT_MIN_STUDENTS) {
    return { reason: 'students', count: maxStudents };
  }
  let maxAssignments = 0;
  for (const c of classrooms) {
    maxAssignments = Math.max(maxAssignments, c.assignmentCreatedCount ?? 0);
  }
  if (maxAssignments >= TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS) {
    return { reason: 'assignments', count: maxAssignments };
  }
  return null;
}

export function isTeacherUsagePromptDismissed(
  storage: { getItem(key: string): string | null } | null | undefined,
): boolean {
  try {
    return storage?.getItem(TEACHER_USAGE_PROMPT_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistTeacherUsagePromptDismissed(
  storage: { setItem(key: string, value: string): void } | null | undefined,
): void {
  try {
    storage?.setItem(TEACHER_USAGE_PROMPT_DISMISS_KEY, '1');
  } catch {
    // Private mode / quota — the in-session hide still works.
  }
}
