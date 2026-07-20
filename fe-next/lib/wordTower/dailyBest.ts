/**
 * Word Tower — Daily best tracking (pure).
 *
 * Completes the daily routine loop: each UTC day everyone climbs the same tower,
 * so the meaningful comparison is against YOUR own best on that day. This stores
 * today's best (whole metres) and decides when to celebrate beating it — once,
 * when you first climb past the best you started the run with.
 */

/** Per-day localStorage slot for today's best height. */
export function dailyBestKey(dateKey: string): string {
  return `wt-daily-best-${dateKey}`;
}

/**
 * Whether the player has climbed today's daily tower — true once a best height
 * is recorded (>0). Drives the daily-challenge progress counter so Word Tower
 * reads as a completed quest like Word Hunt / Word Wheel. Takes the raw stored
 * string so it's pure (caller reads localStorage).
 */
export function isDailyTowerPlayed(storedBest: string | null): boolean {
  return (Number(storedBest) || 0) > 0;
}

/** Monotonic merge of a stored best with the current height (whole metres). */
export function mergeDailyBest(storedBest: number, heightM: number): number {
  return Math.max(storedBest, Math.floor(heightM));
}

/**
 * Whether the current height beats the best the run STARTED with — the trigger
 * for the one-time "new daily best!" beat (the caller latches it so it fires once).
 */
export function beatsDailyBest(startBest: number, heightM: number): boolean {
  return Math.floor(heightM) > startBest;
}
