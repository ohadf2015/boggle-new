/**
 * Canonical Blast Tile Type Definitions
 * Single source of truth for BlastTileType + BlastComboType used by both SP and MP blast modes.
 * All consumers import from here (directly or via @/components/blast/legacy/types re-export).
 */

// ==================== Tile Type ====================

/** All possible blast mode tile types (standard + 20 special) */
export type BlastTileType =
  | 'standard'
  | 'gold'
  | 'bomb'
  | 'rainbow'
  | 'ice'
  | 'lightning'
  | 'magnet'
  | 'prism'
  | 'gem'
  | 'frozen'
  | 'diamond'
  | 'countdown'
  | 'portal'
  | 'catalyst'
  | 'shuffle'
  | 'magma'
  | 'crystal'
  | 'fuse'
  | 'anchor'
  | 'chocolate'
  | 'cake';

/** Runtime-iterable list of all blast tile types (mirrors BlastTileType union) */
export const BLAST_TILE_TYPE_LIST: readonly BlastTileType[] = [
  'standard',
  'gold',
  'bomb',
  'rainbow',
  'ice',
  'lightning',
  'magnet',
  'prism',
  'gem',
  'frozen',
  'diamond',
  'countdown',
  'portal',
  'catalyst',
  'shuffle',
  'magma',
  'crystal',
  'fuse',
  'anchor',
  'chocolate',
  'cake',
] as const;

// ==================== Combo Type ====================

/** Runtime-iterable list of all blast combo types. Used by socket schema enum + type union. */
export const BLAST_COMBO_TYPES = [
  'bomb_bomb',
  'bomb_lightning',
  'bomb_prism',
  'bomb_rainbow',
  'bomb_magnet',
  'bomb_gem',
  'bomb_frozen',
  'lightning_lightning',
  'lightning_prism',
  'lightning_rainbow',
  'lightning_magnet',
  'lightning_gem',
  'lightning_frozen',
  'prism_prism',
  'prism_rainbow',
  'prism_magnet',
  'prism_gem',
  'prism_frozen',
  'rainbow_magnet',
  'rainbow_gem',
  'rainbow_frozen',
  'magnet_gem',
  'magnet_frozen',
  'gem_frozen',
  'gold_special',
  'rainbow_special',
  'triple_special',
] as const;

export type BlastComboType = (typeof BLAST_COMBO_TYPES)[number];

// ==================== Tile State ====================

/** Per-cell state tracked alongside the LetterGrid */
export interface BlastTileState {
  /** Stable unique ID that persists through gravity shifts */
  uid: string;
  row: number;
  col: number;
  type: BlastTileType;
  isCleared: boolean;
  /** Effect triggered when this tile is cleared (for animation) */
  activationEffect: string | null;
  /** Hits remaining before ice/frozen tile clears (2 → 1 → 0=cleared) */
  hitsRemaining: number;
  /** For Frost (frozen) tiles: the hidden special revealed on second hit */
  innerType?: BlastTileType;
  /** Whether an ice/frozen tile has been thawed by an adjacent word (now selectable) */
  isThawed?: boolean;
  /** Countdown tiles: moves remaining before auto-explosion (decrements each turn) */
  countdown?: number;
  /** Portal tiles: ID linking a portal pair (both share the same ID) */
  portalPairId?: string;
  /** Crystal tiles: current growth multiplier (grows each unused turn, caps at CRYSTAL_MAX_MULTIPLIER) */
  crystalMultiplier?: number;
  /** Fuse tiles: shared ID linking a fuse pair (both tiles share the same ID) */
  fuseGroupId?: string;
  /** Fuse tiles: turns remaining before detonation. Undefined = unlit; number = lit countdown. */
  fuseTimer?: number;
  /** Color tag for color_power objectives (pink/cyan/lime). Applies pulsing glow on board. */
  colorTag?: 'pink' | 'cyan' | 'lime';
  /** Jelly clears: layers remaining beneath this cell. 0 or undefined = no jelly. */
  jellyLayers?: number;
  /** Cake-bomb: HP remaining (anchor cell only; satellites omit this field). */
  cakeHp?: number;
  /** Cake-bomb: anchor uid that this cell is part of (all 9 cells share). */
  cakeAnchorUid?: string;
}
