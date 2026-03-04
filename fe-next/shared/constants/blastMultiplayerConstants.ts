/**
 * Blast Multiplayer Constants
 * Constants for blast mode in multiplayer games
 */

import type { BlastTileType } from '@/shared/types/blast';

export const BLAST_BONUS_MOVE_COMBO_THRESHOLD = 3;
export const BLAST_SPECIAL_TILE_CHANCE = 0.15;

// Re-export canonical type for backward compat (consumers should prefer @/shared/types/blast)
export type { BlastTileType } from '@/shared/types/blast';

// Tile types available in multiplayer blast (subset of canonical list)
export const BLAST_TILE_TYPES = ['standard', 'gold', 'rainbow', 'bomb', 'ice', 'gem', 'lightning', 'magnet'] as const;
export type BlastMPTileType = typeof BLAST_TILE_TYPES[number];

// Tile bonus multipliers (full canonical set — 'normal' renamed to 'standard')
export const BLAST_TILE_BONUSES: Record<BlastTileType, number> = {
  standard: 1,
  gold: 3,
  rainbow: 1, // rainbow adds flat +5 instead (see BLAST_RAINBOW_FLAT_BONUS)
  bomb: 2,
  ice: 1.5,
  gem: 2.5,
  lightning: 2,
  magnet: 1.5,
  wildcard: 1,
  prism: 2,
  frozen: 1.5,
  mirror: 2,
  silver: 4,
  diamond: 5,
};

export const BLAST_RAINBOW_FLAT_BONUS = 5;
