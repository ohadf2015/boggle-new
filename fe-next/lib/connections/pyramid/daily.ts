import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';
import { getPyramidsForLocale } from './puzzles';
import type { PyramidPuzzle } from './types';

/**
 * Deterministic daily pyramid for (UTC date, locale) — same contract as
 * dailyPuzzleSet: pure function of its inputs so every player on the same day
 * gets the identical pyramid. `pyramid:` prefix keeps the seed stream disjoint
 * from the 5-riddle daily.
 */
export function dailyPyramid(dateISO: string, locale: string): PyramidPuzzle | null {
  const pool = getPyramidsForLocale(locale);
  if (pool.length === 0) return null;
  const rng = mulberry32(fnv1aHash(`pyramid:${dateISO}:${locale}`));
  return pool[Math.floor(rng() * pool.length)];
}
