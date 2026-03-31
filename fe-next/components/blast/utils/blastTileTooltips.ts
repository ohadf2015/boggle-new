/**
 * Tile tooltip descriptions for the tile guide / long-press preview.
 * TODO: Wire into i18n via t() keys — currently English-only.
 */
import type { BlastTileType } from '@/shared/types/blast';

export interface TileTooltip {
  name: string;
  desc: string;
  /** Emoji indicator matching TILE_VISUALS */
  icon: string;
}

export const TILE_TOOLTIPS: Partial<Record<BlastTileType, TileTooltip>> = {
  gold:      { name: 'Gold',      desc: '3× score multiplier',                         icon: '✦' },
  silver:    { name: 'Silver',    desc: '1.5× score multiplier',                       icon: '🪙' },
  diamond:   { name: 'Diamond',   desc: '5× score multiplier',                         icon: '💠' },
  bomb:      { name: 'Bomb',      desc: 'Clears 3×3 area around it. Chains to nearby bombs.', icon: '💣' },
  lightning: { name: 'Lightning', desc: 'Clears entire column.',                        icon: '⚡' },
  prism:     { name: 'Prism',     desc: '2 hits to break. Clears full row + column.',   icon: '🔷' },
  rainbow:   { name: 'Rainbow',   desc: 'Copies and doubles the best special in your word.', icon: '🌈' },
  ice:       { name: 'Ice',       desc: '2 hits to break. Blocks tile underneath.',     icon: '❄' },
  gem:       { name: 'Gem',       desc: '3 hits to complete. Spawns 2 new specials.',   icon: '💎' },
  frozen:    { name: 'Frost',     desc: '2 hits to reveal a hidden special inside.',    icon: '🧊' },
  magnet:    { name: 'Vortex',    desc: 'Pulls nearby tiles inward, then explodes.',    icon: '🌀' },
  mirror:    { name: 'Mirror',    desc: 'Copies the first offensive special in your word.', icon: '🪞' },
};

/** Get tooltip for a tile type. Returns null for standard. */
export function getTileTooltip(type: BlastTileType): TileTooltip | null {
  return TILE_TOOLTIPS[type] ?? null;
}
