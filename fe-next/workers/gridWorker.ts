/**
 * Grid Worker - Web Worker for CPU-intensive grid operations
 *
 * Handles:
 * - Word path finding (isWordOnBoard, getWordPath)
 * - Batch path computation for multiple words
 * - Grid letter availability checks
 *
 * This offloads computation from the main thread for smoother UI
 */

// Worker message types
export type GridWorkerRequest =
  | { type: 'isWordOnBoard'; id: string; word: string; grid: string[][]; language: string }
  | { type: 'getWordPath'; id: string; word: string; grid: string[][]; language: string }
  | { type: 'batchGetPaths'; id: string; words: string[]; grid: string[][]; language: string }
  | { type: 'couldBeOnBoard'; id: string; word: string; grid: string[][]; language: string };

export type GridWorkerResponse =
  | { type: 'isWordOnBoard'; id: string; result: boolean }
  | { type: 'getWordPath'; id: string; result: { row: number; col: number }[] | null }
  | { type: 'batchGetPaths'; id: string; result: Record<string, { row: number; col: number }[] | null> }
  | { type: 'couldBeOnBoard'; id: string; result: boolean }
  | { type: 'error'; id: string; error: string };

// Direction vectors for 8-way adjacent movement
const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
  [0, -1],           [0, 1],   // left, right
  [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
];

/**
 * Normalize a word based on language
 */
function normalizeWord(word: string, language: string): string {
  if (!word) return '';
  let normalized = word.toLowerCase();

  if (language === 'he') {
    // Hebrew final letter normalization
    normalized = normalized
      .replace(/ך/g, 'כ')
      .replace(/ם/g, 'מ')
      .replace(/ן/g, 'נ')
      .replace(/ף/g, 'פ')
      .replace(/ץ/g, 'צ');
  } else if (language === 'es') {
    // Spanish accent normalization
    normalized = normalized
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/ñ/g, 'n');
  }

  return normalized;
}

/**
 * Build a map of letter positions for efficient path finding
 */
function makePositionsMap(grid: string[][], language: string): Map<string, [number, number][]> {
  const positions = new Map<string, [number, number][]>();
  if (!grid || grid.length === 0) return positions;

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[0].length; j++) {
      const ch = normalizeWord(String(grid[i][j]), language);
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch)!.push([i, j]);
    }
  }
  return positions;
}

/**
 * Check if a word can possibly be on the board (letter availability)
 */
function couldBeOnBoard(word: string, grid: string[][] | null, language: string): boolean {
  if (!grid || !word) return true;

  const normalizedWord = normalizeWord(word, language);
  const flatGrid = grid.flat().map(l => normalizeWord(l, language));

  const letterCounts = new Map<string, number>();
  for (const letter of flatGrid) {
    letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
  }

  for (const letter of normalizedWord) {
    const count = letterCounts.get(letter);
    if (!count || count <= 0) {
      return false;
    }
    letterCounts.set(letter, count - 1);
  }

  return true;
}

/**
 * DFS search for word path
 */
function searchWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
  language: string
): boolean {
  if (index === word.length) return true;
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return false;

  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return false;

  const cellNormalized = normalizeWord(grid[row][col], language);
  if (cellNormalized !== word[index]) return false;

  visited.add(cellKey);

  for (const [dx, dy] of DIRECTIONS) {
    if (searchWord(grid, word, row + dx, col + dy, index + 1, visited, language)) {
      visited.delete(cellKey);
      return true;
    }
  }

  visited.delete(cellKey);
  return false;
}

/**
 * Check if word exists on board as valid path
 */
function isWordOnBoard(word: string, grid: string[][] | null, language: string): boolean {
  if (!grid || !word || grid.length === 0) return false;

  const wordNormalized = normalizeWord(word, language);
  const posMap = makePositionsMap(grid, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    if (searchWord(grid, wordNormalized, startRow, startCol, 0, new Set(), language)) {
      return true;
    }
  }

  return false;
}

/**
 * Find path for a word on the grid
 */
function getWordPath(
  word: string,
  grid: string[][] | null,
  language: string
): { row: number; col: number }[] | null {
  if (!grid || !word || grid.length === 0) return null;

  // Create local reference to satisfy TypeScript in nested function
  const theGrid = grid;
  const rows = theGrid.length;
  const cols = theGrid[0].length;
  const wordNormalized = normalizeWord(word, language);

  function dfs(
    row: number,
    col: number,
    index: number,
    path: { row: number; col: number }[],
    visited: Set<string>
  ): { row: number; col: number }[] | null {
    if (index === wordNormalized.length) return path;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

    const key = `${row},${col}`;
    if (visited.has(key)) return null;

    const cellNormalized = normalizeWord(theGrid[row][col], language);
    if (cellNormalized !== wordNormalized[index]) return null;

    visited.add(key);
    path.push({ row, col });

    for (const [dx, dy] of DIRECTIONS) {
      const result = dfs(row + dx, col + dy, index + 1, path, visited);
      if (result) return result;
    }

    visited.delete(key);
    path.pop();
    return null;
  }

  // Try starting from each matching cell
  const posMap = makePositionsMap(grid, language);
  const startPositions = posMap.get(wordNormalized[0]) || [];

  for (const [startRow, startCol] of startPositions) {
    const path = dfs(startRow, startCol, 0, [], new Set());
    if (path) return path;
  }

  return null;
}

/**
 * Batch get paths for multiple words
 */
function batchGetPaths(
  words: string[],
  grid: string[][] | null,
  language: string
): Record<string, { row: number; col: number }[] | null> {
  const results: Record<string, { row: number; col: number }[] | null> = {};

  for (const word of words) {
    results[word] = getWordPath(word, grid, language);
  }

  return results;
}

// Worker message handler
self.onmessage = (event: MessageEvent<GridWorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case 'isWordOnBoard': {
        const result = isWordOnBoard(request.word, request.grid, request.language);
        self.postMessage({ type: 'isWordOnBoard', id: request.id, result } as GridWorkerResponse);
        break;
      }

      case 'getWordPath': {
        const result = getWordPath(request.word, request.grid, request.language);
        self.postMessage({ type: 'getWordPath', id: request.id, result } as GridWorkerResponse);
        break;
      }

      case 'batchGetPaths': {
        const result = batchGetPaths(request.words, request.grid, request.language);
        self.postMessage({ type: 'batchGetPaths', id: request.id, result } as GridWorkerResponse);
        break;
      }

      case 'couldBeOnBoard': {
        const result = couldBeOnBoard(request.word, request.grid, request.language);
        self.postMessage({ type: 'couldBeOnBoard', id: request.id, result } as GridWorkerResponse);
        break;
      }

      default:
        self.postMessage({ type: 'error', id: (request as { id: string }).id, error: 'Unknown request type' } as GridWorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id: request.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as GridWorkerResponse);
  }
};

// Export for type checking only (not used at runtime)
export {};
