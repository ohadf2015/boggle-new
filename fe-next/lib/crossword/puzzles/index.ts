// Puzzle pool + daily selection. Seed puzzles (hand-authored, dict-validated) are the current
// content; generated pools can be merged here later (mirrors lib/connections/puzzles/index.ts).

import { buildGrid } from '../grid';
import { pickDaily } from '../daily';
import type { CrosswordPuzzle, PuzzleLocale, Slot } from '../types';
import { EN_SEED, HE_SEED, type SeedPuzzle } from './seed';
import generatedEnJson from '../data/puzzles.en.json';

// Generated EN bank: real 5×5 minis filled from the lexicon-derived clue bank (every answer
// auto-clued from Datamuse→LLM→judged clues). See scripts/crossword/build.ts.
const GENERATED_EN = generatedEnJson as unknown as SeedPuzzle[];

// Generated HE bank: 4×4 minis filled from the Hebrew clue bank. See scripts/crossword/build-he.ts.
// If no puzzles.he.json exists at build time, this will be an empty array (fallback).
let GENERATED_HE: SeedPuzzle[] = [];
try {
  const generatedHeJson = require('../data/puzzles.he.json');
  GENERATED_HE = generatedHeJson as unknown as SeedPuzzle[];
} catch {
  // puzzles.he.json doesn't exist or failed to load — proceed with HE_SEED only.
}

/** Turn a seed (grid + clue-by-answer) into a fully-built puzzle. */
export function buildSeedPuzzle(seed: SeedPuzzle, source: CrosswordPuzzle['source'] = 'authored'): CrosswordPuzzle {
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
    source,
  };
}

const POOLS: Partial<Record<PuzzleLocale, CrosswordPuzzle[]>> = {
  en: [
    ...EN_SEED.map((s) => buildSeedPuzzle(s)),
    ...GENERATED_EN.map((s) => buildSeedPuzzle(s, 'generated')),
  ],
  he: [
    ...HE_SEED.map((s) => buildSeedPuzzle(s)),
    ...GENERATED_HE.map((s) => buildSeedPuzzle(s, 'generated')),
  ],
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
