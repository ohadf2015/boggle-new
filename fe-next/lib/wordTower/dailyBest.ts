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
