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
  gold:      { name: 'blast.tile.gold.name',      desc: 'blast.tile.gold.desc',      icon: '✦' },
  diamond:   { name: 'blast.tile.diamond.name',   desc: 'blast.tile.diamond.desc',   icon: '💠' },
  bomb:      { name: 'blast.tile.bomb.name',      desc: 'blast.tile.bomb.desc',      icon: '💣' },
  lightning: { name: 'blast.tile.lightning.name', desc: 'blast.tile.lightning.desc', icon: '⚡' },
  prism:     { name: 'blast.tile.prism.name',     desc: 'blast.tile.prism.desc',     icon: '🔷' },
  rainbow:   { name: 'blast.tile.rainbow.name',   desc: 'blast.tile.rainbow.desc',   icon: '🌈' },
  ice:       { name: 'blast.tile.ice.name',       desc: 'blast.tile.ice.desc',       icon: '❄' },
  gem:       { name: 'blast.tile.gem.name',       desc: 'blast.tile.gem.desc',       icon: '💎' },
  frozen:    { name: 'blast.tile.frozen.name',    desc: 'blast.tile.frozen.desc',    icon: '🧊' },
  magnet:    { name: 'blast.tile.magnet.name',    desc: 'blast.tile.magnet.desc',    icon: '🌀' },
  countdown: { name: 'blast.tile.countdown.name', desc: 'blast.tile.countdown.desc', icon: '⏳' },
  shuffle:   { name: 'blast.tile.shuffle.name',   desc: 'blast.tile.shuffle.desc',   icon: '🔀' },
  magma:     { name: 'blast.tile.magma.name',     desc: 'blast.tile.magma.desc',     icon: '🌋' },
  portal:    { name: 'blast.tile.portal.name',    desc: 'blast.tile.portal.desc',    icon: '🌌' },
  catalyst:  { name: 'blast.tile.catalyst.name',  desc: 'blast.tile.catalyst.desc',  icon: '⚗️' },
  crystal:   { name: 'blast.tile.crystal.name',   desc: 'blast.tile.crystal.desc',   icon: '🔮' },
  fuse:      { name: 'blast.tile.fuse.name',      desc: 'blast.tile.fuse.desc',      icon: '🧨' },
  anchor:    { name: 'blast.tile.anchor.name',    desc: 'blast.tile.anchor.desc',    icon: '⚓' },
};

/** English fallbacks */
const ENGLISH_FALLBACK: Partial<Record<BlastTileType, TileTooltip>> = {
  gold:      { name: 'Gold',      desc: '3\u00d7 score + grants 1 bonus move.',                          icon: '✦' },
  diamond:   { name: 'Diamond',   desc: '5\u00d7 score + reveals frozen inner types for 3 turns.',        icon: '💠' },
  bomb:      { name: 'Bomb',      desc: 'Clears 3\u00d73 area. Chains to nearby bombs.',                  icon: '💣' },
  lightning: { name: 'Lightning', desc: 'Clears entire column. Chains to other lightning bolts.',     icon: '⚡' },
  prism:     { name: 'Prism',     desc: '2 hits. Clears row + column. Converts 2 tiles to specials.',icon: '🔷' },
  rainbow:   { name: 'Rainbow',   desc: 'Copies and doubles the best special in your word.',         icon: '🌈' },
  ice:       { name: 'Ice',       desc: '2 hits to break. Blocks tile selection until cracked.',     icon: '❄' },
  gem:       { name: 'Gem',       desc: '3 hits to complete. Spawns 2 specials + 2 bonus moves.',    icon: '💎' },
  frozen:    { name: 'Frost',     desc: '2 hits to reveal a hidden special inside.',                  icon: '🧊' },
  magnet:    { name: 'Vortex',    desc: 'Pulls nearby tiles inward, then explodes.',                  icon: '🌀' },
  countdown: { name: 'Countdown', desc: 'Explodes if not defused! Defusing grants 2 bonus moves.',   icon: '⏳' },
  shuffle:   { name: 'Shuffle',   desc: 'Rearranges all remaining tiles on the board.',              icon: '🔀' },
  magma:     { name: 'Magma',     desc: 'Erupts and clears both diagonals (X-pattern).',            icon: '🌋' },
  portal:    { name: 'Portal',    desc: 'Teleport through paired portals. Words score 2\u00d7.',     icon: '🌌' },
  catalyst:  { name: 'Catalyst',  desc: 'Clears and upgrades adjacent tiles to random specials.',    icon: '⚗️' },
  crystal:   { name: 'Crystal',   desc: 'Grows +1\u00d7 each unused turn (max 5\u00d7). Multiplies your word score when used.', icon: '🔮' },
  fuse:      { name: 'Fuse',      desc: 'Linked pair. Clear one to light its partner — defuse in 3 turns or it detonates!', icon: '🧨' },
  anchor:    { name: 'Anchor',    desc: 'Rewards long words. +3 points per letter in the word when cleared.',         icon: '⚓' },
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
