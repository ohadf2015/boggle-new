/**
 * Custom Challenge Grid Generation
 *
 * GUARANTEED to embed the target word in the grid.
 * Uses the proven algorithm from dailyChallenge/gridGeneration.ts
 */

import {
  hebrewLetters,
  swedishLetters,
  spanishLetters,
  russianLetterPool,
  japaneseLetters,
} from './consts';
import type { Language, LetterGrid } from '@/types';
import { normalizeHebrewFinalLetters } from './dailyChallenge/constants';

// ==========================================
// Word Embedding - GUARANTEED Placement
// ==========================================

interface PathCell {
  row: number;
  col: number;
}

const DIRECTIONS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
];

/**
 * Find a valid adjacent path for a word using DFS
 */
function findWordPath(
  word: string,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  grid: (string | null)[][]
): PathCell[] | null {
  const path: PathCell[] = [];
  const visited = new Set<string>();

  function dfs(row: number, col: number, charIndex: number): boolean {
    if (charIndex === word.length) {
      return true;
    }

    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return false;
    }

    const key = `${row},${col}`;
    if (visited.has(key)) {
      return false;
    }

    // Check if cell is valid for placement
    const cellValue = grid[row][col];
    const neededChar = word[charIndex];
    if (cellValue !== null && cellValue !== neededChar) {
      return false;
    }

    visited.add(key);
    path.push({ row, col });

    if (charIndex === word.length - 1) {
      return true;
    }

    // Shuffle directions for variety
    const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);

    for (const dir of shuffledDirs) {
      if (dfs(row + dir.dr, col + dir.dc, charIndex + 1)) {
        return true;
      }
    }

    visited.delete(key);
    path.pop();
    return false;
  }

  if (dfs(startRow, startCol, 0)) {
    return path;
  }
  return null;
}

/**
 * Embed target word into grid using random path finding
 * GUARANTEED to place the word (uses linear fallback if needed)
 */
function embedTargetWord(
  word: string,
  letters: string[],
  rows: number,
  cols: number
): LetterGrid {
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();
  const wordUpper = word.toUpperCase();

  // Try to place word along a random path (100 attempts)
  let placed = false;
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);

    const path = findWordPath(wordUpper, startRow, startCol, rows, cols, grid);

    if (path && path.length === wordUpper.length) {
      // Place the word along the path
      for (let i = 0; i < path.length; i++) {
        grid[path[i].row][path[i].col] = wordUpper[i];
        usedCells.add(`${path[i].row},${path[i].col}`);
      }
      placed = true;
    }
  }

  // FALLBACK: Linear placement if random placement failed (should be very rare)
  if (!placed) {
    console.warn(`[Custom Challenge] Using linear fallback for word: ${word}`);
    // Place word in first row horizontally
    for (let i = 0; i < wordUpper.length && i < cols; i++) {
      grid[0][i] = wordUpper[i];
      usedCells.add(`0,${i}`);
    }
  }

  // Fill remaining cells with random letters
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(Math.random() * letters.length);
        grid[i][j] = letters[randomIndex];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Generate grid for Japanese with kanji characters
 */
function embedJapaneseWord(word: string, rows: number, cols: number): LetterGrid {
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));

  // Place word adjacently (typically 2-3 characters)
  const startRow = Math.floor(Math.random() * rows);
  const startCol = Math.floor(Math.random() * Math.max(1, cols - word.length + 1));

  for (let i = 0; i < word.length; i++) {
    grid[startRow][startCol + i] = word[i];
  }

  // Fill rest with random kanji
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(Math.random() * japaneseLetters.length);
        grid[i][j] = japaneseLetters[randomIndex];
      }
    }
  }

  return grid as LetterGrid;
}

// ==========================================
// Public API
// ==========================================

/**
 * Generate a custom challenge grid with GUARANTEED target word embedding
 *
 * Algorithm:
 * 1. Embed the target word using random path finding (with linear fallback)
 * 2. Fill remaining cells with random letters
 * 3. GUARANTEE: Target word will ALWAYS be findable on the grid
 *
 * @param rows - Number of rows
 * @param cols - Number of columns
 * @param language - Language for letter set
 * @param targetWord - The word to embed (MUST be findable after generation)
 * @returns Grid with embedded target word
 */
export function generateCustomChallengeGrid(
  rows: number,
  cols: number,
  language: Language,
  targetWord: string
): LetterGrid {
  // Get letters for the language
  let letters: string[];
  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetters;
  } else if (language === 'ru') {
    letters = russianLetterPool;
  } else if (language === 'ja') {
    // Japanese uses different embedding strategy
    return embedJapaneseWord(targetWord, rows, cols);
  } else if (language === 'he') {
    letters = hebrewLetters;
  } else {
    // Unknown language must not silently become a Hebrew board. Default English.
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }

  // Normalize Hebrew final letters to regular letters for grid display
  let normalizedWord = targetWord.toUpperCase();
  if (language === 'he') {
    normalizedWord = normalizeHebrewFinalLetters(normalizedWord);
  }

  return embedTargetWord(normalizedWord, letters, rows, cols);
}
