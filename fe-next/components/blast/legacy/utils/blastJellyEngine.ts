import type { BlastTileState } from '@/shared/types/blast';

export type Cell = { row: number; col: number };

export function decrementJellyForWord(
  grid: BlastTileState[][],
  word: readonly Cell[],
): BlastTileState[][] {
  const next = grid.map(row => row.map(c => ({ ...c })));
  for (const { row, col } of word) {
    const cell = next[row]?.[col];
    if (cell && (cell.jellyLayers ?? 0) > 0) {
      cell.jellyLayers = (cell.jellyLayers ?? 0) - 1;
    }
  }
  return next;
}

export function countJelly(grid: BlastTileState[][]): number {
  let n = 0;
  for (const row of grid) {
    for (const cell of row) {
      if ((cell.jellyLayers ?? 0) > 0) n++;
    }
  }
  return n;
}
