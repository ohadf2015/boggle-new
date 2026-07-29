/**
 * Language-specific adventure grid generators.
 * Each function produces a `size x size` letter grid tuned to its language's
 * frequency distribution, using simplex-noise zones for organic clusters.
 */

import { createNoise2D } from 'simplex-noise';
import { kanjiCompounds, japaneseLetters } from '@/utils/consts';
import {
  VOWELS,
  COMMON_CONSONANTS,
  RARE_CONSONANTS,
  ENGLISH_LETTER_WEIGHTS,
  HEBREW_COMMON_LETTERS,
  HEBREW_LETTER_WEIGHTS,
  SWEDISH_COMMON_LETTERS,
  SWEDISH_LETTER_WEIGHTS,
  SWEDISH_VOWELS,
  type GridSize,
} from './gridConstants';
import {
  shuffleArray,
  weightedRandomLetter,
  weightedRandomFromWeights,
} from './gridRandom';

/**
 * Generate an English letter grid with simplex-noise spatial zones.
 * Noise value at each cell biases toward vowels (high noise) or consonants (low noise),
 * creating organic letter-type clusters that improve word-forming adjacency.
 */
export function generateEnglishGrid(size: GridSize, random: () => number): string[][] {
  const noise2D = createNoise2D(random);
  const grid: string[][] = [];

  let vowelCount = 0;
  const totalTiles = size * size;
  const minVowels = Math.ceil(totalTiles * 0.28);

  for (let row = 0; row < size; row++) {
    const gridRow: string[] = [];
    for (let col = 0; col < size; col++) {
      const n = (noise2D(row * 0.8, col * 0.8) + 1) / 2;

      let letter: string;
      if (n > 0.55) {
        letter = weightedRandomLetter(VOWELS, random);
        vowelCount++;
      } else if (n < 0.35) {
        letter = random() < 0.2
          ? weightedRandomLetter(RARE_CONSONANTS, random)
          : weightedRandomLetter(COMMON_CONSONANTS, random);
      } else {
        letter = weightedRandomFromWeights(ENGLISH_LETTER_WEIGHTS, random);
        if (VOWELS.includes(letter)) vowelCount++;
      }
      gridRow.push(letter);
    }
    grid.push(gridRow);
  }

  if (vowelCount < minVowels) {
    const deficit = minVowels - vowelCount;
    let replaced = 0;
    for (let row = 0; row < size && replaced < deficit; row++) {
      for (let col = 0; col < size && replaced < deficit; col++) {
        if (!VOWELS.includes(grid[row][col])) {
          grid[row][col] = weightedRandomLetter(VOWELS, random);
          replaced++;
        }
      }
    }
  }

  return grid;
}

/**
 * Generate a Hebrew letter grid with simplex-noise spatial zones.
 * High-noise cells favor common letters (matres lectionis), creating
 * word-forming clusters similar to the English spatial approach.
 */
export function generateHebrewGrid(size: GridSize, random: () => number): string[][] {
  const noise2D = createNoise2D(random);
  const grid: string[][] = [];

  let commonCount = 0;
  const totalTiles = size * size;
  const minCommon = Math.ceil(totalTiles * 0.35);

  for (let row = 0; row < size; row++) {
    const gridRow: string[] = [];
    for (let col = 0; col < size; col++) {
      const n = (noise2D(row * 0.8, col * 0.8) + 1) / 2;

      let letter: string;
      if (n > 0.5) {
        letter = weightedRandomLetter(HEBREW_COMMON_LETTERS, random);
        commonCount++;
      } else {
        letter = weightedRandomFromWeights(HEBREW_LETTER_WEIGHTS, random);
        if (HEBREW_COMMON_LETTERS.includes(letter)) commonCount++;
      }
      gridRow.push(letter);
    }
    grid.push(gridRow);
  }

  if (commonCount < minCommon) {
    const deficit = minCommon - commonCount;
    let replaced = 0;
    for (let row = 0; row < size && replaced < deficit; row++) {
      for (let col = 0; col < size && replaced < deficit; col++) {
        if (!HEBREW_COMMON_LETTERS.includes(grid[row][col])) {
          grid[row][col] = weightedRandomLetter(HEBREW_COMMON_LETTERS, random);
          replaced++;
        }
      }
    }
  }

  return grid;
}

/**
 * Generate a Swedish letter grid with simplex-noise spatial zones.
 */
export function generateSwedishGrid(size: GridSize, random: () => number): string[][] {
  const noise2D = createNoise2D(random);
  const grid: string[][] = [];

  let vowelCount = 0;
  const totalTiles = size * size;
  const minVowels = Math.ceil(totalTiles * 0.30);

  for (let row = 0; row < size; row++) {
    const gridRow: string[] = [];
    for (let col = 0; col < size; col++) {
      const n = (noise2D(row * 0.8, col * 0.8) + 1) / 2;

      let letter: string;
      if (n > 0.55) {
        letter = weightedRandomLetter(SWEDISH_VOWELS, random);
        vowelCount++;
      } else if (n < 0.35) {
        letter = weightedRandomLetter(SWEDISH_COMMON_LETTERS, random);
      } else {
        letter = weightedRandomFromWeights(SWEDISH_LETTER_WEIGHTS, random);
        if (SWEDISH_VOWELS.includes(letter)) vowelCount++;
      }
      gridRow.push(letter);
    }
    grid.push(gridRow);
  }

  if (vowelCount < minVowels) {
    const deficit = minVowels - vowelCount;
    let replaced = 0;
    for (let row = 0; row < size && replaced < deficit; row++) {
      for (let col = 0; col < size && replaced < deficit; col++) {
        if (!SWEDISH_VOWELS.includes(grid[row][col])) {
          grid[row][col] = weightedRandomLetter(SWEDISH_VOWELS, random);
          replaced++;
        }
      }
    }
  }

  return grid;
}

/**
 * Generate a Japanese kanji grid.
 * Embeds common kanji compounds for playability, then fills with random kanji.
 */
export function generateJapaneseGrid(size: GridSize, random: () => number): string[][] {
  const rows = size;
  const cols = size;
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 4);

  const shuffledCompounds = shuffleArray([...kanjiCompounds], random);
  const twoCharCompounds = shuffledCompounds.filter((w) => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter((w) => w.length === 3);

  let embeddedCount = 0;

  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompound(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompound(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

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
 * Try to embed a kanji compound into the grid along a random direction.
 * Returns true on success.
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
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: -1, dc: -1 },
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
