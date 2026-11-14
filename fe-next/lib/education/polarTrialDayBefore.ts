/**
 * The day before a Polar Teacher Pro trial turns into a $9/mo charge.
 *
 * A trial starts only with a card on file (Polar collects it at checkout) and
 * converts on its own when it ends. The teacher hears about the charge the day
 * before, by email and in the app, with a way to cancel.
 *
 * "The day before" is the last 36 hours: a daily cron always lands inside that
 * window once (12 to 36 hours out), and the in-app notice uses the same window
 * so the two say the same thing.
 */

const HOUR_MS = 60 * 60 * 1000;

export const POLAR_TRIAL_DAY_BEFORE_BUCKET = 'day-before';

/** Hours before the charge when the day-before notice opens. */
export const POLAR_TRIAL_DAY_BEFORE_HOURS = 36;

export interface PolarTrialChargeSignals {
  tier: string;
  status: string;
  source?: string | null;
  currentPeriodEnd: string | null;
  /** True once they cancelled: no charge is coming, so no "you'll be charged" notice. */
  cancelAtPeriodEnd?: boolean | null;
  nowMs: number;
}

/** A live, card-backed Polar trial that will charge inside the next 36 hours. */
export function isPolarTrialChargeSoon(s: PolarTrialChargeSignals): boolean {
  if (s.tier !== 'pro' || s.status !== 'trialing') return false;
  if ((s.source || 'polar') === 'admin_grant') return false;
  if (s.cancelAtPeriodEnd === true) return false;
  if (!s.currentPeriodEnd) return false;
  const end = Date.parse(s.currentPeriodEnd);
  if (!Number.isFinite(end)) return false;
  const msLeft = end - s.nowMs;
  return msLeft > 0 && msLeft <= POLAR_TRIAL_DAY_BEFORE_HOURS * HOUR_MS;
}

export interface PolarTrialDayBeforeSignals extends PolarTrialChargeSignals {
  alreadySent: readonly string[] | null | undefined;
}

/** The day-before email to send now, or null. Once per teacher, ever. */
export function pickPolarTrialDayBefore(
  s: PolarTrialDayBeforeSignals,
): typeof POLAR_TRIAL_DAY_BEFORE_BUCKET | null {
  if ((s.alreadySent ?? []).includes(POLAR_TRIAL_DAY_BEFORE_BUCKET)) return null;
  return isPolarTrialChargeSoon(s) ? POLAR_TRIAL_DAY_BEFORE_BUCKET : null;
}

const SITE = 'https://www.lexiclash.live';

/** Where the email sends them to manage or cancel: the plan page, which opens the Polar portal. */
export function polarTrialManageUrl(locale: string): string {
  const loc = locale || 'en';
  return `${SITE}/${loc}/teacher/upgrade?utm_source=email&utm_campaign=polar_trial_day_before`;
}
