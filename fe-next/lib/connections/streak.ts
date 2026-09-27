/**
 * Word Bridge daily streak — pure UTC day math (no Date.now / no I/O).
 *
 * The server resolves the authoritative streak from the player's D-1 row at
 * submit time (never trusting a client-supplied value — see the daily score
 * route). Guests keep an equivalent streak in localStorage via
 * clientStreakAfterSolve.
 */

/** Parse a 'YYYY-MM-DD' string to a UTC epoch (midnight). */
function parseUTC(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Format a UTC epoch back to 'YYYY-MM-DD'. */
function formatUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** The calendar day before dateISO, in UTC. */
export function yesterdayISO(dateISO: string): string {
  return formatUTC(parseUTC(dateISO) - DAY_MS);
}

/**
 * Authoritative streak for a submission, given the streak stored on the
 * player's row for the previous day (or null if there is none). The server
 * computes this — the client's reported streak is ignored.
 */
export function nextStreakValue(yesterdayStreak: number | null): number {
  if (yesterdayStreak == null || yesterdayStreak <= 0) return 1;
  return yesterdayStreak + 1;
}

export interface ClientStreak {
  streak: number;
  /** Last day the player completed the daily, 'YYYY-MM-DD'. */
  lastDate: string;
}

/**
 * Advance a guest's locally-stored streak when they finish today's daily.
 * - no prior history → streak 1
 * - last solve was today → unchanged (idempotent)
 * - last solve was yesterday → +1
 * - older / gap → reset to 1
 */
export function clientStreakAfterSolve(prev: ClientStreak | null, todayISO: string): ClientStreak {
  if (!prev) return { streak: 1, lastDate: todayISO };
  if (prev.lastDate === todayISO) return { streak: prev.streak, lastDate: todayISO };
  if (prev.lastDate === yesterdayISO(todayISO)) {
    return { streak: prev.streak + 1, lastDate: todayISO };
  }
  return { streak: 1, lastDate: todayISO };
}
