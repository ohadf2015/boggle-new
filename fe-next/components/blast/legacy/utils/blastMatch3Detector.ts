/**
 * blastMatch3Detector — Detects 3+ identical adjacent letters in rows/columns.
 *
 * This gives Blast Mode the "Candy Crush cascade" feel: after gravity fills gaps,
 * any run of 3+ same letters auto-clears, triggering more gravity, more matches, etc.
 * Layered on top of the existing word-finding mechanic.
 */

import type { BlastTileState } from '../types';

export interface Match3Cluster {
  letter: string;
  direction: 'horizontal' | 'vertical';
  cells: Array<{ row: number; col: number }>;
}

/**
 * Scan grid for runs of 3+ identical letters in rows and columns.
 *
 * @param grid        Current letter grid
 * @param tileStates  Tile states (skips cleared/frozen)
 * @param affectedCols  Optional: only scan columns (vertical) and rows touched by these columns
 */
export function detectMatch3Clusters(
  grid: string[][],
  tileStates: BlastTileState[][],
  affectedCols?: Set<number>,
): Match3Cluster[] {
  if (!grid.length || !grid[0]?.length) return [];

  const rows = grid.length;
  const cols = grid[0].length;
  const results: Match3Cluster[] = [];

  // Track already-matched cells to prevent the same cell appearing in both
  // a horizontal and a vertical cluster (which would double-clear it)
  const matched = new Set<string>();

  const isUsable = (r: number, c: number): boolean => {
    const tile = tileStates[r]?.[c];
    if (!tile) return false;
    if (tile.isCleared) return false;
    if (tile.type === 'frozen') return false;
    return true;
  };

  const letterAt = (r: number, c: number): string =>
    (grid[r]?.[c] ?? '').toUpperCase();

  // Horizontal scan
  for (let r = 0; r < rows; r++) {
    let runStart = 0;
    while (runStart < cols) {
      if (!isUsable(r, runStart)) { runStart++; continue; }

      const letter = letterAt(r, runStart);
      let runEnd = runStart + 1;
      while (runEnd < cols && isUsable(r, runEnd) && letterAt(r, runEnd) === letter) {
        runEnd++;
      }

      const runLen = runEnd - runStart;
      if (runLen >= 3) {
        const cells: Array<{ row: number; col: number }> = [];
        for (let c = runStart; c < runEnd; c++) {
          cells.push({ row: r, col: c });
          matched.add(`${r}-${c}`);
        }
        results.push({ letter, direction: 'horizontal', cells });
      }

      runStart = runEnd;
    }
  }

  // Vertical scan — skip cells already claimed by horizontal matches
  for (let c = 0; c < cols; c++) {
    if (affectedCols && !affectedCols.has(c)) continue;

    let runStart = 0;
    while (runStart < rows) {
      if (!isUsable(runStart, c) || matched.has(`${runStart}-${c}`)) { runStart++; continue; }

      const letter = letterAt(runStart, c);
      let runEnd = runStart + 1;
      while (runEnd < rows && isUsable(runEnd, c) && !matched.has(`${runEnd}-${c}`) && letterAt(runEnd, c) === letter) {
        runEnd++;
      }

      const runLen = runEnd - runStart;
      if (runLen >= 3) {
        const cells: Array<{ row: number; col: number }> = [];
        for (let r = runStart; r < runEnd; r++) {
          cells.push({ row: r, col: c });
          matched.add(`${r}-${c}`);
        }
        results.push({ letter, direction: 'vertical', cells });
      }

      runStart = runEnd;
    }
  }

  return results;
}
