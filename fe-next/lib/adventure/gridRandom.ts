/**
 * Seeded randomness + weighted letter helpers for adventure grid generation.
 * Pure functions — no simplex-noise, no language-specific logic.
 */

/** Fisher-Yates shuffle in place — O(n) vs sort's O(n log n) */
export function shuffleArray<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Simple seeded random number generator (Mulberry32).
 * Returns a function that generates pseudo-random numbers [0, 1).
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function (): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a uniformly random letter from a subset array. */
export function weightedRandomLetter(subset: string[], random: () => number): string {
  return subset[Math.floor(random() * subset.length)];
}

/** Pre-computed weighted pool cache to avoid rebuilding each call. */
const weightedPoolCache = new Map<Record<string, number>, string[]>();

/**
 * Pick a weighted random letter from a weights map.
 * Caches the expanded pool so it's built once per weights object.
 */
export function weightedRandomFromWeights(
  weights: Record<string, number>,
  random: () => number
): string {
  let pool = weightedPoolCache.get(weights);
  if (!pool) {
    pool = [];
    for (const [letter, weight] of Object.entries(weights)) {
      for (let i = 0; i < weight; i++) {
        pool.push(letter);
      }
    }
    weightedPoolCache.set(weights, pool);
  }
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Generate a grid seed from world and level numbers.
 * Provides consistent grids for the same level across plays.
 */
export function getLevelSeed(world: number, level: number): number {
  return world * 1000 + level;
}
