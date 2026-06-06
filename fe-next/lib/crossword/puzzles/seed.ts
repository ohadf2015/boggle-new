// Hand-seeded crossword puzzles. These are REAL crosswords — across and down are DIFFERENT
// interlocking words (not symmetric word squares). Every run is validated against the live
// dictionary via scripts/crossword/{findReal,validate}.ts. Clues are keyed by SLOT ID (A1/D2…)
// so distinct across/down clues are possible and two slots may legitimately share a word.
//
// Hebrew grids store NORMALIZED (non-sofit) letters; the renderer applies final forms at word
// end. The frequency-ranked generator + LLM clue pass will expand this set later.
// See docs/2026-06-06-crossword-mode-spec.md.

import type { Difficulty, PuzzleLocale } from '../types';

export interface SeedPuzzle {
  id: string;
  locale: PuzzleLocale;
  difficulty: Difficulty;
  rtl: boolean;
  grid: (string | null)[][];
  /** clue text keyed by slot id (e.g. "A1", "D2"). */
  clues: Record<string, string>;
}

export const EN_SEED: SeedPuzzle[] = [
  {
    id: 'en-mini-001',
    locale: 'en',
    difficulty: 'easy',
    rtl: false,
    // spa/ear/ant across · sea/pan/art down
    grid: [
      ['s', 'p', 'a'],
      ['e', 'a', 'r'],
      ['a', 'n', 't'],
    ],
    clues: {
      A1: 'Place for a relaxing massage',
      A4: 'You hear with it',
      A5: 'Tiny picnic crasher',
      D1: 'Salty body of water',
      D2: 'Frying ___',
      D3: 'Paintings and sculpture',
    },
  },
  {
    id: 'en-mini-002',
    locale: 'en',
    difficulty: 'easy',
    rtl: false,
    // car/ago/bed across · cab/age/rod down
    grid: [
      ['c', 'a', 'r'],
      ['a', 'g', 'o'],
      ['b', 'e', 'd'],
    ],
    clues: {
      A1: 'It runs on four wheels',
      A4: 'A long time ___',
      A5: 'Where you sleep',
      D1: 'Yellow city taxi',
      D2: 'How old you are',
      D3: 'Fishing ___',
    },
  },
  {
    id: 'en-mini-003',
    locale: 'en',
    difficulty: 'easy',
    rtl: false,
    // cow/are/pet across · cap/ore/wet down
    grid: [
      ['c', 'o', 'w'],
      ['a', 'r', 'e'],
      ['p', 'e', 't'],
    ],
    clues: {
      A1: 'Moo-making farm animal',
      A4: '"You ___ here"',
      A5: 'A cat or dog, e.g.',
      D1: 'Baseball hat',
      D2: 'Rock that metal is mined from',
      D3: 'Soaked through',
    },
  },
];

export const HE_SEED: SeedPuzzle[] = [
  {
    id: 'he-mini-001',
    locale: 'he',
    difficulty: 'easy',
    rtl: true,
    // שמש / מים across · שלם down (normalized מימ / שלמ)
    grid: [
      ['ש', 'מ', 'ש'],
      [null, null, 'ל'],
      ['מ', 'י', 'מ'],
    ],
    clues: {
      A1: 'הכוכב שמאיר ביום',
      A3: 'שותים אותם כשצמאים',
      D2: 'הפוך מחצי; גם: לפרוע חוב',
    },
  },
  {
    id: 'he-mini-002',
    locale: 'he',
    difficulty: 'easy',
    rtl: true,
    // אור across · רוח down
    grid: [
      ['א', 'ו', 'ר'],
      [null, null, 'ו'],
      [null, null, 'ח'],
    ],
    clues: {
      A1: 'הפוך מחושך',
      D2: 'נושבת ומזיזה את העלים',
    },
  },
  {
    id: 'he-mini-003',
    locale: 'he',
    difficulty: 'easy',
    rtl: true,
    // פרי across · ירח down
    grid: [
      ['פ', 'ר', 'י'],
      [null, null, 'ר'],
      [null, null, 'ח'],
    ],
    clues: {
      A1: 'תפוח או בננה, למשל',
      D2: 'מאיר בלילה בשמיים',
    },
  },
];
