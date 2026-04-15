/**
 * gridGenerator — adventure mode grid entry point.
 *
 * Dispatches to language-specific generators and seeds themed letters.
 * Heavy lifting lives in sibling modules:
 *   - gridConstants.ts  letter pools + frequency weights
 *   - gridRandom.ts     Mulberry32 PRNG + weighted pickers
 *   - gridLanguages.ts  per-language grid builders
 */

import type { Language } from '@/types';
import { getThemedWords } from './themedWords';
import { type GridSize } from './gridConstants';
import { createSeededRandom, shuffleArray } from './gridRandom';
import {
  generateEnglishGrid,
  generateHebrewGrid,
  generateSwedishGrid,
  generateJapaneseGrid,
} from './gridLanguages';

// Re-export public surface consumed by other modules (levelConfig, wordForge, lib/adventure barrel).
export {
  VOWELS,
  COMMON_CONSONANTS,
  RARE_CONSONANTS,
} from './gridConstants';
export { getLevelSeed } from './gridRandom';

/**
 * Seeds themed letters from a world's word pool into the grid.
 * Picks 2-4 words that fit within the grid dimensions and places them
 * horizontally or vertically, overwriting random cells.
 * Increases the probability that themed words are findable on the grid.
 */
export function seedThemedLetters(
  grid: string[][],
  world: number,
  gridSize: number,
  random: () => number
): string[][] {
  const words = getThemedWords(world);
  if (!words.length) return grid;

  const fittingWords = words.filter((w) => w.length <= gridSize);
  if (!fittingWords.length) return grid;

  const shuffled = shuffleArray([...fittingWords], random);
  const wordCount = 2 + Math.floor(random() * 3);
  const selected = shuffled.slice(0, wordCount);

  for (const word of selected) {
    const horizontal = random() < 0.5;
    if (horizontal) {
      const maxStartCol = gridSize - word.length;
      const row = Math.floor(random() * gridSize);
      const col = Math.floor(random() * (maxStartCol + 1));
      for (let i = 0; i < word.length; i++) {
        grid[row][col + i] = word[i];
      }
    } else {
      const maxStartRow = gridSize - word.length;
      const row = Math.floor(random() * (maxStartRow + 1));
      const col = Math.floor(random() * gridSize);
      for (let i = 0; i < word.length; i++) {
        grid[row + i][col] = word[i];
      }
    }
  }

  return grid;
}

/**
 * Generate a letter grid for adventure mode.
 *
 * @param size     Grid size (4, 5, 6, or 7)
 * @param seed     Optional seed for reproducible grids
 * @param language Language for the grid (default: 'en')
 * @param world    Optional adventure world number for themed letter seeding
 */
export function generateAdventureGrid(
  size: GridSize,
  seed?: number,
  language: Language = 'en',
  world?: number
): string[][] {
  const random =
    seed !== undefined ? createSeededRandom(seed) : Math.random.bind(Math);

  let grid: string[][];
  switch (language) {
    case 'he':
      grid = generateHebrewGrid(size, random);
      break;
    case 'sv':
      grid = generateSwedishGrid(size, random);
      break;
    case 'ja':
      grid = generateJapaneseGrid(size, random);
      break;
    case 'en':
    default:
      grid = generateEnglishGrid(size, random);
  }

  if (world !== undefined && language === 'en') {
    seedThemedLetters(grid, world, size, random);
  }

  return grid;
}
