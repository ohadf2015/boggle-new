// Puzzle pool + daily selection. Seed puzzles (hand-authored, dict-validated) are the current
// content; generated pools can be merged here later (mirrors lib/connections/puzzles/index.ts).

import { buildGrid } from '../grid';
import { pickDaily } from '../daily';
import type { CrosswordPuzzle, PuzzleLocale, Slot } from '../types';
import { EN_SEED, HE_SEED, type SeedPuzzle } from './seed';

/** Turn a hand-authored seed (grid + clue-by-answer) into a fully-built puzzle. */
export function buildSeedPuzzle(seed: SeedPuzzle): CrosswordPuzzle {
  const { size, cells, slots } = buildGrid({ rtl: seed.rtl, solution: seed.grid });
  const cluedSlots: Slot[] = slots.map((s) => ({ ...s, clue: seed.clues[s.id] ?? '' }));
  return {
    id: seed.id,
    locale: seed.locale,
    size,
    rtl: seed.rtl,
    cells,
    slots: cluedSlots,
    difficulty: seed.difficulty,
    source: 'authored',
  };
}

const POOLS: Partial<Record<PuzzleLocale, CrosswordPuzzle[]>> = {
  en: EN_SEED.map(buildSeedPuzzle),
  he: HE_SEED.map(buildSeedPuzzle),
};

function resolveLocale(locale: PuzzleLocale): PuzzleLocale {
  return POOLS[locale] ? locale : 'en';
}

/** All puzzles available for a locale (falls back to en). */
export function getPool(locale: PuzzleLocale): CrosswordPuzzle[] {
  return POOLS[resolveLocale(locale)] ?? [];
}

/** Deterministic daily puzzle for a (date, locale). */
export function getDailyPuzzle(dateISO: string, locale: PuzzleLocale): CrosswordPuzzle | null {
  return pickDaily(getPool(locale), dateISO, resolveLocale(locale));
}

/** Look up a specific puzzle by id (any locale). */
export function getPuzzleById(id: string): CrosswordPuzzle | null {
  for (const pool of Object.values(POOLS)) {
    const found = pool?.find((p) => p.id === id);
    if (found) return found;
  }
  return null;
}
