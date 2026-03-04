/**
 * Canonical Blast Tile Type Definitions
 * Single source of truth for BlastTileType used by both SP and MP blast modes.
 * All consumers import from here (directly or via @/components/blast/types re-export).
 */

// ==================== Tile Type ====================

/** All possible blast mode tile types (standard + 10 special) */
export type BlastTileType =
  | 'standard'
  | 'gold'
  | 'bomb'
  | 'rainbow'
  | 'ice'
  | 'wildcard'
  | 'lightning'
  | 'magnet'
  | 'prism'
  | 'gem'
  | 'frozen';

/** Runtime-iterable list of all blast tile types (mirrors BlastTileType union) */
export const BLAST_TILE_TYPE_LIST: readonly BlastTileType[] = [
  'standard',
  'gold',
  'bomb',
  'rainbow',
  'ice',
  'wildcard',
  'lightning',
  'magnet',
  'prism',
  'gem',
  'frozen',
] as const;

// ==================== Tile State ====================

/** Per-cell state tracked alongside the LetterGrid */
export interface BlastTileState {
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
}
