/**
 * Student-side assignment due-date reminders — pure model.
 *
 * Two behaviors, both over the student's most urgent OPEN assignment
 * (`nextOpenAssignment` in components/student/nextOpenAssignment.ts, already
 * due-date-sorted):
 *
 * 1. DUE SOON — the assignment's `due_date` lands within the next 24h: the
 *    Academy hub shows a persistent reminder card until it is done or due.
 * 2. OVERDUE — the `due_date` has passed and the assignment is still open: the
 *    hub nudges the student. The nudge is REPEATABLE but at most ONCE PER DAY
 *    per assignment (localStorage throttle, same StorageLike shape as
 *    teacherTrialOfferDismiss.ts), so a daily returner gets re-nudged without
 *    being spammed within one day.
 *
 * Everything here is pure + injectable (`now`, `storage`) so the card, the
 * throttle and the telemetry predicates are all unit-testable without a DOM.
 */

/** Assignments due within this window get the reminder card. */
export const DUE_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** An overdue assignment may nudge again after this much time has passed. */
export const OVERDUE_NUDGE_TTL_MS = 24 * 60 * 60 * 1000;

export const overdueNudgeStorageKey = (assignmentId: string): string =>
  `lexiclash.assignment_overdue_nudged.${assignmentId}`;

export type AssignmentDueKind = 'overdue' | 'due_soon';

type StorageLike = {
  getItem?(key: string): string | null;
  setItem?(key: string, value: string): void;
} | null | undefined;

/** Parse an ISO-ish due date; null/invalid dates never remind. */
function dueTimestamp(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const ts = Date.parse(dueDate);
  return Number.isFinite(ts) ? ts : null;
}

/**
 * Classify an open assignment's due date at `now`.
 * Returns null when there is nothing to surface: no due date, due later than
 * the reminder window, or `dueDate` failed to parse.
 */
export function classifyAssignmentDue(
  dueDate: string | null | undefined,
  now: number = Date.now(),
): AssignmentDueKind | null {
  const due = dueTimestamp(dueDate);
  if (due == null) return null;
  if (due < now) return 'overdue';
  if (due - now <= DUE_REMINDER_WINDOW_MS) return 'due_soon';
  return null;
}

/** Whole days an overdue assignment has been past its due date (min 1). */
export function daysOverdue(dueDate: string, now: number = Date.now()): number {
  const due = dueTimestamp(dueDate);
  if (due == null) return 1;
  return Math.max(1, Math.floor((now - due) / OVERDUE_NUDGE_TTL_MS));
}

/**
 * May this overdue assignment nudge the student right now? True when no
 * nudge has been recorded for it, or the last one is older than the TTL.
 * Storage read failure (private mode, SSR) means "may nudge".
 */
export function isOverdueNudgeDue(
  storage: StorageLike,
  assignmentId: string,
  now: number = Date.now(),
): boolean {
  try {
    const raw = storage?.getItem?.(overdueNudgeStorageKey(assignmentId));
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return now - ts >= OVERDUE_NUDGE_TTL_MS;
  } catch {
    return true;
  }
}

/** Record that the nudge fired, starting a new 1/day quiet period. */
export function markOverdueNudged(
  storage: StorageLike,
  assignmentId: string,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem?.(overdueNudgeStorageKey(assignmentId), String(now));
  } catch {
    /* private mode / quota — the in-session nudge still happened */
  }
}
