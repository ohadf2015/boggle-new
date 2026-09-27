import type { BlastTileState } from '@/shared/types/blast';

export type Cell = { row: number; col: number };

export function wordTouchesCake(
  grid: BlastTileState[][],
  word: readonly Cell[],
): string | null {
  for (const { row, col } of word) {
    const cell = grid[row]?.[col];
    if (cell?.type === 'cake' && cell.cakeAnchorUid) return cell.cakeAnchorUid;
  }
  return null;
}

export function decrementCakeHp(
  grid: BlastTileState[][],
  anchorUid: string,
): BlastTileState[][] {
  return grid.map(row => row.map(cell => {
    if (cell.cakeAnchorUid === anchorUid && typeof cell.cakeHp === 'number') {
      return { ...cell, cakeHp: Math.max(0, cell.cakeHp - 1) };
    }
    return cell;
  }));
}

export function getCakeHp(grid: BlastTileState[][], anchorUid: string): number | null {
  for (const row of grid) {
    for (const cell of row) {
      if (cell.cakeAnchorUid === anchorUid && typeof cell.cakeHp === 'number') {
        return cell.cakeHp;
      }
    }
  }
  return null;
}

export function isCakeDestroyed(grid: BlastTileState[][], anchorUid: string): boolean {
  return getCakeHp(grid, anchorUid) === 0;
}

export function cakeAnchorCells(grid: BlastTileState[][], anchorUid: string): Cell[] {
  const out: Cell[] = [];
  for (const row of grid) {
    for (const cell of row) {
      if (cell.cakeAnchorUid === anchorUid) out.push({ row: cell.row, col: cell.col });
    }
  }
  return out;
}
