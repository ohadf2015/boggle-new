/**
 * Web Worker for dead-end detection in Blast mode.
 *
 * Offloads the DFS-based hasValidWords computation off the main thread
 * to prevent UI jank under load.
 *
 * Message protocol:
 *   IN:  { type: 'hasValidWords', grid, foundWords, minLength, maxLength, validWords }
 *   OUT: { type: 'hasValidWords', result: boolean }
 *
 *   IN:  { type: 'findHintPath', grid, foundWords, minLength, maxLength, validWords }
 *   OUT: { type: 'findHintPath', result: HintPathResult | null }
 *
 * `validWords` is a string[] of all valid dictionary words. The worker builds
 * a Set internally for O(1) lookups, avoiding the need to transfer a function.
 */

const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function dfs(
  grid: string[][],
  row: number,
  col: number,
  current: string,
  visited: Set<string>,
  dictionary: Set<string>,
  foundWords: Set<string>,
  minLength: number,
  maxLength: number,
  budget: { remaining: number },
): boolean {
  // Budget exhausted → conservative "words remain" (never a false dead-end).
  // Without a bound, a grid with NO remaining words forces full path-space
  // enumeration (billions of paths on 6x6) and hangs the worker.
  if (budget.remaining <= 0) return true;
  budget.remaining -= 1;

  const cell = grid[row]?.[col];
  if (!cell) return false;

  const key = `${row},${col}`;
  if (visited.has(key)) return false;

  const word = current + cell.toLowerCase();
  if (word.length > maxLength) return false;

  if (word.length >= minLength && !foundWords.has(word) && dictionary.has(word)) {
    return true;
  }

  visited.add(key);

  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      if (dfs(grid, nr, nc, word, visited, dictionary, foundWords, minLength, maxLength, budget)) {
        visited.delete(key);
        return true;
      }
    }
  }

  visited.delete(key);
  return false;
}

interface HintPathResult {
  word: string;
  path: Array<{ row: number; col: number }>;
}

function dfsFindPath(
  grid: string[][],
  row: number,
  col: number,
  current: string,
  currentPath: Array<{ row: number; col: number }>,
  visited: Set<string>,
  dictionary: Set<string>,
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

  if (word.length >= minLength && !foundWords.has(word) && dictionary.has(word)) {
    return { word, path };
  }

  visited.add(key);

  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      const result = dfsFindPath(grid, nr, nc, word, path, visited, dictionary, foundWords, minLength, maxLength);
      if (result) {
        visited.delete(key);
        return result;
      }
    }
  }

  visited.delete(key);
  return null;
}

function hasValidWordsImpl(
  grid: string[][],
  dictionary: Set<string>,
  foundWords: Set<string>,
  minLength: number,
  maxLength: number,
): boolean {
  if (!grid.length || !grid[0]?.length) return false;
  const rows = grid.length;
  const cols = grid[0].length;
  const budget = { remaining: 500_000 };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      if (dfs(grid, r, c, '', new Set(), dictionary, foundWords, minLength, maxLength, budget)) {
        return true;
      }
    }
  }
  return false;
}

function findHintPathImpl(
  grid: string[][],
  dictionary: Set<string>,
  foundWords: Set<string>,
  minLength: number,
  maxLength: number,
): HintPathResult | null {
  if (!grid.length || !grid[0]?.length) return null;
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue;
      const result = dfsFindPath(grid, r, c, '', [], new Set(), dictionary, foundWords, minLength, maxLength);
      if (result) return result;
    }
  }
  return null;
}

// Worker message handler
self.onmessage = (e: MessageEvent) => {
  const { type, grid, foundWords, minLength, maxLength, validWords } = e.data;

  const dictionary = new Set<string>(validWords);
  const found = new Set<string>(foundWords);

  if (type === 'hasValidWords') {
    const result = hasValidWordsImpl(grid, dictionary, found, minLength ?? 2, maxLength ?? 8);
    self.postMessage({ type: 'hasValidWords', result });
  } else if (type === 'findHintPath') {
    const result = findHintPathImpl(grid, dictionary, found, minLength ?? 3, maxLength ?? 8);
    self.postMessage({ type: 'findHintPath', result });
  }
};
