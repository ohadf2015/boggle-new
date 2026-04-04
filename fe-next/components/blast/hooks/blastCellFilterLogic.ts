/**
 * Pure logic for blast cell selectability filtering.
 *
 * Board effects:
 * - ice/frozen: NOT selectable until thawed by an adjacent word
 * - gem: only selectable when current path already has 2+ tiles
 * - all others: always selectable
 */
import type { BlastTileState } from '../types';

type CellCoord = { row: number; col: number };

/** Tiles that require thawing before they can be selected */
const THAWABLE_TYPES = new Set(['ice', 'frozen']);

/**
 * Returns a function (row, col) => boolean indicating if a cell is selectable.
 * @param tileStates - current tile state grid
 * @param currentPath - tiles already selected in the current drag path
 */
export function computeCellFilter(
  tileStates: BlastTileState[][],
  currentPath: CellCoord[],
): (row: number, col: number, currentPathLength?: number) => boolean {
  return (row: number, col: number, currentPathLength?: number): boolean => {
    const tile = tileStates[row]?.[col];
    if (!tile) return false;

    // Cleared tiles — not really on the board
    if (tile.isCleared) return true;

    // Ice/frozen: blocked until thawed
    if (THAWABLE_TYPES.has(tile.type) && !tile.isThawed) {
      return false;
    }

    // Gem: requires 2+ tiles already in path (strategic gating)
    // Use currentPathLength from drag ref when available (avoids stale React state)
    const pathLen = currentPathLength ?? currentPath.length;
    if (tile.type === 'gem' && pathLen < 2) {
      return false;
    }

    return true;
  };
}

/**
 * After a word is submitted, compute which ice/frozen tiles should be thawed.
 * A tile thaws if it's adjacent (8-directional) to any cell in the submitted path.
 */
export function computeThawedCells(
  tileStates: BlastTileState[][],
  path: CellCoord[],
): CellCoord[] {
  const gridSize = tileStates.length;
  const thawed: CellCoord[] = [];
  const seen = new Set<string>();

  // Build a set of path positions for quick lookup
  const pathSet = new Set(path.map(c => `${c.row}-${c.col}`));

  for (const cell of path) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = cell.row + dr;
        const c = cell.col + dc;
        if (r < 0 || r >= gridSize || c < 0 || c >= (tileStates[0]?.length ?? 0)) continue;

        const key = `${r}-${c}`;
        if (seen.has(key) || pathSet.has(key)) continue;
        seen.add(key);

        const tile = tileStates[r]?.[c];
        if (!tile || tile.isCleared || tile.isThawed) continue;
        if (THAWABLE_TYPES.has(tile.type)) {
          thawed.push({ row: r, col: c });
        }
      }
    }
  }

  return thawed;
}
