/**
 * Grid Path Finding & Word Embedding
 *
 * DFS-based path finding for word placement in grids,
 * and functions to embed single or multiple words into grids.
 *
 * Optimizations:
 * - Numeric visited set (row * cols + col) instead of string keys
 * - Fisher-Yates shuffle instead of sort for direction randomization
 * - Pre-allocated direction scratch array to avoid per-call allocations
 * - Smart start position selection: prefer cells with matching first letter
 */

import type { Language, LetterGrid } from '@/types';
import { normalizeHebrewFinalLetters, MIN_SAME_LENGTH_WORDS } from './constants';

/** Fisher-Yates shuffle in place — O(n) vs sort's O(n log n) */
function shuffleInPlace<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Encode row,col as a single number for fast Set operations */
function cellKey(row: number, col: number, cols: number): number {
  return row * cols + col;
}

/**
 * Find a valid adjacent path for a word starting from given position
 * Uses randomized DFS to create varied path shapes
 */
export function findWordPath(
  word: string,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  random: () => number,
  directions: Array<{ dr: number; dc: number }>
): Array<{ row: number; col: number }> | null {
  const path: Array<{ row: number; col: number }> = [];
  const visited = new Set<number>();
  const dirScratch = directions.slice();

  function dfs(row: number, col: number, charIndex: number): boolean {
    if (charIndex === word.length) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const key = cellKey(row, col, cols);
    if (visited.has(key)) return false;

    visited.add(key);
    path.push({ row, col });

    if (charIndex === word.length - 1) return true;

    shuffleInPlace(dirScratch, random);
    for (let d = 0; d < dirScratch.length; d++) {
      if (dfs(row + dirScratch[d].dr, col + dirScratch[d].dc, charIndex + 1)) return true;
    }

    visited.delete(key);
    path.pop();
    return false;
  }

  if (dfs(startRow, startCol, 0)) return path;
  return null;
}

/**
 * Find a valid adjacent path for a word in a partially filled grid
 * Allows placing letters in empty cells or reusing cells with matching letters
 */
export function findWordPathInPartialGrid(
  word: string,
  startRow: number,
  startCol: number,
  rows: number,
  cols: number,
  random: () => number,
  directions: Array<{ dr: number; dc: number }>,
  grid: (string | null)[][],
  _usedCells: Set<string>
): Array<{ row: number; col: number }> | null {
  const path: Array<{ row: number; col: number }> = [];
  const visited = new Set<number>();
  const dirScratch = directions.slice();

  function dfs(row: number, col: number, charIndex: number): boolean {
    if (charIndex === word.length) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const key = cellKey(row, col, cols);
    if (visited.has(key)) return false;

    const cellValue = grid[row][col];
    const neededChar = word[charIndex];
    if (cellValue !== null && cellValue !== neededChar) return false;

    visited.add(key);
    path.push({ row, col });

    if (charIndex === word.length - 1) return true;

    shuffleInPlace(dirScratch, random);
    for (let d = 0; d < dirScratch.length; d++) {
      if (dfs(row + dirScratch[d].dr, col + dirScratch[d].dc, charIndex + 1)) return true;
    }

    visited.delete(key);
    path.pop();
    return false;
  }

  if (dfs(startRow, startCol, 0)) return path;
  return null;
}

/** Standard 8-direction adjacency for grid cells */
export const EIGHT_DIRECTIONS = [
  { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
  { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
  { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
];

/**
 * Embed a word into a grid along a valid adjacent path
 * Then fill remaining cells with random letters
 */
export function embedWordInGrid(
  word: string,
  letters: string[],
  rows: number,
  cols: number,
  random: () => number,
  _language: Language
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const wordUpper = word.toUpperCase();

  let placed = false;

  // Generate shuffled start positions (all cells, since grid is empty)
  const allCells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      allCells.push({ row: r, col: c });
    }
  }
  shuffleInPlace(allCells, random);

  for (const start of allCells) {
    if (placed) break;
    const path = findWordPath(wordUpper, start.row, start.col, rows, cols, random, EIGHT_DIRECTIONS);

    if (path && path.length === wordUpper.length) {
      for (let i = 0; i < path.length; i++) {
        grid[path[i].row][path[i].col] = wordUpper[i];
      }
      placed = true;
    }
  }

  if (!placed) {
    console.warn(`[Daily Puzzle] Using linear fallback for word: ${word}`);
    for (let i = 0; i < wordUpper.length && i < cols; i++) {
      grid[0][i] = wordUpper[i];
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = letters[Math.floor(random() * letters.length)];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Collect grid cells where a given letter already exists, plus some random starts.
 * Trying matching cells first increases letter reuse and packing density.
 */
function getSmartStartPositions(
  firstChar: string,
  grid: (string | null)[][],
  rows: number,
  cols: number,
  random: () => number,
  maxPositions: number
): Array<{ row: number; col: number }> {
  const matching: Array<{ row: number; col: number }> = [];
  const empty: Array<{ row: number; col: number }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === firstChar) {
        matching.push({ row: r, col: c });
      } else if (grid[r][c] === null) {
        empty.push({ row: r, col: c });
      }
    }
  }

  shuffleInPlace(matching, random);
  shuffleInPlace(empty, random);

  // Matching cells first (reuse letters), then empty cells
  const combined = [...matching, ...empty];
  return combined.slice(0, maxPositions);
}

/**
 * Embed multiple words into a grid for survival mode playability
 * First embeds the target word (required), then tries to embed bonus words
 * Finally fills remaining cells with random letters
 *
 * Optimized: uses smart start positions (prefer cells with matching first letter)
 * to reduce wasted attempts and improve letter reuse / grid density.
 */
export function embedMultipleWordsInGrid(
  targetWord: string,
  bonusWords: string[],
  letters: string[],
  rows: number,
  cols: number,
  random: () => number,
  language: Language
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  // Embed target word (REQUIRED)
  let targetUpper = targetWord.toUpperCase();
  if (language === 'he') {
    targetUpper = normalizeHebrewFinalLetters(targetUpper);
  }
  let targetPlaced = false;

  // For the target word on empty grid, any position works — use random starts
  const targetStarts = getSmartStartPositions(
    targetUpper[0], grid, rows, cols, random, 100
  );

  for (const start of targetStarts) {
    if (targetPlaced) break;
    const path = findWordPathInPartialGrid(
      targetUpper, start.row, start.col, rows, cols, random, EIGHT_DIRECTIONS, grid, usedCells
    );

    if (path && path.length === targetUpper.length) {
      for (let i = 0; i < path.length; i++) {
        grid[path[i].row][path[i].col] = targetUpper[i];
        usedCells.add(`${path[i].row},${path[i].col}`);
      }
      targetPlaced = true;
    }
  }

  if (!targetPlaced) {
    console.warn(`[Daily Puzzle] Using linear fallback for target word: ${targetWord}`);
    for (let i = 0; i < targetUpper.length && i < cols; i++) {
      grid[0][i] = targetUpper[i];
      usedCells.add(`0,${i}`);
    }
  }

  // Embed bonus words — prefer starts where first letter already matches
  let embeddedCount = 0;
  let sameLengthEmbedded = 0;
  const targetLength = targetUpper.length;
  const maxBonusWords = 12;

  for (const bonusWord of bonusWords) {
    if (embeddedCount >= maxBonusWords) break;

    const isSameLength = bonusWord.length === targetLength;
    let wordUpper = bonusWord.toUpperCase();
    if (language === 'he') {
      wordUpper = normalizeHebrewFinalLetters(wordUpper);
    }

    const starts = getSmartStartPositions(
      wordUpper[0], grid, rows, cols, random, 30
    );

    let wordPlaced = false;
    for (const start of starts) {
      if (wordPlaced) break;
      const path = findWordPathInPartialGrid(
        wordUpper, start.row, start.col, rows, cols, random, EIGHT_DIRECTIONS, grid, usedCells
      );

      if (path && path.length === wordUpper.length) {
        for (let i = 0; i < path.length; i++) {
          grid[path[i].row][path[i].col] = wordUpper[i];
          usedCells.add(`${path[i].row},${path[i].col}`);
        }
        wordPlaced = true;
        embeddedCount++;
        if (isSameLength) sameLengthEmbedded++;
      }
    }
  }

  if (sameLengthEmbedded < MIN_SAME_LENGTH_WORDS) {
    console.warn(
      `[Daily Puzzle] Only embedded ${sameLengthEmbedded}/${MIN_SAME_LENGTH_WORDS} same-length words for target length ${targetLength}`
    );
  }

  // Fill remaining cells
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        grid[i][j] = letters[Math.floor(random() * letters.length)];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Check if a word can be formed on the grid using adjacent cells
 * Uses DFS to find a valid path for the word
 *
 * NOTE: For Hebrew words, final letters are normalized to regular forms
 * before searching, since grids store regular forms only.
 */
export function isWordOnGrid(word: string, grid: LetterGrid): boolean {
  if (!grid || grid.length === 0 || !word) return false;

  const rows = grid.length;
  const cols = grid[0].length;
  const wordNormalized = normalizeHebrewFinalLetters(word).toUpperCase();

  // Pre-uppercase grid once to avoid repeated .toUpperCase() in DFS
  const upperGrid: string[][] = grid.map(row => row.map(c => c.toUpperCase()));

  const visited = new Set<number>();

  function dfs(row: number, col: number, index: number): boolean {
    if (index === wordNormalized.length) return true;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

    const key = cellKey(row, col, cols);
    if (visited.has(key)) return false;
    if (upperGrid[row][col] !== wordNormalized[index]) return false;

    visited.add(key);
    for (let d = 0; d < EIGHT_DIRECTIONS.length; d++) {
      if (dfs(row + EIGHT_DIRECTIONS[d].dr, col + EIGHT_DIRECTIONS[d].dc, index + 1)) return true;
    }
    visited.delete(key);
    return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (upperGrid[r][c] === wordNormalized[0]) {
        if (dfs(r, c, 0)) return true;
      }
    }
  }

  return false;
}

/**
 * Quick heuristic to check if a word could exist on the grid
 * Checks if all required letters are available (not a full path check)
 */
export function canWordExistOnGrid(word: string, grid: LetterGrid, language: Language): boolean {
  const gridLetters = grid.flat();
  const letterCounts = new Map<string, number>();

  for (const letter of gridLetters) {
    const normalized = letter.toUpperCase();
    letterCounts.set(normalized, (letterCounts.get(normalized) || 0) + 1);
  }

  const wordUpper = word.toUpperCase();
  const wordLetterCounts = new Map<string, number>();

  for (const letter of wordUpper) {
    wordLetterCounts.set(letter, (wordLetterCounts.get(letter) || 0) + 1);
  }

  for (const [letter, count] of wordLetterCounts.entries()) {
    if ((letterCounts.get(letter) || 0) < count) return false;
  }

  return true;
}
