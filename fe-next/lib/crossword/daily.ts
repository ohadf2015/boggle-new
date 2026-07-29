// Deterministic daily puzzle selection. Pure function of (date, locale) so every device on
// the same calendar day gets the same puzzle (matches lib/connections/daily.ts approach).

import type { CrosswordPuzzle, PuzzleLocale } from './types';

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, seedable PRNG → [0,1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick the puzzle for a given UTC date + locale from a pool. Deterministic; null if empty. */
export function pickDaily(
  pool: readonly CrosswordPuzzle[],
  dateISO: string,
  locale: PuzzleLocale,
): CrosswordPuzzle | null {
  if (pool.length === 0) return null;
  const rng = mulberry32(hashSeed(`${dateISO}:${locale}`));
  const idx = Math.floor(rng() * pool.length) % pool.length;
  return pool[idx] ?? null;
}
