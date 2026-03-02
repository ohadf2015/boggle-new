/**
 * PathValidator — validates Boggle letter paths.
 *
 * Pure functions, zero side effects. Can be used by both
 * the Phaser GameScene and React hooks for pre-validation.
 */

import { isAdjacentCell } from '@/components/grid/gridGeometry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PathCell {
  row: number;
  col: number;
  /** The letter(s) on this tile, e.g. "A" or "QU" */
  letter: string;
}

// ─── isValidPath ──────────────────────────────────────────────────────────────

/**
 * Returns true if the path represents a legal Boggle selection:
 * - At least one cell
 * - No cell repeated
 * - Each consecutive pair of cells is adjacent (8-directional)
 */
export function isValidPath(path: PathCell[]): boolean {
  if (path.length === 0) return false;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];

    // Check for duplicate cell
    if (prev.row === curr.row && prev.col === curr.col) return false;

    // Check adjacency
    if (!isAdjacentCell(prev, curr)) return false;
  }

  // Check for any duplicate cell (not just consecutive pairs)
  const seen = new Set<string>();
  for (const cell of path) {
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }

  return true;
}

// ─── getPathWord ──────────────────────────────────────────────────────────────

/**
 * Concatenate the letters in path order to produce the candidate word.
 * Multi-letter tiles (e.g. "QU") are joined without separator.
 */
export function getPathWord(path: PathCell[]): string {
  return path.map((c) => c.letter).join('');
}
