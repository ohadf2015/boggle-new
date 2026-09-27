/**
 * Chest-cycle freeze bridge.
 *
 * A streak freeze the player earned (e.g. from a gold weekly chest, stored in
 * player_engagement.streak_freezes_available) should also protect the weekly
 * CHEST cycle, not just the win streak — so a single missed daily doesn't clear
 * a nearly-complete 7-day run. See docs/specs/daily-catchup-chest-fairness.md.
 *
 * This is the pure decision: given the days a player has completed, today, and
 * how many freezes they own, should one freeze bridge a one-day gap? Multi-day
 * gaps never auto-bridge (one freeze = one day), matching /api/streak.
 */

function prevDate(d: string): string {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() - 1);
  return x.toISOString().slice(0, 10);
}

/**
 * Returns the date to freeze (yesterday) when completing `today` bridges a
 * single missed day flanked by completed days (…dayBefore, [missed], today),
 * and the player owns at least one freeze. Otherwise null.
 */
export function freezeDateToBridge(
  completedDates: Iterable<string>,
  today: string,
  freezesAvailable: number,
): string | null {
  if (freezesAvailable <= 0) return null;
  const done = completedDates instanceof Set ? completedDates : new Set(completedDates);
  const yesterday = prevDate(today);
  const dayBefore = prevDate(yesterday);
  if (done.has(today) && !done.has(yesterday) && done.has(dayBefore)) return yesterday;
  return null;
}
