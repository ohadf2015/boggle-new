/**
 * Deterministic stratified audit sampler (pure).
 *
 * Picks a bounded, reproducible sample of currently-accepted words to re-verify
 * for false-accepts. Seeded so a run is reproducible across the cron + Workflow
 * tiers and in tests. No Math.random (also keeps it Workflow-script-safe).
 */

/**
 * Seeded 32-bit hash → stable, well-distributed, seed-sensitive ordering.
 * FNV-1a over the word, then a nonlinear (murmur-style) avalanche keyed by the
 * seed so a different seed reshuffles the WHOLE ordering (not just a few bits).
 */
function seededHash(word: string, seed: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < word.length; i += 1) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Mix the seed in nonlinearly so distinct seeds yield distinct orderings.
  h ^= Math.imul((seed >>> 0) + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface AuditSampleOptions {
  n: number;
  seed: number;
  /** Spread the sample across word-length buckets. */
  stratifyByLength?: boolean;
}

export function selectAuditSample(words: string[], opts: AuditSampleOptions): string[] {
  const { n, seed, stratifyByLength = false } = opts;
  const pool = Array.from(new Set(words.filter((w) => typeof w === 'string' && w.length > 0)));
  if (pool.length === 0 || n <= 0) return [];
  if (n >= pool.length) {
    // Return all, in deterministic hash order.
    return [...pool].sort((a, b) => seededHash(a, seed) - seededHash(b, seed));
  }

  const byHash = (a: string, b: string) => seededHash(a, seed) - seededHash(b, seed);

  if (!stratifyByLength) {
    return [...pool].sort(byHash).slice(0, n);
  }

  // Stratified: proportional quota per length bucket, then top up to n by global
  // hash order so coverage spans buckets while still returning ~n items.
  const buckets = new Map<number, string[]>();
  for (const w of pool) {
    const arr = buckets.get(w.length) ?? [];
    arr.push(w);
    buckets.set(w.length, arr);
  }
  const lengths = [...buckets.keys()].sort((a, b) => a - b);
  const picked = new Set<string>();
  for (const len of lengths) {
    const bucket = buckets.get(len)!.slice().sort(byHash);
    const quota = Math.max(1, Math.floor((n * bucket.length) / pool.length));
    for (let i = 0; i < quota && i < bucket.length && picked.size < n; i += 1) {
      picked.add(bucket[i]);
    }
  }
  if (picked.size < n) {
    for (const w of [...pool].sort(byHash)) {
      if (picked.size >= n) break;
      picked.add(w);
    }
  }
  return [...picked].sort(byHash).slice(0, n);
}
