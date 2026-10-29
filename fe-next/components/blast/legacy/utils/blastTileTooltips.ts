/**
 * Tile tooltip descriptions for the tile guide / long-press preview.
 * Uses i18n keys when a translator is provided; falls back to English.
 */
import type { BlastTileType } from '@/shared/types/blast';

export interface TileTooltip {
  name: string;
  desc: string;
  /** Emoji indicator matching TILE_VISUALS */
  icon: string;
}

/** i18n keys per tile type */
const TILE_I18N_KEYS: Partial<Record<BlastTileType, { name: string; desc: string; icon: string }>> = {
  gold:      { name: 'blast.tile.gold.name',      desc: 'blast.tile.gold.desc',      icon: '🪙' },
  diamond:   { name: 'blast.tile.diamond.name',   desc: 'blast.tile.diamond.desc',   icon: '💠' },
  bomb:      { name: 'blast.tile.bomb.name',      desc: 'blast.tile.bomb.desc',      icon: '💣' },
};

/** English fallbacks */
const ENGLISH_FALLBACK: Partial<Record<BlastTileType, TileTooltip>> = {
  gold:      { name: 'Coin',    desc: '3\u00d7 word score, +1 move, and extra coins.',          icon: '🪙' },
  diamond:   { name: 'Diamond', desc: 'Rare words earn it. Use it in a word for \u00d72 and a row + column blast.', icon: '💠' },
  bomb:      { name: 'Bomb',    desc: 'Clears 3\u00d73 area. Chains to nearby bombs.',          icon: '💣' },
};

/** Get tooltip for a tile type. Uses t() for i18n when provided, English fallback otherwise. */
export function getTileTooltip(type: BlastTileType, t?: (key: string) => string | undefined): TileTooltip | null {
  const keys = TILE_I18N_KEYS[type];
  if (!keys) return null;

  if (t) {
    const name = t(keys.name);
    const desc = t(keys.desc);
    // Only use i18n result if it differs from the key (avoids passthrough mocks / missing translations)
    if (name && desc && name !== keys.name && desc !== keys.desc) return { name, desc, icon: keys.icon };
  }

  return ENGLISH_FALLBACK[type] ?? null;
}
