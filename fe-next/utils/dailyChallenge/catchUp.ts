/**
 * Daily Challenge Catch-up
 *
 * Players can replay dailies they missed within a short window (the last 3 days).
 * Catch-up plays count toward personal stats + streak history, but deliberately
 * do NOT count toward weekly-chest cycle continuity — see docs/specs/
 * daily-catchup-chest-fairness.md. Otherwise a player could grind catch-up to
 * fabricate a 7-day cycle and defeat the gold-tier fairness gate.
 */

export const CATCH_UP_WINDOW_DAYS = 3;

// Self-contained so this module is safe to import from the Express backend,
// which resolves relative paths only — dateUtils pulls a `@/` alias import that
// would not resolve there.
function previousDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * The catch-up dates: the N calendar days immediately before `today`,
 * newest first (today-1, today-2, today-3).
 */
export function getCatchUpDates(today: string, windowDays: number = CATCH_UP_WINDOW_DAYS): string[] {
  const dates: string[] = [];
  let cursor = today;
  for (let i = 0; i < windowDays; i++) {
    cursor = previousDate(cursor);
    dates.push(cursor);
  }
  return dates;
}

/**
 * A date the player is allowed to submit: today, or any day in the catch-up window.
 */
export function isSubmittableDate(today: string, date: string, windowDays: number = CATCH_UP_WINDOW_DAYS): boolean {
  if (date === today) return true;
  return getCatchUpDates(today, windowDays).includes(date);
}

/**
 * A play is "catch-up" when it's a past date inside the window. Today is never
 * catch-up (and submitting yesterday near the UTC rollover stays a normal play
 * unless the client explicitly flags catch-up intent).
 */
export function isCatchUpDate(today: string, date: string, windowDays: number = CATCH_UP_WINDOW_DAYS): boolean {
  return date !== today && getCatchUpDates(today, windowDays).includes(date);
}

/**
 * Catch-up dates the player has NOT yet completed, newest first.
 */
export function getMissedCatchUpDates(
  today: string,
  completedDates: Iterable<string>,
  windowDays: number = CATCH_UP_WINDOW_DAYS,
): string[] {
  const done = new Set(completedDates);
  return getCatchUpDates(today, windowDays).filter(d => !done.has(d));
}
