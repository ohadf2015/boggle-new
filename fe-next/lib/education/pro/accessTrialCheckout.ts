import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PolarTrialSource = 'access_trial' | 'standard';

export interface PolarTrialPlan {
  /** Days of Polar trial before the first $9 charge. */
  days: number;
  /** `access_trial`: the teacher is already inside the free 14-day access window. */
  source: PolarTrialSource;
}

/**
 * One trial, one card ask.
 *
 * An approved teacher already gets 14 free days of access with no card. Their Teacher
 * Pro checkout used to add a fresh 14-day Polar trial on top, so the first charge
 * landed up to 28 days after approval and the card ask read as a second, unrelated
 * trial. While the access window is open, the Polar trial instead lasts exactly the
 * days left in it, so billing starts the day the free trial ends.
 *
 * Whole days, rounded up (Polar takes a day count, min 1): a teacher with 3.2 days
 * left gets 4, never less than they were promised. Capped at the standard length so
 * a mis-stamped expiry can never hand out more than 14 days.
 *
 * No live access window (never approved, or it already ran out) keeps the normal
 * 14-day trial.
 */
export function polarTrialPlan(accessTrialExpiresAt: string | null | undefined, nowMs: number): PolarTrialPlan {
  const end = accessTrialExpiresAt ? Date.parse(accessTrialExpiresAt) : Number.NaN;
  if (!Number.isFinite(end) || end <= nowMs) return { days: TEACHER_PRO_TRIAL_DAYS, source: 'standard' };
  const days = Math.min(TEACHER_PRO_TRIAL_DAYS, Math.max(1, Math.ceil((end - nowMs) / DAY_MS)));
  return { days, source: 'access_trial' };
}
