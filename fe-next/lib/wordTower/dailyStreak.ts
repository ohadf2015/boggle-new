/**
 * Word Tower — Daily streak math (pure).
 *
 * The routine hook: play the daily tower on consecutive UTC days to grow a
 * streak. Skip a day and it resets — but your best is remembered. All dates are
 * YYYY-MM-DD UTC keys (see {@link utcDateKey}); keeping this pure makes the
 * habit logic trivially testable and the localStorage wrapper a thin shell.
 */

export interface DailyStreakState {
  /** Consecutive-day streak ending at `lastPlayedDate`. */
  current: number;
  /** Best streak ever reached. */
  best: number;
  /** UTC day key (YYYY-MM-DD) of the most recent recorded play, or null. */
  lastPlayedDate: string | null;
}

export const EMPTY_STREAK: DailyStreakState = { current: 0, best: 0, lastPlayedDate: null };

/** The UTC day immediately before `dateKey` (YYYY-MM-DD), via UTC arithmetic. */
function previousUtcDay(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Record a completed daily play on `today` (a YYYY-MM-DD UTC key). Extends the
 * streak if the last play was yesterday, resets to 1 if a day was skipped, and
 * is idempotent for repeat plays on the same day. `best` never decreases.
 */
export function recordDailyPlay(prev: DailyStreakState, today: string): DailyStreakState {
  if (prev.lastPlayedDate === today) return prev; // already counted today
  const continues = prev.lastPlayedDate === previousUtcDay(today);
  const current = continues ? prev.current + 1 : 1;
  return { current, best: Math.max(prev.best, current), lastPlayedDate: today };
}

/**
 * The streak to SHOW as of `today`. Live count on the day you played and the
 * following day (grace window — you can still keep it alive); 0 once two or more
 * UTC days have passed without a play.
 */
export function displayStreak(prev: DailyStreakState, today: string): number {
  if (!prev.lastPlayedDate) return 0;
  if (prev.lastPlayedDate === today || prev.lastPlayedDate === previousUtcDay(today)) {
    return prev.current;
  }
  return 0;
}
