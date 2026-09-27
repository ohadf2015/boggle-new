/**
 * blastVerticalScanner - Detects valid vertical words in the blast grid.
 *
 * After tiles fall and new tiles fill gaps, this scanner checks each column
 * top-to-bottom for contiguous runs of non-cleared cells that form valid words.
 * Used for Candy Crush-style cascade chain reactions.
 *
 * Algorithm: O(rows * cols * maxRunLength) — fast for 6x6 grids.
 */

import type { BlastTileState } from '../types';

export interface VerticalWord {
  word: string;
  column: number;
  startRow: number;
  /** Inclusive end row */
  endRow: number;
  path: Array<{ row: number; col: number }>;
}

/**
 * Scan all columns for valid vertical words (3+ letters).
 *
 * Per column: builds contiguous non-cleared "runs", then checks all substrings
 * longest-first within each run. Greedy: once a word is found, those rows are
 * consumed and won't form part of a shorter overlapping word.
 */
export function detectVerticalWords(
  grid: string[][],
  tileStates: BlastTileState[][],
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number = 3,
  /** Only scan these columns (columns that received new tiles from gravity) */
  affectedColumns?: Set<number>,
): VerticalWord[] {
  if (!grid.length || !grid[0]?.length) return [];

  const rows = grid.length;
  const cols = grid[0].length;
  const results: VerticalWord[] = [];

  for (let col = 0; col < cols; col++) {
    // Skip columns that weren't affected by the cascade
    if (affectedColumns && !affectedColumns.has(col)) continue;
    // Build contiguous runs of non-cleared cells in this column
    const runs: Array<{ startRow: number; letters: string[] }> = [];
    let currentRun: { startRow: number; letters: string[] } | null = null;

    for (let row = 0; row < rows; row++) {
      const isCleared = tileStates[row]?.[col]?.isCleared ?? true;
      const isFrozen = tileStates[row]?.[col]?.type === 'frozen';
      // Frozen tiles break contiguous runs (they block cascade detection)
      if (!isCleared && !isFrozen && grid[row][col]) {
        if (!currentRun) {
          currentRun = { startRow: row, letters: [] };
        }
        currentRun.letters.push(grid[row][col]);
      } else {
        if (currentRun) {
          runs.push(currentRun);
          currentRun = null;
        }
      }
    }
    if (currentRun) runs.push(currentRun);

    // For each run, check substrings longest-first (greedy)
    for (const run of runs) {
      if (run.letters.length < minLength) continue;

      // Track which positions within the run are consumed
      const consumed = new Set<number>();

      // Check all windows, longest first
      for (let len = run.letters.length; len >= minLength; len--) {
        for (let start = 0; start <= run.letters.length - len; start++) {
          // Skip if any position in this window is already consumed
          let overlaps = false;
          for (let i = start; i < start + len; i++) {
            if (consumed.has(i)) { overlaps = true; break; }
          }
          if (overlaps) continue;

          const word = run.letters.slice(start, start + len).join('').toLowerCase();

          if (foundWords.has(word)) continue;
          if (!checkWord(word)) continue;

          // Valid word found — consume these positions
          const startRow = run.startRow + start;
          const endRow = run.startRow + start + len - 1;
          const path: Array<{ row: number; col: number }> = [];
          for (let i = start; i < start + len; i++) {
            consumed.add(i);
            path.push({ row: run.startRow + i, col });
          }

          results.push({ word, column: col, startRow, endRow, path });
        }
      }
    }
  }

  return results;
}

/** Result for horizontal words — same shape as VerticalWord but semantically horizontal */
export interface HorizontalWord {
  word: string;
  row: number;
  startCol: number;
  endCol: number;
  path: Array<{ row: number; col: number }>;
}

/**
 * Scan affected rows for valid horizontal words (3+ letters).
 * Mirror of detectVerticalWords but scans rows instead of columns.
 */
export function detectHorizontalWords(
  grid: string[][],
  tileStates: BlastTileState[][],
  checkWord: (word: string) => boolean,
  foundWords: Set<string>,
  minLength: number = 3,
  /** Only scan rows that had tiles affected by gravity */
  affectedRows?: Set<number>,
): HorizontalWord[] {
  if (!grid.length || !grid[0]?.length) return [];

  const rows = grid.length;
  const cols = grid[0].length;
  const results: HorizontalWord[] = [];

  for (let row = 0; row < rows; row++) {
    if (affectedRows && !affectedRows.has(row)) continue;

    const runs: Array<{ startCol: number; letters: string[] }> = [];
    let currentRun: { startCol: number; letters: string[] } | null = null;

    for (let col = 0; col < cols; col++) {
      const isCleared = tileStates[row]?.[col]?.isCleared ?? true;
      const isFrozen = tileStates[row]?.[col]?.type === 'frozen';
      if (!isCleared && !isFrozen && grid[row][col]) {
        if (!currentRun) {
          currentRun = { startCol: col, letters: [] };
        }
        currentRun.letters.push(grid[row][col]);
      } else {
        if (currentRun) {
          runs.push(currentRun);
          currentRun = null;
        }
      }
    }
    if (currentRun) runs.push(currentRun);

    for (const run of runs) {
      if (run.letters.length < minLength) continue;
      const consumed = new Set<number>();

      for (let len = run.letters.length; len >= minLength; len--) {
        for (let start = 0; start <= run.letters.length - len; start++) {
          let overlaps = false;
          for (let i = start; i < start + len; i++) {
            if (consumed.has(i)) { overlaps = true; break; }
          }
          if (overlaps) continue;

          const word = run.letters.slice(start, start + len).join('').toLowerCase();
          if (foundWords.has(word)) continue;
          if (!checkWord(word)) continue;

          const startCol = run.startCol + start;
          const endCol = run.startCol + start + len - 1;
          const path: Array<{ row: number; col: number }> = [];
          for (let i = start; i < start + len; i++) {
            consumed.add(i);
            path.push({ row, col: run.startCol + i });
          }
          results.push({ word, row, startCol, endCol, path });
        }
      }
    }
  }

  return results;
}
