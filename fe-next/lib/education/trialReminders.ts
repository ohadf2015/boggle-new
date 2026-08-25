// Which trial-expiry email a teacher is owed right now, if any.
//
// Exists because nothing fired at the trial boundary: 25 of 29 approved teacher
// requests carry a `trial_expires_at`, 8 had already lapsed and the rest lapse
// within weeks, and not one of them was ever asked to pay. The trial deadline is
// the only moment where the $9/mo ask is natural, and it was silent.
//
// Pure so the schedule is testable without a DB or an email provider.

const DAY_MS = 24 * 60 * 60 * 1000;

/** In send order. Each teacher gets each bucket at most once, ever. */
export const TRIAL_REMINDER_BUCKETS = ['t-3', 't-0', 't+3'] as const;
export type TrialReminderBucket = (typeof TRIAL_REMINDER_BUCKETS)[number];

/** Whole days the expiry threshold has been open for. Negative = still ahead. */
const THRESHOLD_DAYS: Record<TrialReminderBucket, number> = { 't-3': -3, 't-0': 0, 't+3': 3 };

/**
 * Don't surprise someone whose trial died months ago. Anything past this is
 * cold, and a cold list is a spam complaint, not a sale.
 */
export const MAX_DAYS_PAST_EXPIRY = 60;

/**
 * The one bucket to send now, or null.
 *
 * Threshold-based rather than exact-day-match on purpose: a cron that misses a
 * day (deploy, outage, a lapse that predates this code shipping) must still send
 * the message, just late. So we take the LATEST bucket whose threshold has passed
 * and that `alreadySent` doesn't contain — one email per teacher per run, three
 * in a lifetime.
 */
export function pickTrialReminder(
  expiresAtISO: string | null | undefined,
  alreadySent: readonly string[] | null | undefined,
  nowMs: number,
): TrialReminderBucket | null {
  if (!expiresAtISO) return null;
  const exp = Date.parse(expiresAtISO);
  if (Number.isNaN(exp)) return null;

  const daysPast = (nowMs - exp) / DAY_MS;
  if (daysPast > MAX_DAYS_PAST_EXPIRY) return null;

  const sent = new Set(alreadySent ?? []);
  for (const bucket of [...TRIAL_REMINDER_BUCKETS].reverse()) {
    // The latest due bucket wins, and if it already went out nothing older is
    // worth sending — "your trial ends in 3 days" is a lie once it has ended.
    if (daysPast >= THRESHOLD_DAYS[bucket]) return sent.has(bucket) ? null : bucket;
  }
  return null;
}
