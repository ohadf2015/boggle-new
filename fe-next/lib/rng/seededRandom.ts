/**
 * Shared seeded PRNG + string hash.
 *
 * Consolidated from 11 byte-divergent-but-output-identical copies of `mulberry32`
 * and 3 copies of the FNV-1a hash that were scattered across daily-puzzle, loot,
 * and game-modifier code. Every caller seeds DETERMINISTIC output (same calendar
 * day + locale → same puzzle/roll for every player), so these are leaderboard-
 * integrity critical: changing the numeric output is a behavior change, not a
 * refactor. The canonical bodies below match the prior production output exactly
 * (locked by golden-value tests in ./__tests__/seededRandom.test.ts).
 *
 * NOTE: this is intentionally NOT a home for every seeded hash in the codebase.
 * The DJB2 hash (lib/daily/chestPrizePool), the SplitMix32 numeric mixer
 * (lib/word-craft/modifiers), and the signed FNV variant (lib/blast/
 * blastTreasureRoll) produce DIFFERENT output and must stay separate.
 */

/** mulberry32 — small, fast, seedable PRNG → [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 32-bit unsigned hash of a string (FNV-1a). */
export function fnv1aHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
