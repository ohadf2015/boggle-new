// Teacher access is granted as a time-limited trial. Approval stamps a
// `trial_expires_at` and the UI/email use that to create activation urgency
// ("your trial is live now — don't miss it"). This module holds the pure,
// testable trial math so the duration policy lives in exactly one place.

import { pluralKey } from '@/lib/i18n/pluralKey';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Length of the teacher trial, in days, stamped at approval time. */
export const TEACHER_TRIAL_DAYS = 14;

/** When daysLeft drops to this or below, surface the high-urgency styling/copy. */
export const TRIAL_URGENT_DAYS = 3;

const TRIAL_REMINDER_DISMISS_PREFIX = 'lexiclash.teacher_trial_reminder_dismissed:';

/**
 * The free access window a teacher gets on approval: none, since Nov 2026.
 *
 * Teacher Pro is tried only through the Polar trial, which starts with a card on
 * file and turns into $9/mo unless they cancel (reminded the day before). A no-card
 * window on approval would be a second, cardless way in. A teacher approved before
 * the switch keeps the window they were given (`prior`), and it is never charged.
 */
export function approvalTrialExpiry(prior: string | null | undefined): string | null {
  return prior || null;
}

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
 * 24 hours" — which is why that case counts hours. The unit follows the
 * locale's plural rules (Russian 21 days takes the singular form).
 *
 * Both consumers call this so the two badges cannot drift apart.
 */
export function trialCountdownUnit(trial: TrialStatus, locale = 'en'): { key: string; count: number } {
  if (trial.daysLeft > 1) {
    return { key: pluralKey(DAY_FORMS, trial.daysLeft, locale), count: trial.daysLeft };
  }
  return { key: pluralKey(HOUR_FORMS, trial.hoursLeft, locale), count: trial.hoursLeft };
}

const DAY_FORMS = {
  one: 'education.trial.day_left',
  few: 'education.trial.days_left_few',
  other: 'education.trial.days_left',
};
const HOUR_FORMS = {
  one: 'education.trial.hour_left',
  few: 'education.trial.hours_left_few',
  other: 'education.trial.hours_left',
};

/** Active trial whose deadline is inside the urgent reminder window (daysLeft <= TRIAL_URGENT_DAYS). */
export function isTrialReminderWindow(trial: TrialStatus | null | undefined): boolean {
  return !!trial && !trial.isExpired && trial.daysLeft <= TRIAL_URGENT_DAYS;
}

/**
 * Classrooms-list header CTA: approved teacher on an *active* access trial, or one
 * who never had a trial of any kind, who is not already Pro. Loading states fail closed so a paying teacher never sees "pay".
 */
export function isEligibleForTeacherProUpgradeCta({
  trial,
  hasPro,
  proLoading = false,
  accessLoading = false,
  trialUsed,
}: {
  trial: TrialStatus | null | undefined;
  hasPro: boolean;
  proLoading?: boolean;
  accessLoading?: boolean;
  /**
   * Known Polar trial history. A teacher approved with no free window (the trial
   * now needs a card) and no card trial yet still gets the way in. Unknown keeps
   * the old rule.
   */
  trialUsed?: boolean;
}): boolean {
  if (proLoading || accessLoading || hasPro) return false;
  if (!trial) return trialUsed === false;
  return !trial.isExpired;
}

export function trialReminderDismissKey(expiresAt: string): string {
  return `${TRIAL_REMINDER_DISMISS_PREFIX}${expiresAt}`;
}

export function isTrialReminderDismissed(
  storage: { getItem(key: string): string | null } | null | undefined,
  expiresAt: string,
): boolean {
  try {
    return storage?.getItem(trialReminderDismissKey(expiresAt)) === '1';
  } catch {
    return false;
  }
}

export function persistTrialReminderDismissed(
  storage: { setItem(key: string, value: string): void } | null | undefined,
  expiresAt: string,
): void {
  try {
    storage?.setItem(trialReminderDismissKey(expiresAt), '1');
  } catch {
    // Private mode / quota — the in-session hide still works.
  }
}
