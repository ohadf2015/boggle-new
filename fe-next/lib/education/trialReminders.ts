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

/**
 * Collapse a due-list to one entry per teacher.
 *
 * Reminder idempotency is stored per ROW (`trial_reminders_sent`), which is wrong per PERSON:
 * a teacher who submitted the access form twice owns two approved rows, and each would be
 * reminded independently. Production held five such addresses, one with three rows — so the
 * first cron run would have sent that teacher three identical emails. Duplicate mail is the
 * fastest route to a reputation-flagged sending domain, which would break every transactional
 * email the product sends.
 *
 * Deduping here rather than deleting rows keeps a teacher's own records intact and also covers
 * any duplicate created in future.
 *
 * When rows collide, the one with the most recent `trial_expires_at` wins: a teacher who
 * re-requested has a fresher trial, and reminding them about the stale one would tell them
 * their trial had ended while it is still running.
 */
export function dedupeDueByEmail<
  T extends { row: { email: string; trial_expires_at: string | null } },
>(due: T[]): T[] {
  const bestByEmail = new Map<string, T>();
  const order: string[] = [];

  for (const entry of due) {
    const key = (entry.row.email ?? '').trim().toLowerCase();
    const incumbent = bestByEmail.get(key);
    if (!incumbent) {
      bestByEmail.set(key, entry);
      order.push(key);
      continue;
    }
    // A parseable date always beats a missing or unparseable one.
    const score = (v: string | null) => {
      const t = v ? Date.parse(v) : NaN;
      return Number.isNaN(t) ? -Infinity : t;
    };
    if (score(entry.row.trial_expires_at) > score(incumbent.row.trial_expires_at)) {
      bestByEmail.set(key, entry);
    }
  }

  // Preserve first-seen order so the send sequence stays stable and diffable run to run.
  return order.map((k) => bestByEmail.get(k)!);
}
