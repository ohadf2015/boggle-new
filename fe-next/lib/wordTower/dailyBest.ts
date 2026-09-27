/**
 * Word Tower — Daily best tracking (pure).
 *
 * Completes the daily routine loop: each UTC day everyone climbs the same tower,
 * so the meaningful comparison is against YOUR own best on that day. This stores
 * today's best (whole metres) and decides when to celebrate beating it — once,
 * when you first climb past the best you started the run with.
 */

/**
 * Per-day localStorage slot for today's best CLIMB (metres built today).
 *
 * Renamed from `wt-daily-best-*`, which held a cumulative tower height. The key
 * had to change with the meaning: a device still holding yesterday's cumulative
 * value (e.g. 334) would fail `merged > stored` against a real climb of 2m and
 * silently suppress every submit for the rest of the day. A new key starts empty,
 * so the first climb submits. Orphaned `wt-daily-best-*` entries are harmless.
 */
export function dailyBestKey(dateKey: string): string {
  return `wt-daily-climb-${dateKey}`;
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
