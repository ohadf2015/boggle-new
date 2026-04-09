/**
 * Build BlastTileState[][] from a server-issued BlastTileOverlay + grid size.
 *
 * This is the single source of truth shared by the client multiplayer bridge
 * (useBlastMultiplayerBridge) and the server (backend/modules/blastModeManager).
 * Both sides must produce byte-identical tile states from the same (overlay, seed)
 * pair — otherwise frozen-tile innerType will disagree and clients will see the
 * wrong hidden special revealed on second hit.
 */

import type { BlastTileOverlay } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from '@/shared/types/blast';
import { getInitialHitsRemaining } from './blastTileUtils';
import { createSeededRandom } from './blastLetterGenerator';
import { FROST_INNER_CANDIDATES } from '@/shared/constants/blastMultiplayerConstants';

/**
 * Convert an overlay spec into a full tile-state grid. Cells absent from the
 * overlay become 'standard'. Frozen tiles receive a hidden innerType selected
 * deterministically from `FROST_INNER_CANDIDATES` using a seeded RNG so every
 * player (and the server) agree on the reveal.
 *
 * @param overlay - Sparse list of non-standard tile placements from the server
 * @param gridSize - Side length of the square grid
 * @param seed - PRNG seed; `null` is treated as `0` for defensive convenience
 */
export function overlayToTileStates(
  overlay: BlastTileOverlay[],
  gridSize: number,
  seed: number | null,
): BlastTileState[][] {
  const lookup = new Map<string, BlastTileOverlay>();
  for (const tile of overlay) {
    lookup.set(`${tile.row}-${tile.col}`, tile);
  }

  const random = createSeededRandom(seed ?? 0);
  const states: BlastTileState[][] = [];

  for (let row = 0; row < gridSize; row++) {
    states[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const entry = lookup.get(`${row}-${col}`);
      const type = entry?.type ?? 'standard';

      const innerType: BlastTileType | undefined =
        type === 'frozen'
          ? FROST_INNER_CANDIDATES[Math.floor(random() * FROST_INNER_CANDIDATES.length)]
          : undefined;

      states[row][col] = {
        uid: `mp-${row}-${col}`,
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: getInitialHitsRemaining(type),
        ...(innerType !== undefined ? { innerType } : {}),
      };
    }
  }

  return states;
}
