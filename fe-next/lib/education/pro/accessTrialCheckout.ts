import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';

const DAY_MS = 24 * 60 * 60 * 1000;

export type PolarTrialSource = 'access_trial' | 'standard' | 'access_trial_ended';

export interface PolarTrialPlan {
  /** Days of Polar trial before the first $9 charge. 0 = no trial: charge now. */
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
 * Never had an access window (or the lookup failed: null) keeps the normal 14-day
 * trial. A window that already ran out means they had their free trial: no second
 * one, the checkout is a straight $9/mo subscription (days 0).
 */
export function polarTrialPlan(accessTrialExpiresAt: string | null | undefined, nowMs: number): PolarTrialPlan {
  const end = accessTrialExpiresAt ? Date.parse(accessTrialExpiresAt) : Number.NaN;
  if (!Number.isFinite(end)) return { days: TEACHER_PRO_TRIAL_DAYS, source: 'standard' };
  if (end <= nowMs) return { days: 0, source: 'access_trial_ended' };
  const days = Math.min(TEACHER_PRO_TRIAL_DAYS, Math.max(1, Math.ceil((end - nowMs) / DAY_MS)));
  return { days, source: 'access_trial' };
}

/**
 * The card ask (trial or paid Polar checkout) is only worth showing when the
 * free access window is about to close. Measured: the only two teachers who
 * ever reached the trial checkout (2026-10-24/26, minutes after approval) both
 * bounced at the card wall within minutes and never came back — 0% conversion
 * at zero demonstrated value. The window's last days are when "keep Pro after
 * {date}" is a real decision, and the reminder emails already aim there.
 */
export const TRIAL_CARD_ASK_LAST_DAYS = 3;

export type TrialCardAskTiming =
  /** No access window on record (or the lookup failed): keep the current ask. */
  | 'no_access_window'
  /** Free window is live with more than TRIAL_CARD_ASK_LAST_DAYS left: hide the card ask. */
  | 'too_early'
  /** Free window is live and almost over: the keep-Pro ask is due. */
  | 'ending_soon'
  /** Free window already ran out. */
  | 'access_ended';

export function trialCardAskTiming(
  accessTrialExpiresAt: string | null | undefined,
  nowMs: number = Date.now(),
): TrialCardAskTiming {
  const end = accessTrialExpiresAt ? Date.parse(accessTrialExpiresAt) : Number.NaN;
  if (!Number.isFinite(end)) return 'no_access_window';
  if (end <= nowMs) return 'access_ended';
  const daysLeft = (end - nowMs) / DAY_MS;
  return daysLeft <= TRIAL_CARD_ASK_LAST_DAYS ? 'ending_soon' : 'too_early';
}

/** True when a checkout CTA (trial or paid) should be offered at all. */
export function showProCardAsk(timing: TrialCardAskTiming): boolean {
  return timing !== 'too_early';
}
