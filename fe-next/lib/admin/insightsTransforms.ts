// Pure display-derivation helpers for the admin insights bundle.
// Kept separate from the data fetch so the edge-case logic (ties, empty
// buckets, divide-by-zero) is unit-testable without a DB.

export interface DeltaResult {
  pct: number | null; // null when there is no valid baseline (yesterday=0)
  direction: 'up' | 'down' | 'flat';
}

/**
 * Index (dow or hour value) of the bucket with the most games.
 * Stable on ties (first-seen wins). Returns null for an empty list.
 */
export function peakBucketIndex<K extends string>(
  buckets: Array<Record<K, number> & { games: number }>,
  indexKey: K
): number | null {
  if (buckets.length === 0) return null;
  let best = buckets[0];
  for (const b of buckets) {
    if (b.games > best.games) best = b;
  }
  return best[indexKey];
}

/** Largest games value across buckets; 0 for an empty list. */
export function maxGames(buckets: Array<{ games: number }>): number {
  return buckets.reduce((m, b) => (b.games > m ? b.games : m), 0);
}

/** Scale a value to a 0-100 bar width against the max; 0 when max is 0. */
export function barPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

/**
 * Day-over-day delta. When yesterday is 0 there is no meaningful percentage,
 * so pct is null (direction still reflects whether today rose/stayed).
 */
export function computeDelta(today: number, yesterday: number): DeltaResult {
  if (yesterday === 0) {
    return { pct: null, direction: today > 0 ? 'up' : 'flat' };
  }
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return { pct, direction };
}
