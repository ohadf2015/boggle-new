import type { LetterGrid } from '@/shared/types/game';
import type { BlastTileState } from '../types';

/** Mask cleared tiles so dead-end detection only searches letters still on the board. */
export function buildDeadEndGrid(
  grid: LetterGrid,
  tiles: BlastTileState[][],
): string[][] {
  return grid.map((row, ri) =>
    row.map((cell, ci) => {
      const t = tiles[ri]?.[ci];
      if (!t || t.isCleared) return '';
      return cell;
    }),
  );
}
