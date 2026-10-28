/**
 * Build BlastTileState[][] from a server-issued BlastTileOverlay + grid size.
 * Shared by the client multiplayer bridge and the server so both build identical boards.
 */

import type { BlastTileOverlay } from '@/shared/types/game';
import { normalizeBlastTileType, type BlastTileState } from '@/shared/types/blast';

/** Cells absent from the overlay (or carrying a retired tile type) become 'standard'. */
export function overlayToTileStates(
  overlay: BlastTileOverlay[],
  gridSize: number,
): BlastTileState[][] {
  const lookup = new Map<string, BlastTileOverlay>();
  for (const tile of overlay) {
    lookup.set(`${tile.row}-${tile.col}`, tile);
  }

  const states: BlastTileState[][] = [];
  for (let row = 0; row < gridSize; row++) {
    states[row] = [];
    for (let col = 0; col < gridSize; col++) {
      states[row][col] = {
        uid: `mp-${row}-${col}`,
        row,
        col,
        type: normalizeBlastTileType(lookup.get(`${row}-${col}`)?.type),
        isCleared: false,
        activationEffect: null,
        hitsRemaining: 0,
      };
    }
  }
  return states;
}
