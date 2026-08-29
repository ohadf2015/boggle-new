import type { TeacherLocale } from './types';

/**
 * The goodwill trial extension: every approved teacher gets 14 more days
 * because the teacher dashboard bounced them out of it (the education landing
 * page linked at /teacher with a raw <a>, so the click tore the app down and
 * rebooted auth on a page that renders nothing while auth is unresolved).
 *
 * The selection rules are here, not in the route, because all three of them are
 * ways this send can go wrong in a way an apology email cannot survive:
 * duplicate mail, a "new trial" that is already expired, and a second run
 * mailing everyone again.
 */

/** Appended to `trial_reminders_sent` after a confirmed extension. */
export const GOODWILL_EXTENSION_MARKER = 'goodwill_ext_2026_08_29';

export const GOODWILL_EXTENSION_DAYS = 14;

export interface ExtendableRow {
  id: string;
  email: string;
  user_id: string | null;
  full_name: string;
  locale: TeacherLocale;
  created_at: string;
  trial_expires_at: string | null;
  trial_reminders_sent: string[] | null;
}

export interface ExtensionPlan {
  row: ExtendableRow;
  newExpiresAt: string;
  /**
   * What `trial_reminders_sent` becomes — the marker ALONE, replacing whatever
   * was there. Appending would keep `t-3`/`t-0`/`t+3` from the old deadline in
   * the array, and `pickTrialReminder` never re-sends a bucket it finds there:
   * every teacher we extend would silently lose the reminder cycle on their new
   * deadline, which is the only moment they are ever asked to pay.
   */
  newRemindersSent: string[];
}

export function planTrialExtension(
  rows: ExtendableRow[],
  nowMs: number,
  days: number = GOODWILL_EXTENSION_DAYS,
): ExtensionPlan[] {
  const newest = new Map<string, ExtendableRow>();
  for (const row of rows) {
    // No account means no dashboard and no trial state — these are legacy
    // pre-auth request rows, not people we can extend anything for.
    if (!row.user_id) continue;
    if (row.trial_reminders_sent?.includes(GOODWILL_EXTENSION_MARKER)) continue;
    const key = row.email.trim().toLowerCase();
    const held = newest.get(key);
    if (!held || Date.parse(row.created_at) > Date.parse(held.created_at)) newest.set(key, row);
  }

  return [...newest.values()].map((row) => {
    const current = row.trial_expires_at ? Date.parse(row.trial_expires_at) : NaN;
    // An expired trial restarts from today: `expired + 14 days` is still in the
    // past for most of these rows, which would make the email a lie.
    const base = Number.isFinite(current) ? Math.max(current, nowMs) : nowMs;
    return {
      row,
      newExpiresAt: new Date(base + days * 24 * 60 * 60 * 1000).toISOString(),
      newRemindersSent: [GOODWILL_EXTENSION_MARKER],
    };
  });
}
