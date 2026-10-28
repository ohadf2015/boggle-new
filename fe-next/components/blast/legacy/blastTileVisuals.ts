import { type LucideIcon, Bomb, Coins, Diamond } from 'lucide-react';
import type { BlastTileType } from './types';

/* Neo-brutalist keycap frame: a hard (blur-free) drop straight down + a hard
 * top highlight and a darker bottom lip, so every tile reads as a pressable candy key. Shared by every tile so the
 * standard face and the colourful specials read as siblings of one set. */
const INK = '#0b1530';
const HARD_SHADOW = `3px 4px 0 0 ${INK}, inset 0 3px 0 rgba(255,255,255,0.55), inset 0 -6px 0 rgba(11,21,48,0.18)`;

/** Build a solid special-tile face: one flat brand colour + a thick ink-shade
 *  border + the shared hard frame. No gradients — the colour + lucide icon
 *  carry the identity, the hard frame carries the neo-brutalist chunk. */
function solid(face: string, border: string): React.CSSProperties {
  return { background: face, boxShadow: HARD_SHADOW, border: `3px solid ${border}` };
}

/* Single, flat brand-aligned hues — one colour per tile kind. */
const F = {
  cream:  '#FFFEF0',                    // standard face — warm, never stark white
  gold:   '#FFD32A', goldEdge:  '#9A6B00',  // coin
  red:    '#FF3B5C', redEdge:   '#7A0B22',  // bomb
  aqua:   '#5EE6D0', aquaEdge:  '#0F6E62',  // diamond
};

/** Visual config per tile type.
 *  `indicator` is a lucide-react component — inherits `currentColor` from the
 *  tile's `text-*` class so light tiles get dark strokes, dark tiles get white. */
export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: LucideIcon; text?: string; style?: React.CSSProperties }> = {
  standard:  { bg: '', text: 'text-neo-navy', style: { background: F.cream, boxShadow: HARD_SHADOW, border: `2px solid ${INK}` } },
  gold:      { bg: '', indicator: Coins,   text: 'text-neo-navy', style: solid(F.gold, F.goldEdge) },
  bomb:      { bg: '', indicator: Bomb,    text: 'text-white',    style: solid(F.red,  F.redEdge) },
  diamond:   { bg: '', indicator: Diamond, text: 'text-neo-navy', style: solid(F.aqua, F.aquaEdge) },
};

/** Clearing phase background color per tile type — matches the idle hue
 * so the destruction flash reads as the same object, just amped up. */
const CB = '2px solid rgba(0,0,0,0.5)';
export const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFE46A 0%, #D88820 100%)', border: CB },
  bomb:      { background: 'radial-gradient(circle, #FF6A7C 0%, #5C0818 100%)', border: CB },
  diamond:   { background: 'radial-gradient(circle, #C0EDF0 0%, #227A8A 100%)', border: CB },
};

/** Type-specific clearing transform overrides — visually distinct death animations.
 * Each type has a UNIQUE signature: bombs explode outward, coins spin, diamonds flare. */
export const CLEARING_ANIMS: Partial<Record<BlastTileType, { transform: string; transition: string; filter?: string }>> = {
  bomb:      { transform: 'scale(2.2) rotate(15deg)', transition: 'all 200ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(2.5) saturate(2)' },
  gold:      { transform: 'scale(1.6) rotate(-20deg)', transition: 'all 200ms ease-out', filter: 'brightness(2.5) saturate(2)' },
  diamond:   { transform: 'scale(1.9) rotate(45deg)', transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(3) saturate(2)' },
};
