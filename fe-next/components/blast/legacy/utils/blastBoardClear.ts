import type { BlastTileState } from '../types';

/** Calculate board clear percentage (0-100) from tile states */
export function getBoardClearPercentage(tileStates: BlastTileState[][]): number {
  const flat = tileStates.flat();
  if (flat.length === 0) return 0;
  const cleared = flat.filter(t => t.isCleared).length;
  return Math.round((cleared / flat.length) * 100);
}

/** Check if every tile on the board is cleared (victory condition for shrink mode) */
export function isBoardFullyCleared(tileStates: BlastTileState[][]): boolean {
  return tileStates.flat().every(t => t.isCleared);
}
