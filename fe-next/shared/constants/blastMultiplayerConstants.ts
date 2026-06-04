/**
 * Blast Multiplayer Constants
 * Constants for blast mode in multiplayer games
 */

import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '@/shared/types/blast';

export const BLAST_BONUS_MOVE_COMBO_THRESHOLD = 3;
export const BLAST_SPECIAL_TILE_CHANCE = 0.15;

// Re-export canonical type for backward compat (consumers should prefer @/shared/types/blast)
export type { BlastTileType } from '@/shared/types/blast';

// All canonical tile types — replaces old 8-type hardcoded subset.
// Multiplayer now spawns the same tile pool as singleplayer (wave-gated by generateBlastOverlay).
export const BLAST_TILE_TYPES: readonly BlastTileType[] = BLAST_TILE_TYPE_LIST;

// Backward-compat alias — prefer BlastTileType from @/shared/types/blast
export type BlastMPTileType = BlastTileType;

// Tile bonus multipliers (full canonical set — 'normal' renamed to 'standard')
// Normalized (2026-03-16) to bring Blast total scores in line with Classic mode.
// Previous values inflated Blast scores ~1.5-2× above Classic.
export const BLAST_TILE_BONUSES: Record<BlastTileType, number> = {
  standard: 1,
  gold: 1.5,
  rainbow: 1, // rainbow adds flat bonus instead (see BLAST_RAINBOW_FLAT_BONUS)
  bomb: 1.25,
  ice: 1,
  gem: 1.5,
  lightning: 1.25,
  magnet: 1,
  prism: 1.25,
  frozen: 1,
  diamond: 2.5,
  countdown: 1.5,  // reward for defusing under pressure
  shuffle: 0.5,    // mild bonus for triggering board rearrange
  magma: 2,        // high reward for diagonal clear power
  portal: 1.25,    // mild bonus for teleport path usage
  catalyst: 1.5,   // reward for triggering upgrade effect
  crystal: 1,      // no flat bonus — reward comes from crystalWordMultiplier
  fuse: 1.5,       // reward for defusing linked-pair fuse before detonation
  anchor: 1.5,     // base bonus — length-based bonus applied separately in clearTilesProcessor
  chocolate: 0,    // cc-mechanic: no per-tile bonus; spread is the threat, not the score
  cake: 0,         // cc-mechanic: HP damage is event-driven; destruction bonus paid by engine on kill_cake completion
};

export const BLAST_RAINBOW_FLAT_BONUS = 3;

/** Valid inner types for Frost (frozen) tiles — only explosion/effect specials, not obstacles or multipliers.
 *  Single source of truth used by both server and client. */
export const FROST_INNER_CANDIDATES: BlastTileType[] = ['bomb', 'lightning', 'prism', 'gem', 'rainbow'];
