/**
 * Canonical Blast Tile Type Definitions
 * Single source of truth for BlastTileType used by both SP and MP blast modes.
 * All consumers import from here (directly or via @/components/blast/types re-export).
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
  | 'mirror'
  | 'silver'
  | 'diamond'
  | 'wildcard'
  | 'countdown'
  | 'portal'
  | 'catalyst'
  | 'shuffle'
  | 'magma'
  | 'crystal'
  | 'fuse';

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
  'mirror',
  'silver',
  'diamond',
  'wildcard',
  'countdown',
  'portal',
  'catalyst',
  'shuffle',
  'magma',
  'crystal',
  'fuse',
] as const;

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
}
