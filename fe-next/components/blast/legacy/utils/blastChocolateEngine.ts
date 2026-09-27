import type { BlastTileState } from '@/shared/types/blast';
import { mulberry32 } from '@/lib/rng/seededRandom';

export type Cell = { row: number; col: number };

export interface SpreadOptions {
  /** Seed used by the deterministic PRNG. Must come from the existing per-turn seed
   *  source (gravity / board-gen) so wave replay + future MP server replication match. */
  seed: number;
  /** Cells in the word the player just played. If any are chocolate, spread is contained. */
  usedCells?: readonly Cell[];
}

export function isChocolateContained(grid: BlastTileState[][], usedCells: readonly Cell[]): boolean {
  for (const { row, col } of usedCells) {
    if (grid[row]?.[col]?.type === 'chocolate') return true;
  }
  return false;
}

export function countChocolate(grid: BlastTileState[][]): number {
  let n = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type === 'chocolate' && !cell.isCleared) n++;
    }
  }
  return n;
}

export function isBoardSwallowed(grid: BlastTileState[][]): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (cell.isCleared) continue;
      if (cell.type !== 'chocolate') return false;
    }
  }
  return true;
}

export function spreadChocolate(grid: BlastTileState[][], opts: SpreadOptions): BlastTileState[][] {
  const used = opts.usedCells ?? [];
  if (isChocolateContained(grid, used)) return grid.map(r => r.map(c => ({ ...c })));

  // Collect 4-orthogonal neighbours of every chocolate cell that are still standard.
  const candidates: Cell[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].type !== 'chocolate' || grid[r][c].isCleared) continue;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = r + dr, nc = c + dc;
        const t = grid[nr]?.[nc];
        if (t && t.type === 'standard' && !t.isCleared) {
          candidates.push({ row: nr, col: nc });
        }
      }
    }
  }
  if (candidates.length === 0) return grid.map(r => r.map(c => ({ ...c })));

  const rand = mulberry32(opts.seed);
  const pick = candidates[Math.floor(rand() * candidates.length)];

  return grid.map(row => row.map(cell => {
    if (cell.row === pick.row && cell.col === pick.col) {
      return { ...cell, type: 'chocolate' };
    }
    return { ...cell };
  }));
}
