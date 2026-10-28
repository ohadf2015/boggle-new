/**
 * Blast Multiplayer Constants
 * Constants for blast mode in multiplayer games
 */

import type { BlastTileType } from '@/shared/types/blast';

export const BLAST_BONUS_MOVE_COMBO_THRESHOLD = 3;

// Re-export canonical type for backward compat (consumers should prefer @/shared/types/blast)
export type { BlastTileType } from '@/shared/types/blast';

/** Per-tile score added when the tile is on a word path. Coins and diamonds pay mostly through blastCollectionScore. */
export const BLAST_TILE_BONUSES: Record<BlastTileType, number> = {
  standard: 1,
  gold: 1.5,
  bomb: 1.25,
  diamond: 1,
};
