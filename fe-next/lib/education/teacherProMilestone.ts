/**
 * When to ask a free teacher to pay for Teacher Pro.
 *
 * The static dashboard strip (t_891cc85a) showed the Polar checkout to every
 * free teacher after their first live game. Conversion stayed at 1 of 41
 * because the ask was not tied to a classroom that had actually engaged.
 *
 * A classroom hits the upgrade moment when it has >=3 students on the roster
 * OR >=5 completed live games OR >=5 completed assignments. The check is per
 * classroom, never a sum across the school — two quiet classes of 2 are not
 * one engaged class of 4.
 *
 * Pure on purpose so the trigger is unit-testable without a classroom, a
 * socket, or Polar. Entitlement (already Pro?) and dismiss live with the
 * callers; this file only answers "has this teacher earned the ask".
 */

export const TEACHER_PRO_MILESTONE_MIN_STUDENTS = 3;
export const TEACHER_PRO_MILESTONE_MIN_COMPLETED = 5;

export const TEACHER_PRO_ASK_DISMISS_KEY = 'lexiclash.teacher_pro_ask_dismissed';
/** After a "not now", stay quiet this long, then ask again if they are still free. */
export const TEACHER_PRO_ASK_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ClassroomEngagementSnapshot = {
  studentCount: number;
  gameCount?: number;
  assignmentCompletedCount?: number;
};

export function classroomHitsTeacherProMilestone(
  classroom: ClassroomEngagementSnapshot,
): boolean {
  const students = classroom.studentCount ?? 0;
  const games = classroom.gameCount ?? 0;
  const assignments = classroom.assignmentCompletedCount ?? 0;
  return (
    students >= TEACHER_PRO_MILESTONE_MIN_STUDENTS ||
    games >= TEACHER_PRO_MILESTONE_MIN_COMPLETED ||
    assignments >= TEACHER_PRO_MILESTONE_MIN_COMPLETED
  );
}

export function teacherHitsProUpgradeMilestone(
  classrooms: ClassroomEngagementSnapshot[],
): boolean {
  return classrooms.some(classroomHitsTeacherProMilestone);
}

export function isTeacherProAskDismissed(
  storage: { getItem(key: string): string | null; setItem?(key: string, value: string): void } | null | undefined,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem(TEACHER_PRO_ASK_DISMISS_KEY);
    if (!raw) return false;
    // Legacy permanent flag from PR #1079 — start a TTL window so the 40 free
    // teachers who tapped X are not silenced forever (1 paying of 41).
    if (raw === '1') {
      if (storage?.setItem) persistTeacherProAskDismissed(storage, now);
      return true;
    }
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < TEACHER_PRO_ASK_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function persistTeacherProAskDismissed(
  storage: { setItem?(key: string, value: string): void } | null | undefined,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem?.(TEACHER_PRO_ASK_DISMISS_KEY, String(now));
  } catch {
    // Private mode / quota — the in-session hide still works.
  }
}
