/**
 * blastTargetWordSolver — Pure word path detection on Blast board.
 *
 * BFS/DFS through grid cells, no cell reuse per path.
 * Used to pre-validate target words are solvable on boards before wave start.
 */

import type { LetterGrid } from '../types';

/**
 * Check if a target word can be spelled by traversing adjacent cells on the grid
 * without reusing any cell in the path.
 *
 * @param grid 2D array of letter strings (uppercase or lowercase)
 * @param targetWord word to find (case-insensitive)
 * @returns true if a valid path exists, false otherwise
 */
export function canSpellOnBoard(grid: LetterGrid, targetWord: string): boolean {
  if (!targetWord || targetWord.length === 0) return false;

  const upper = targetWord.toUpperCase();
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;
  if (cols === 0) return false;

  // Find all starting positions for first letter
  const firstLetter = upper[0];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col].toUpperCase() === firstLetter) {
        // Try DFS from this starting position
        const visited = new Set<string>();
        if (dfs(grid, upper, 0, row, col, visited, rows, cols)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * DFS helper: recursively try to match remaining letters in targetWord
 * from a given grid position, avoiding visited cells.
 */
function dfs(
  grid: LetterGrid,
  targetWord: string,
  wordIndex: number,
  row: number,
  col: number,
  visited: Set<string>,
  rows: number,
  cols: number,
): boolean {
  // Mark current cell as visited
  const key = `${row},${col}`;
  visited.add(key);

  // Check if we've matched the entire word
  if (wordIndex === targetWord.length - 1) {
    visited.delete(key);
    return true;
  }

  // Try all 8 adjacent cells (including diagonals)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  const nextLetter = targetWord[wordIndex + 1];

  for (const [dr, dc] of directions) {
    const nextRow = row + dr;
    const nextCol = col + dc;

    // Bounds check
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
      continue;
    }

    // Already visited in this path
    const nextKey = `${nextRow},${nextCol}`;
    if (visited.has(nextKey)) {
      continue;
    }

    // Check if letter matches
    if (grid[nextRow][nextCol].toUpperCase() === nextLetter) {
      if (dfs(grid, targetWord, wordIndex + 1, nextRow, nextCol, visited, rows, cols)) {
        visited.delete(key);
        return true;
      }
    }
  }

  // Backtrack
  visited.delete(key);
  return false;
}
