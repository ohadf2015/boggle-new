/**
 * Polar Teacher Pro day-10 expiry nudge.
 *
 * Distinct from `trialReminders.ts` (access-trial t-3/t-0/t+3 on
 * teacher_access_requests.trial_expires_at). This clock is the 14-day Polar
 * Pro trial on `subscriptions` (status=trialing). Day 10 = 4 days remaining.
 *
 * Catch-up: once remaining days drop to 4 or below (and the trial is still
 * live), send once. A missed cron day still asks; a second run does not.
 */

import { polarTrialDaysLeft } from './polarTrial';

export const POLAR_TRIAL_DAY10_BUCKET = 'day-10';

/** Whole days remaining at which the Polar trial is on/after day 10 of 14. */
export const POLAR_TRIAL_DAY10_DAYS_LEFT = 4;

const SITE = 'https://www.lexiclash.live';

export function polarTrialUpgradeUrl(locale: string): string {
  const loc = locale || 'en';
  return `${SITE}/${loc}/teacher/upgrade?utm_source=email&utm_campaign=polar_trial_day10`;
}

export interface PolarTrialDay10Signals {
  tier: string;
  status: string;
  source?: string | null;
  currentPeriodEnd: string | null;
  alreadySent: readonly string[] | null | undefined;
  nowMs: number;
}

export function pickPolarTrialDay10Nudge(args: PolarTrialDay10Signals): typeof POLAR_TRIAL_DAY10_BUCKET | null {
  if (args.tier !== 'pro') return null;
  if (args.status !== 'trialing') return null;
  if ((args.source || 'polar') === 'admin_grant') return null;
  if ((args.alreadySent ?? []).includes(POLAR_TRIAL_DAY10_BUCKET)) return null;
  const daysLeft = polarTrialDaysLeft(args.currentPeriodEnd, args.nowMs);
  if (daysLeft === null) return null;
  if (daysLeft < 1 || daysLeft > POLAR_TRIAL_DAY10_DAYS_LEFT) return null;
  return POLAR_TRIAL_DAY10_BUCKET;
}
