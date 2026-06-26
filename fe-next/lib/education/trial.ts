// Teacher access is granted as a time-limited trial. Approval stamps a
// `trial_expires_at` and the UI/email use that to create activation urgency
// ("your trial is live now — don't miss it"). This module holds the pure,
// testable trial math so the duration policy lives in exactly one place.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Length of the teacher trial, in days, stamped at approval time. */
export const TEACHER_TRIAL_DAYS = 14;

/** When daysLeft drops to this or below, surface the high-urgency styling/copy. */
export const TRIAL_URGENT_DAYS = 3;

/** ISO timestamp for the trial deadline, TEACHER_TRIAL_DAYS after `fromMs`. */
export function teacherTrialExpiry(fromMs: number): string {
  return new Date(fromMs + TEACHER_TRIAL_DAYS * DAY_MS).toISOString();
}

export interface TrialStatus {
  /** The expiry timestamp this status was derived from (ISO). */
  expiresAt: string;
  /** Milliseconds remaining (negative once expired). */
  msLeft: number;
  /** Whole days remaining, rounded up; 0 once expired. */
  daysLeft: number;
  /** Whole hours remaining, rounded up; 0 once expired. */
  hoursLeft: number;
  /** True once the deadline has passed. */
  isExpired: boolean;
  /** True while active and at/under TRIAL_URGENT_DAYS remaining. */
  isUrgent: boolean;
}

/**
 * Derive trial countdown state from an expiry timestamp.
 * Returns null when there is no (or an invalid) expiry — i.e. no trial to show.
 */
export function teacherTrialStatus(
  expiresAtISO: string | null | undefined,
  nowMs: number,
): TrialStatus | null {
  if (!expiresAtISO) return null;
  const exp = Date.parse(expiresAtISO);
  if (Number.isNaN(exp)) return null;

  const msLeft = exp - nowMs;
  const isExpired = msLeft <= 0;
  const daysLeft = isExpired ? 0 : Math.ceil(msLeft / DAY_MS);
  const hoursLeft = isExpired ? 0 : Math.ceil(msLeft / HOUR_MS);
  const isUrgent = !isExpired && daysLeft <= TRIAL_URGENT_DAYS;

  return { expiresAt: expiresAtISO, msLeft, daysLeft, hoursLeft, isExpired, isUrgent };
}
