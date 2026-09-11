/**
 * Class-streak arithmetic, shared by the device and the server.
 *
 * The class streak counts consecutive CALENDAR DAYS (UTC) on which at least one
 * student finished the homework. It used to live only in `classStreak.ts`
 * (localStorage, one device). Now that completions are recorded server-side the
 * same numbers have to come out of two code paths — Class 3 in
 * `.claude/rules/60-recurring-pitfalls.md` is exactly the bug where two routes
 * to "the same" number quietly drift. One module, both callers.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Default history cap — four months of days is plenty for any streak. */
export const MAX_COMPLETION_DAYS = 120;

/** Accept only a real calendar date YYYY-MM-DD; '' otherwise. */
export function normalizeDay(raw: string | null | undefined): string {
  const value = String(raw || '').trim();
  if (!DAY_RE.test(value)) return '';
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return '';
  }
  return value;
}

function shiftDay(day: string, deltaDays: number): string {
  const dt = new Date(`${day}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/** Unbroken run of days ending ON `end` (0 when `end` itself is absent). */
export function consecutiveDaysEndingAt(days: string[], end: string): number {
  const target = normalizeDay(end);
  if (!target) return 0;
  const set = new Set(days.map(normalizeDay).filter(Boolean));
  let streak = 0;
  let cursor = target;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** Longest unbroken run anywhere in the history. */
export function longestConsecutiveRun(days: string[]): number {
  const sorted = [...new Set(days.map(normalizeDay).filter(Boolean))].sort();
  let best = 0;
  let run = 0;
  let previous = '';
  for (const day of sorted) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    previous = day;
    if (run > best) best = run;
  }
  return best;
}

/** Sorted, de-duplicated history with `day` folded in and the oldest days trimmed. */
export function addCompletionDay(
  days: string[],
  day: string,
  max: number = MAX_COMPLETION_DAYS,
): string[] {
  const clean = [...new Set(days.map(normalizeDay).filter(Boolean))];
  const added = normalizeDay(day);
  if (added) clean.push(added);
  return [...new Set(clean)].sort().slice(-Math.max(1, max));
}

export interface ClassStreakTotals {
  completionDays: string[];
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
}

/** Fold one completion day into a history and report the whole streak picture. */
export function foldClassStreak(
  days: string[],
  day: string,
  max: number = MAX_COMPLETION_DAYS,
): ClassStreakTotals {
  const completionDays = addCompletionDay(days, day, max);
  const lastCompletionDate = completionDays.length
    ? completionDays[completionDays.length - 1]
    : null;
  return {
    completionDays,
    currentStreak: lastCompletionDate
      ? consecutiveDaysEndingAt(completionDays, lastCompletionDate)
      : 0,
    longestStreak: longestConsecutiveRun(completionDays),
    lastCompletionDate,
  };
}
