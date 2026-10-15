/**
 * Polar Teacher Pro trial-expiry conversion journey.
 *
 * Distinct from `trialReminders.ts` (access-trial t-3/t-0/t+3) and from
 * `polarTrialDay10.ts` (live trial, 4–1 days left). This clock is the Polar
 * 14-day Pro trial at/after the instant it ends: t-0 (ends today / just
 * lapsed) and t+3 (winback). Day-10 keeps the mid-late nudge so this module
 * never returns a bucket while days remain.
 *
 * Pure so the schedule is testable without a DB or an email provider.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SITE = 'https://www.lexiclash.live';

/** In send order. Each teacher gets each bucket at most once, ever. */
export const POLAR_TRIAL_EXPIRY_BUCKETS = ['t-0', 't+3'] as const;
export type PolarTrialExpiryBucket = (typeof POLAR_TRIAL_EXPIRY_BUCKETS)[number];

const THRESHOLD_DAYS: Record<PolarTrialExpiryBucket, number> = { 't-0': 0, 't+3': 3 };

const CAMPAIGN: Record<PolarTrialExpiryBucket, string> = {
  't-0': 'polar_trial_t0',
  't+3': 'polar_trial_t3',
};

/** Don't surprise someone whose Polar trial died months ago. */
export const MAX_DAYS_PAST_POLAR_EXPIRY = 60;

const ELIGIBLE_STATUS = new Set(['trialing', 'canceled', 'unpaid', 'incomplete_expired', 'paused']);

export interface PolarTrialExpirySignals {
  tier: string;
  status: string;
  source?: string | null;
  currentPeriodEnd: string | null;
  trialUsed: boolean;
  alreadySent: readonly string[] | null | undefined;
  nowMs: number;
}

export function polarTrialExpiryUpgradeUrl(locale: string, bucket: PolarTrialExpiryBucket): string {
  const loc = locale || 'en';
  return `${SITE}/${loc}/teacher/upgrade?utm_source=email&utm_campaign=${CAMPAIGN[bucket]}`;
}

/**
 * The one Polar expiry email to send now, or null.
 *
 * Threshold-based: a missed cron day still sends the latest due bucket, never
 * a now-false "ends today" after t+3 is the honest message.
 */
export function pickPolarTrialExpiryJourney(args: PolarTrialExpirySignals): PolarTrialExpiryBucket | null {
  if ((args.source || 'polar') === 'admin_grant') return null;
  if (!ELIGIBLE_STATUS.has(args.status)) return null;
  const used = args.trialUsed || args.status === 'trialing';
  if (!used) return null;
  if (!args.currentPeriodEnd) return null;
  const exp = Date.parse(args.currentPeriodEnd);
  if (Number.isNaN(exp)) return null;

  const daysPast = (args.nowMs - exp) / DAY_MS;
  if (daysPast > MAX_DAYS_PAST_POLAR_EXPIRY) return null;
  // Remaining days belong to the day-10 cron (4 down through 1).
  if (daysPast < 0) return null;

  const sent = new Set(args.alreadySent ?? []);
  for (const bucket of [...POLAR_TRIAL_EXPIRY_BUCKETS].reverse()) {
    if (daysPast >= THRESHOLD_DAYS[bucket]) return sent.has(bucket) ? null : bucket;
  }
  return null;
}

/** In-app digest CTA after Polar trial lapsed (not the day-7 mid-trial beat). */
export function isPolarTrialExpiryConversion(hasPro: boolean, trialUsed: boolean): boolean {
  return !hasPro && trialUsed === true;
}
