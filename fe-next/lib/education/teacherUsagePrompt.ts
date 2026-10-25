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

import { TEACHER_PRO_ASK_DISMISS_TTL_MS } from './teacherProMilestone';

export const TEACHER_USAGE_PROMPT_MIN_STUDENTS = 10;
export const TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS = 3;

/** Players in a completed live round for it to count as a real class (a solo self-test does not). */
export const REAL_CLASS_MIN_PLAYERS = 2;

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
  { hasRealLiveGame }: { hasRealLiveGame: boolean },
): { reason: TeacherUsagePromptReason; count: number } | null {
  // A roster import or three drafted assignments is not value yet; the ask waits for a real class to play.
  if (!hasRealLiveGame) return null;
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

export const TEACHER_USAGE_PROMPT_DISMISS_TTL_MS = TEACHER_PRO_ASK_DISMISS_TTL_MS;

export function isTeacherUsagePromptDismissed(
  storage: { getItem(key: string): string | null; setItem?(key: string, value: string): void } | null | undefined,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem(TEACHER_USAGE_PROMPT_DISMISS_KEY);
    if (!raw) return false;
    if (raw === '1') {
      persistTeacherUsagePromptDismissed(storage, now);
      return true;
    }
    const ts = Number(raw);
    return Number.isFinite(ts) && now - ts < TEACHER_USAGE_PROMPT_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function persistTeacherUsagePromptDismissed(
  storage: { setItem?(key: string, value: string): void } | null | undefined,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem?.(TEACHER_USAGE_PROMPT_DISMISS_KEY, String(now));
  } catch {
    // Private mode / quota — the in-session hide still works.
  }
}
