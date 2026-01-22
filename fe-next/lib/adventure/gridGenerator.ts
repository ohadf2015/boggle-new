/**
 * gridGenerator
 *
 * Generates letter grids for adventure mode levels.
 * Ensures good letter distribution for word formation.
 */

// ==============================================
// CONSTANTS
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
const LETTER_WEIGHTS: Record<string, number> = {
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
// SEEDED RANDOM
// ==============================================

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
 * @returns 2D array of uppercase letters
 */
export function generateAdventureGrid(
  size: GridSize,
  seed?: number
): string[][] {
  // Use seeded random if provided, otherwise Math.random
  const random =
    seed !== undefined ? createSeededRandom(seed) : Math.random.bind(Math);

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
    letters.push(weightedRandomFromAlphabet(random));
  }

  // Shuffle the letters
  shuffle(letters, random);

  // Build 2D grid
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
 * Pick a random letter from a subset
 */
function weightedRandomLetter(subset: string[], random: () => number): string {
  return subset[Math.floor(random() * subset.length)];
}

/**
 * Pick a weighted random letter from full alphabet
 */
function weightedRandomFromAlphabet(random: () => number): string {
  // Build weighted pool
  const pool: string[] = [];
  for (const [letter, weight] of Object.entries(LETTER_WEIGHTS)) {
    for (let i = 0; i < weight; i++) {
      pool.push(letter);
    }
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
 * Generate a grid seed from world and level numbers
 * Provides consistent grids for the same level across plays
 */
export function getLevelSeed(world: number, level: number): number {
  return world * 1000 + level;
}
