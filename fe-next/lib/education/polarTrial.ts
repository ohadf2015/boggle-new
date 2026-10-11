/**
 * Polar Teacher Pro trial — not the access trial in `trial.ts`.
 *
 * Access (`TEACHER_TRIAL_DAYS`, `trial_expires_at`) is "you may use the teacher
 * product". This module is "you are on the paid Pro plan for 14 days before
 * the $9 charge". The two clocks must not share a banner.
 *
 * `trial_expires` on GET /api/subscription/status is the live Polar trial end
 * (`status === 'trialing'` + `current_period_end`). There is no trial column.
 * "Already used a trial" is a separate flag from subscription events, so a
 * second checkout cannot start another free 14 days.
 */

export interface PolarTrialRow {
  tier: string;
  status: string;
  source?: string | null;
  current_period_end: string | null;
}

/** ISO end while a non-grant row is Polar-trialing, otherwise null. */
export function polarTrialExpires(row: PolarTrialRow | null | undefined): string | null {
  if (!row) return null;
  if ((row.source || 'polar') === 'admin_grant') return null;
  if (row.tier !== 'pro' || row.status !== 'trialing') return null;
  return row.current_period_end;
}

export interface PolarTrialSignals {
  hasPro: boolean;
  status: string;
  source?: string | null;
  /** Started a Polar trial, whether it is still running or already finished. */
  trialUsed: boolean;
}

export interface PolarTrialUx {
  /** Subtle days-left badge. Not TrialUrgencyBanner. */
  showBadge: boolean;
  /** Days-remaining dashboard banner with a paid Polar checkout CTA. */
  showLifecycleBanner: boolean;
  /** Pay $9/mo. Not another free trial, and not stacked on the access banner. */
  showReactivation: boolean;
  /** Upgrade page may post `{ trial: true }`. */
  offerTrial: boolean;
}

/**
 * One answer for the three surfaces (badge, reactivation, upgrade CTA).
 * A live trial is Pro, so it never also asks them to pay or to start again.
 */
export function polarTrialUx({ hasPro, status, source, trialUsed }: PolarTrialSignals): PolarTrialUx {
  const onTrial = hasPro && status === 'trialing' && source !== 'admin_grant';
  const used = trialUsed || onTrial;
  return {
    showBadge: onTrial,
    showLifecycleBanner: onTrial,
    showReactivation: !hasPro && used,
    offerTrial: !hasPro && !used,
  };
}

/** Whole days remaining, rounded up. 0 once the instant has passed. Null if unknown. */
export function polarTrialDaysLeft(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const end = Date.parse(iso);
  if (!Number.isFinite(end)) return null;
  const ms = end - nowMs;
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/** Chip upgrade CTA only when the trial is in its last 3 days (inclusive). */
export function polarTrialChipUpgrade(daysLeft: number | null): boolean {
  return daysLeft !== null && daysLeft <= 3;
}

/**
 * HQ day-10 expiring banner. Day 10 of a 14-day Polar trial = 4 days left.
 * Inclusive catch-up: 4 down through 0 (ends today). Distinct from the
 * chip (`polarTrialChipUpgrade`, last 3 days) and from the email nudge
 * (skips 0).
 */
export const POLAR_TRIAL_HQ_DAY10_DAYS_LEFT = 4;

export function isPolarTrialDay10Expiring(daysLeft: number | null): boolean {
  return daysLeft !== null && daysLeft <= POLAR_TRIAL_HQ_DAY10_DAYS_LEFT;
}

export type PolarCheckoutWelcomeKind = 'paid' | 'trial' | 'none';

/**
 * Return-from-Polar HQ overlay. A live trial is still `hasPro`, so treating
 * `?checkout=success` as paid would greet a trialing teacher with "your
 * subscription is active".
 */
export function polarCheckoutWelcomeKind({
  checkoutSuccess,
  hasPro,
  source,
  status,
}: {
  checkoutSuccess: boolean;
  hasPro: boolean;
  source?: string | null;
  status: string;
}): PolarCheckoutWelcomeKind {
  if (!checkoutSuccess || !hasPro) return 'none';
  if ((source || 'polar') === 'admin_grant') return 'none';
  if (status === 'trialing') return 'trial';
  return 'paid';
}

export interface PolarTrialLapseRow {
  status: string;
  trial?: boolean;
  trial_end?: string | null;
  current_period_end?: string | null;
}

/**
 * Polar Teacher Pro trial ended without converting to paid.
 * A later paid cancel keeps current_period_end past trial_end — not a lapse.
 */
export function isPolarTrialLapse(row: PolarTrialLapseRow | null | undefined): boolean {
  if (!row) return false;
  const status = String(row.status ?? '');
  const usedTrial = row.trial === true || Boolean(row.trial_end) || status === 'trialing';
  if (!usedTrial) return false;
  if (status === 'active' || status === 'past_due') return false;
  if (status === 'trialing') return true;
  if (row.trial_end && row.current_period_end && row.current_period_end !== row.trial_end) {
    return false;
  }
  return status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired' || status === 'paused';
}
