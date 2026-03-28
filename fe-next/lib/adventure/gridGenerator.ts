/**
 * gridGenerator
 *
 * Generates letter grids for adventure mode levels.
 * Supports multiple languages with appropriate letter distributions.
 */

import type { Language } from '@/types';
import {
  hebrewLetters,
  swedishLetters,
  japaneseLetters,
  kanjiCompounds,
} from '@/utils/consts';

// ==============================================
// ENGLISH CONSTANTS (default)
// ==============================================

/** Vowels for word formation */
export const VOWELS = ['A', 'E', 'I', 'O', 'U'];

/** Common consonants that form many words */
export const COMMON_CONSONANTS = [
  'R',
  'S',
  'T',
  'L',
  'N',
  'D',
  'C',
  'M',
  'P',
  'B',
];

/** Less common consonants */
export const RARE_CONSONANTS = [
  'F',
  'G',
  'H',
  'K',
  'V',
  'W',
  'Y',
  'J',
  'X',
  'Q',
  'Z',
];

// Letter frequency weights (based on English word usage)
const ENGLISH_LETTER_WEIGHTS: Record<string, number> = {
  E: 12,
  T: 9,
  A: 8,
  O: 8,
  I: 7,
  N: 7,
  S: 6,
  H: 6,
  R: 6,
  D: 4,
  L: 4,
  C: 3,
  U: 3,
  M: 3,
  W: 2,
  F: 2,
  G: 2,
  Y: 2,
  P: 2,
  B: 1,
  V: 1,
  K: 1,
  J: 1,
  X: 1,
  Q: 1,
  Z: 1,
};

// ==============================================
// HEBREW CONSTANTS
// ==============================================

/** Hebrew vowel-like letters (matres lectionis + common letters) */
const HEBREW_COMMON_LETTERS = ['א', 'ה', 'ו', 'י', 'ל', 'מ', 'נ', 'ר', 'ש', 'ת'];

/** Hebrew letter frequency weights (based on Hebrew word usage) */
const HEBREW_LETTER_WEIGHTS: Record<string, number> = {
  'י': 10, // yod - most common
  'ו': 9,  // vav
  'ה': 8,  // he
  'א': 7,  // alef
  'ל': 7,  // lamed
  'מ': 6,  // mem
  'ר': 6,  // resh
  'נ': 5,  // nun
  'ש': 5,  // shin
  'ת': 5,  // tav
  'ב': 4,  // bet
  'כ': 4,  // kaf
  'ע': 4,  // ayin
  'ד': 3,  // dalet
  'ח': 3,  // chet
  'ק': 3,  // qof
  'פ': 2,  // pe
  'ס': 2,  // samekh
  'ג': 2,  // gimel
  'ז': 2,  // zayin
  'צ': 2,  // tsade
  'ט': 1,  // tet
};

// ==============================================
// SWEDISH CONSTANTS
// ==============================================

/** Swedish common letters */
const SWEDISH_COMMON_LETTERS = ['A', 'E', 'I', 'O', 'R', 'S', 'T', 'N', 'L', 'D'];

/** Swedish letter frequency weights */
const SWEDISH_LETTER_WEIGHTS: Record<string, number> = {
  E: 10,
  A: 9,
  N: 8,
  R: 7,
  T: 7,
  S: 6,
  I: 6,
  L: 5,
  O: 5,
  D: 4,
  K: 4,
  M: 4,
  G: 3,
  H: 3,
  V: 3,
  Ä: 3,
  Å: 2,
  Ö: 2,
  F: 2,
  P: 2,
  U: 2,
  B: 2,
  C: 1,
  J: 1,
  Y: 1,
  X: 1,
  Z: 1,
  W: 1,
  Q: 1,
};

// ==============================================
// JAPANESE CONSTANTS
// ==============================================

// Japanese uses kanji compounds, so the approach is different
// We embed common kanji compounds into the grid

// ==============================================
// SEEDED RANDOM
// ==============================================

/** Fisher-Yates shuffle in place — O(n) vs sort's O(n log n) */
function shuffleArray<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Simple seeded random number generator (Mulberry32)
 * Returns a function that generates pseudo-random numbers [0, 1)
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function (): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==============================================
// GRID GENERATOR
// ==============================================

type GridSize = 4 | 5 | 6 | 7;

/**
 * Generate a letter grid for adventure mode
 *
 * @param size - Grid size (4, 5, 6, or 7)
 * @param seed - Optional seed for reproducible grids
 * @param language - Language for the grid (default: 'en')
 * @returns 2D array of letters appropriate for the language
 */
export function generateAdventureGrid(
  size: GridSize,
  seed?: number,
  language: Language = 'en'
): string[][] {
  // Use seeded random if provided, otherwise Math.random
  const random =
    seed !== undefined ? createSeededRandom(seed) : Math.random.bind(Math);

  // Generate grid based on language
  switch (language) {
    case 'he':
      return generateHebrewGrid(size, random);
    case 'sv':
      return generateSwedishGrid(size, random);
    case 'ja':
      return generateJapaneseGrid(size, random);
    case 'en':
    default:
      return generateEnglishGrid(size, random);
  }
}

/**
 * Generate an English letter grid
 */
function generateEnglishGrid(size: GridSize, random: () => number): string[][] {
  const totalTiles = size * size;

  // Calculate target letter counts for good distribution
  const minVowels = Math.ceil(totalTiles * 0.28); // ~28% vowels
  const targetCommon = Math.ceil(totalTiles * 0.45); // ~45% common consonants

  // Build letter pool
  const letters: string[] = [];

  // Add vowels (ensuring minimum)
  for (let i = 0; i < minVowels; i++) {
    letters.push(weightedRandomLetter(VOWELS, random));
  }

  // Add common consonants
  for (let i = 0; i < targetCommon; i++) {
    letters.push(weightedRandomLetter(COMMON_CONSONANTS, random));
  }

  // Fill remaining with weighted random from full alphabet
  while (letters.length < totalTiles) {
    letters.push(weightedRandomFromWeights(ENGLISH_LETTER_WEIGHTS, random));
  }

  // Shuffle and build grid
  shuffle(letters, random);
  return buildGrid(letters, size);
}

/**
 * Generate a Hebrew letter grid
 */
function generateHebrewGrid(size: GridSize, random: () => number): string[][] {
  const totalTiles = size * size;

  // Hebrew needs ~35% common letters for word formation
  const targetCommon = Math.ceil(totalTiles * 0.35);

  const letters: string[] = [];

  // Add common Hebrew letters
  for (let i = 0; i < targetCommon; i++) {
    letters.push(weightedRandomLetter(HEBREW_COMMON_LETTERS, random));
  }

  // Fill remaining with weighted random from Hebrew alphabet
  while (letters.length < totalTiles) {
    letters.push(weightedRandomFromWeights(HEBREW_LETTER_WEIGHTS, random));
  }

  // Shuffle and build grid
  shuffle(letters, random);
  return buildGrid(letters, size);
}

/**
 * Generate a Swedish letter grid
 */
function generateSwedishGrid(size: GridSize, random: () => number): string[][] {
  const totalTiles = size * size;

  // Swedish vowels + common consonants (~28% vowels, 45% common)
  const swedishVowels = ['A', 'E', 'I', 'O', 'U', 'Å', 'Ä', 'Ö'];
  const minVowels = Math.ceil(totalTiles * 0.30); // ~30% vowels (including Å, Ä, Ö)
  const targetCommon = Math.ceil(totalTiles * 0.40);

  const letters: string[] = [];

  // Add vowels
  for (let i = 0; i < minVowels; i++) {
    letters.push(weightedRandomLetter(swedishVowels, random));
  }

  // Add common consonants
  for (let i = 0; i < targetCommon; i++) {
    letters.push(weightedRandomLetter(SWEDISH_COMMON_LETTERS, random));
  }

  // Fill remaining with weighted random
  while (letters.length < totalTiles) {
    letters.push(weightedRandomFromWeights(SWEDISH_LETTER_WEIGHTS, random));
  }

  // Shuffle and build grid
  shuffle(letters, random);
  return buildGrid(letters, size);
}

/**
 * Generate a Japanese kanji grid
 * Japanese grids embed common kanji compounds for playability
 */
function generateJapaneseGrid(size: GridSize, random: () => number): string[][] {
  const rows = size;
  const cols = size;
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 4); // Embed more compounds

  // Shuffle compounds using Fisher-Yates
  const shuffledCompounds = shuffleArray([...kanjiCompounds], random);
  const twoCharCompounds = shuffledCompounds.filter((w) => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter((w) => w.length === 3);

  let embeddedCount = 0;

  // Embed 3-character compounds first (fewer)
  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompound(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  // Then 2-character compounds
  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompound(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  // Fill remaining with random kanji
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(random() * japaneseLetters.length);
        grid[i][j] = japaneseLetters[randomIndex];
      }
    }
  }

  return grid as string[][];
}

/**
 * Try to embed a kanji compound into the grid
 */
function tryEmbedCompound(
  grid: (string | null)[][],
  compound: string,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  random: () => number
): boolean {
  const wordLen = compound.length;
  const directions = [
    { dr: 0, dc: 1 },  // right
    { dr: 0, dc: -1 }, // left
    { dr: 1, dc: 0 },  // down
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 1 },  // diagonal down-right
    { dr: 1, dc: -1 }, // diagonal down-left
    { dr: -1, dc: 1 }, // diagonal up-right
    { dr: -1, dc: -1 }, // diagonal up-left
  ];

  const shuffledDirs = shuffleArray([...directions], random);
  const attempts = 40;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);

    for (const dir of shuffledDirs) {
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        continue;
      }

      let canPlace = true;
      const cellsToUse: Array<{ r: number; c: number; char: string }> = [];

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;

        if (grid[r][c] !== null && grid[r][c] !== compound[i]) {
          canPlace = false;
          break;
        }

        cellsToUse.push({ r, c, char: compound[i] });
      }

      if (canPlace) {
        for (const cell of cellsToUse) {
          grid[cell.r][cell.c] = cell.char;
          usedCells.add(`${cell.r},${cell.c}`);
        }
        return true;
      }
    }
  }

  return false;
}

/**
 * Pick a random letter from a subset
 */
function weightedRandomLetter(subset: string[], random: () => number): string {
  return subset[Math.floor(random() * subset.length)];
}

/** Pre-computed weighted pool cache to avoid rebuilding each call */
const weightedPoolCache = new Map<Record<string, number>, string[]>();

/**
 * Pick a weighted random letter from a weights map
 * Caches the expanded pool so it's built once per weights object
 */
function weightedRandomFromWeights(
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
 * Fisher-Yates shuffle with seeded random
 */
function shuffle(array: string[], random: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Build a 2D grid from a 1D array of letters
 */
function buildGrid(letters: string[], size: number): string[][] {
  const grid: string[][] = [];
  for (let row = 0; row < size; row++) {
    const gridRow: string[] = [];
    for (let col = 0; col < size; col++) {
      gridRow.push(letters[row * size + col]);
    }
    grid.push(gridRow);
  }
  return grid;
}

/**
 * Generate a grid seed from world and level numbers
 * Provides consistent grids for the same level across plays
 */
export function getLevelSeed(world: number, level: number): number {
  return world * 1000 + level;
}
