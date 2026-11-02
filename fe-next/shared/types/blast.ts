/**
 * Canonical Blast Tile Type Definitions
 * Single source of truth for BlastTileType + BlastComboType used by both SP and MP blast modes.
 * All consumers import from here (directly or via @/components/blast/legacy/types re-export).
 */

/** Blast tile roster: plain letters, bombs (3x3 clear), coins ('gold'), and earned diamonds. */
export type BlastTileType = 'standard' | 'gold' | 'bomb' | 'diamond';

export const BLAST_TILE_TYPE_LIST: readonly BlastTileType[] = ['standard', 'gold', 'bomb', 'diamond'] as const;

const BLAST_TILE_TYPE_SET: ReadonlySet<string> = new Set(BLAST_TILE_TYPE_LIST);

/** Tile types from boards saved before the roster was cut (ice, rainbow, …) load as plain letters. */
export function normalizeBlastTileType(type: unknown): BlastTileType {
  return typeof type === 'string' && BLAST_TILE_TYPE_SET.has(type) ? (type as BlastTileType) : 'standard';
}

/** Gem colors, rarest last. Every gem is a 'diamond' tile; the color sets how much it pays. */
export const BLAST_GEM_KINDS = ['emerald', 'sapphire', 'amethyst', 'ruby'] as const;
export type BlastGemKind = (typeof BLAST_GEM_KINDS)[number];

export function isBlastGemKind(value: unknown): value is BlastGemKind {
  return typeof value === 'string' && (BLAST_GEM_KINDS as readonly string[]).includes(value);
}

export const BLAST_COMBO_TYPES = ['bomb_bomb', 'gold_special', 'triple_special'] as const;

export type BlastComboType = (typeof BLAST_COMBO_TYPES)[number];

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
  hitsRemaining: number;
  /** Color tag for color_power objectives (pink/cyan/lime). Applies pulsing glow on board. */
  colorTag?: 'pink' | 'cyan' | 'lime';
  /** Gem color of a 'diamond' tile. Missing means sapphire (boards saved before gem colors). */
  gem?: BlastGemKind;
}

/** Rebuild a tile saved under an older roster: unknown types become standard, retired fields are dropped. */
export function normalizeBlastTileState(tile: BlastTileState): BlastTileState {
  const type = normalizeBlastTileType(tile.type);
  const normalized: BlastTileState = {
    uid: tile.uid,
    row: tile.row,
    col: tile.col,
    type,
    isCleared: tile.isCleared,
    activationEffect: tile.activationEffect ?? null,
    hitsRemaining: 0,
  };
  if (tile.colorTag) normalized.colorTag = tile.colorTag;
  if (type === 'diamond' && isBlastGemKind(tile.gem)) normalized.gem = tile.gem;
  return normalized;
}
