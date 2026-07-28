/**
 * blastDeadEndDetector - Pure utility to detect when no valid words remain
 *
 * Uses DFS from each non-empty cell to build word paths, checking
 * against the dictionary. Stops immediately on first valid word found.
 *
 * Performance: Early termination on first match, maxLength cap (8 chars),
 * cleared cells skipped, visited set prevents cell reuse.
 * HARD BOUND: when NO word exists the DFS must explore the entire path space
 * (billions of paths on 6x6) — the original "<10ms worst case" claim only held
 * when a word is found early. A shared exploration budget aborts the search
 * and conservatively reports "words remain" (never a false dead-end).
 */

const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

/** Max DFS nodes explored before giving up (≈10-50ms). Shared across all
 * start cells of one hasValidWords call. */
const DEAD_END_SEARCH_BUDGET = 500_000;

interface SearchBudget { remaining: number }

/**
 * DFS search building word strings from adjacent cells.
 * Returns true immediately when any valid unfound word is discovered.
 * Also returns true when the exploration budget is exhausted — callers treat
 * "unknown" as "not a dead-end" (safe direction: never ends a live game).
 */
function dfs(
  grid: string[][],
  row: number,
  col: number,
  current: string,
  visited: Set<string>,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number,
  maxLength: number,
  budget: SearchBudget,
): boolean {
  if (budget.remaining <= 0) return true; // budget exhausted → conservative
  budget.remaining -= 1;

  const cell = grid[row]?.[col];
  if (!cell) return false; // Out of bounds or cleared

  const key = `${row},${col}`;
  if (visited.has(key)) return false;

  const word = current + cell.toLowerCase();
  if (word.length > maxLength) return false;

  // Check if this word is valid and not already found
  if (word.length >= minLength && !foundWords.has(word) && checkWord(word)) {
    return true;
  }

  visited.add(key);

  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      if (dfs(grid, nr, nc, word, visited, checkWord, foundWords, minLength, maxLength, budget)) {
        visited.delete(key);
        return true;
      }
    }
  }

  visited.delete(key);
  return false;
}

/** Result type for hint path search */
export interface HintPathResult {
  word: string;
  path: Array<{ row: number; col: number }>;
}

/**
 * DFS that returns the full cell path + word string on first valid word found.
 * Uses backtracking — visited set is mutated and restored on each level.
 */
function dfsFindPath(
  grid: string[][],
  row: number,
  col: number,
  current: string,
  currentPath: Array<{ row: number; col: number }>,
  visited: Set<string>,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number,
  maxLength: number,
): HintPathResult | null {
  const cell = grid[row]?.[col];
  if (!cell) return null;

  const key = `${row},${col}`;
  if (visited.has(key)) return null;

  const word = current + cell.toLowerCase();
  if (word.length > maxLength) return null;

  const path = [...currentPath, { row, col }];

  if (word.length >= minLength && !foundWords.has(word) && checkWord(word)) {
    return { word, path };
  }

  visited.add(key);

  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      const result = dfsFindPath(grid, nr, nc, word, path, visited, checkWord, foundWords, minLength, maxLength);
      if (result) {
        visited.delete(key);
        return result;
      }
    }
  }

  visited.delete(key);
  return null;
}

/**
 * Find a hint word path from remaining tiles.
 * Returns first valid unfound word with its cell path, or null if none exist.
 */
export function findHintPath(
  grid: string[][],
  _language: string,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number = 3,
  maxLength: number = 8,
): HintPathResult | null {
  if (!grid.length || !grid[0]?.length) return null;

  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      const result = dfsFindPath(grid, r, c, '', [], new Set(), checkWord, foundWords, minLength, maxLength);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Check if any valid, unfound words can still be formed on the grid.
 *
 * @param grid - Current grid (empty strings for cleared cells)
 * @param _language - Game language (reserved for future normalization)
 * @param checkWord - Dictionary lookup function (returns true if word is valid)
 * @param foundWords - Set of words already found by the player
 * @param minLength - Minimum word length (default: 2)
 * @param maxLength - Maximum search depth (default: 8)
 * @returns true if at least one valid unfound word exists
 */
export function hasValidWords(
  grid: string[][],
  _language: string,
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number = 2,
  maxLength: number = 8,
): boolean {
  if (!grid.length || !grid[0]?.length) return false;

  const rows = grid.length;
  const cols = grid[0].length;
  const budget: SearchBudget = { remaining: DEAD_END_SEARCH_BUDGET };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue; // Skip cleared cells
      if (dfs(grid, r, c, '', new Set(), checkWord, foundWords, minLength, maxLength, budget)) {
        return true;
      }
    }
  }

  return false;
}
