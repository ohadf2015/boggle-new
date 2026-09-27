import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';
import { getPyramidsForLocale } from './puzzles';
import type { PyramidPuzzle } from './types';

/**
 * Deterministic daily pyramid for (UTC date, locale) — same contract as
 * dailyPuzzleSet: pure function of its inputs so every player on the same day
 * gets the identical pyramid. `pyramid:` prefix keeps the seed stream disjoint
 * from the 5-riddle daily.
 */
export function dailyPyramid(
  dateISO: string,
  locale: string,
  solved?: ReadonlySet<string>,
): PyramidPuzzle | null {
  const pool = getPyramidsForLocale(locale);
  if (pool.length === 0) return null;
  // Skip pyramids this player already beat (pyramid has no shared leaderboard,
  // so per-player selection is safe). Falls back to the full pool once every
  // pyramid is cleared.
  const fresh = solved?.size ? pool.filter((p) => !solved.has(p.id)) : pool;
  const pickFrom = fresh.length > 0 ? fresh : pool;
  const rng = mulberry32(fnv1aHash(`pyramid:${dateISO}:${locale}`));
  return pickFrom[Math.floor(rng() * pickFrom.length)];
}
