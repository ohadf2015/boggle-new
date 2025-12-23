/**
 * Word Path Finding Utilities
 *
 * Shared utilities for finding word paths on the game board.
 * Used by ResultsPage, GridComponent, and other components that need
 * to visualize or validate word paths.
 */

import type { GridPosition, LetterGrid } from '@/types';
import { normalizeHebrewLetter } from './utils';

// Re-export for convenience
export { normalizeHebrewLetter } from './utils';

/**
 * Recursively search for a word path on the board starting from a specific cell
 */
export function searchWordPath(
  board: LetterGrid,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  path: GridPosition[]
): GridPosition[] | null {
  // Base case: found complete word
  if (index === word.length) return [...path];

  // Boundary checks
  const firstRow = board[0];
  if (!firstRow || row < 0 || row >= board.length || col < 0 || col >= firstRow.length) {
    return null;
  }

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return null;

  const boardRow = board[row];
  const cell = boardRow?.[col];
  const targetChar = word[index];
  if (!cell || !targetChar) return null;

  // Normalize and compare
  const cellNormalized = normalizeHebrewLetter(cell.toLowerCase());
  if (cellNormalized !== targetChar) return null;

  // Mark as visited and add to path
  visited.add(cellKey);
  path.push({ row, col });

  // Try all 8 adjacent cells
  const directions: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  for (const [dx, dy] of directions) {
    const result = searchWordPath(board, word, row + dx, col + dy, index + 1, visited, path);
    if (result) {
      visited.delete(cellKey);
      return result;
    }
  }

  // Backtrack
  visited.delete(cellKey);
  path.pop();
  return null;
}

/**
 * Find a valid path for a word on the board
 * Returns the path (array of positions) if found, null otherwise
 */
export function getWordPath(word: string, board: LetterGrid | null): GridPosition[] | null {
  const firstRow = board?.[0];
  if (!word || !board || board.length === 0 || !firstRow) return null;

  // Normalize the word
  const wordNormalized = word
    .toLowerCase()
    .split('')
    .map(normalizeHebrewLetter)
    .join('');

  const firstChar = wordNormalized[0];
  if (!firstChar) return null;

  // Try starting from each cell
  for (let i = 0; i < board.length; i++) {
    const boardRow = board[i];
    if (!boardRow) continue;

    for (let j = 0; j < firstRow.length; j++) {
      const cell = boardRow[j];
      if (!cell) continue;

      if (normalizeHebrewLetter(cell.toLowerCase()) === firstChar) {
        const path = searchWordPath(board, wordNormalized, i, j, 0, new Set(), []);
        if (path) return path;
      }
    }
  }

  return null;
}

/**
 * Check if a word can be formed on the board
 */
export function canFormWord(word: string, board: LetterGrid | null): boolean {
  return getWordPath(word, board) !== null;
}
