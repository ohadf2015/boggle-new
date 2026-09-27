// Deterministic daily puzzle selection. Pure function of (date, locale) so every device on
// the same calendar day gets the same puzzle (matches lib/connections/daily.ts approach).

import type { CrosswordPuzzle, PuzzleLocale } from './types';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

/** Pick the puzzle for a given UTC date + locale from a pool. Deterministic; null if empty. */
export function pickDaily(
  pool: readonly CrosswordPuzzle[],
  dateISO: string,
  locale: PuzzleLocale,
): CrosswordPuzzle | null {
  if (pool.length === 0) return null;
  const rng = mulberry32(fnv1aHash(`${dateISO}:${locale}`));
  const idx = Math.floor(rng() * pool.length) % pool.length;
  return pool[idx] ?? null;
}
