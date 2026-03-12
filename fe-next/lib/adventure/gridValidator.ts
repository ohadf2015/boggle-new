/**
 * Grid Validator
 *
 * Utilities to validate whether specific word paths or paths of a given length
 * exist on a letter grid. Uses DFS with adjacency (including diagonals)
 * and no tile reuse.
 */

/** 8-directional neighbors (including diagonals) */
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
] as const;

/**
 * Check if any valid path of at least `minLength` exists on a 2D grid.
 * Uses DFS from every cell, no tile reuse.
 *
 * @param grid - 2D array of letters
 * @param minLength - Minimum path length to find
 * @returns true if any path of that length exists
 */
export function hasPathOfLength(grid: string[][], minLength: number): boolean {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;
  if (rows * cols < minLength) return false;
  if (minLength <= 0) return true;

  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  function dfs(r: number, c: number, depth: number): boolean {
    if (depth >= minLength) return true;
    visited[r][c] = true;
    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        if (dfs(nr, nc, depth + 1)) {
          visited[r][c] = false;
          return true;
        }
      }
    }
    visited[r][c] = false;
    return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 1)) return true;
    }
  }
  return false;
}

/**
 * Check if a specific word can be formed as a valid path on the grid.
 * Adjacent tiles (including diagonals), no tile reuse. Case-insensitive.
 *
 * @param flatGrid - Flat array of letter strings (row-major order)
 * @param gridSize - Grid dimension (grid is gridSize x gridSize)
 * @param word - Target word to find
 * @returns true if the word exists as a valid path
 */
export function hasWordPath(
  flatGrid: string[],
  gridSize: number,
  word: string
): boolean {
  if (word.length === 0) return true;
  if (flatGrid.length < word.length) return false;

  const upper = word.toUpperCase();
  const rows = gridSize;
  const cols = gridSize;

  // Build 2D grid for easier access
  const grid: string[] = flatGrid.map((l) => l.toUpperCase());

  const visited: boolean[] = new Array(flatGrid.length).fill(false);

  function dfs(idx: number, charIdx: number): boolean {
    if (charIdx >= upper.length) return true;
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    visited[idx] = true;

    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const ni = nr * cols + nc;
        if (!visited[ni] && grid[ni] === upper[charIdx]) {
          if (dfs(ni, charIdx + 1)) {
            visited[idx] = false;
            return true;
          }
        }
      }
    }
    visited[idx] = false;
    return false;
  }

  // Find all starting positions
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === upper[0]) {
      if (dfs(i, 1)) return true;
    }
  }
  return false;
}
