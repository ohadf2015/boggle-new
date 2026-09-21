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

/**
 * Dashboard upgrade-nudge window: show the dismissible trial-days banner once
 * the deadline is this close. Distinct from TRIAL_URGENT_DAYS (styling) so a
 * teacher still has a week to convert before the pink "last chance" treatment.
 */
export const TRIAL_UPGRADE_NUDGE_DAYS = 7;

const TRIAL_UPGRADE_NUDGE_DISMISS_PREFIX = 'lexiclash.teacher_trial_upgrade_nudge_dismissed:';

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

/**
 * Which number, and which unit phrase, the trial countdown badge shows.
 *
 * The badge stacks a bare numeral above a bare unit phrase, so nothing
 * interpolates and the unit string must carry its own grammatical number. That
 * makes the singular cases real: at one hour remaining, `hours_left` renders
 * "1 / hours left" in English and "1 / часов осталось" in Russian, where a
 * genitive plural cannot follow "1" and the verb must agree ("час остался").
 *
 * `daysLeft` is rounded UP, so `daysLeft === 1` already means "inside the final
 * 24 hours" — which is why that case counts hours, and why the old
 * `education.trial.day_left` branch was unreachable.
 *
 * Both consumers call this so the two badges cannot drift apart.
 */
export function trialCountdownUnit(trial: TrialStatus): { key: string; count: number } {
  if (trial.daysLeft > 1) {
    return { key: 'education.trial.days_left', count: trial.daysLeft };
  }
  return {
    key: trial.hoursLeft === 1 ? 'education.trial.hour_left' : 'education.trial.hours_left',
    count: trial.hoursLeft,
  };
}

/** Active trial whose deadline is inside the dashboard upgrade-nudge window. */
export function isTrialUpgradeNudgeWindow(trial: TrialStatus | null | undefined): boolean {
  return !!trial && !trial.isExpired && trial.daysLeft <= TRIAL_UPGRADE_NUDGE_DAYS;
}

/**
 * Classrooms-list header CTA: approved teacher on an *active* trial who is not
 * already Pro. Loading states fail closed so a paying teacher never sees "pay".
 */
export function isEligibleForTeacherProUpgradeCta({
  trial,
  hasPro,
  proLoading = false,
  accessLoading = false,
}: {
  trial: TrialStatus | null | undefined;
  hasPro: boolean;
  proLoading?: boolean;
  accessLoading?: boolean;
}): boolean {
  if (proLoading || accessLoading || hasPro) return false;
  return !!trial && !trial.isExpired;
}

export function trialUpgradeNudgeDismissKey(expiresAt: string): string {
  return `${TRIAL_UPGRADE_NUDGE_DISMISS_PREFIX}${expiresAt}`;
}

export function isTrialUpgradeNudgeDismissed(
  storage: { getItem(key: string): string | null } | null | undefined,
  expiresAt: string,
): boolean {
  try {
    return storage?.getItem(trialUpgradeNudgeDismissKey(expiresAt)) === '1';
  } catch {
    return false;
  }
}

export function persistTrialUpgradeNudgeDismissed(
  storage: { setItem(key: string, value: string): void } | null | undefined,
  expiresAt: string,
): void {
  try {
    storage?.setItem(trialUpgradeNudgeDismissKey(expiresAt), '1');
  } catch {
    // Private mode / quota — the in-session hide still works.
  }
}
