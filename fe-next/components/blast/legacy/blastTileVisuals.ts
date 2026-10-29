import { type LucideIcon, Bomb, Coins, Diamond } from 'lucide-react';
import type { BlastTileType } from './types';

/* Candy key: crisp ink border, a hard ink drop, a top highlight and a deep
 * per-face bottom lip. No blur anywhere, so it stays neo-brutalist. */
const INK = '#0b1530';
const keyShadow = (lip: string) => `0 3px 0 0 ${INK}, inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -5px 0 ${lip}`;

/** Flat face + ink border + lip. Identity comes from the face art children, not a gradient. */
function key(face: string, lip: string): React.CSSProperties {
  return { background: face, boxShadow: keyShadow(lip), border: `2px solid ${INK}` };
}

/* One flat brand hue per tile kind, with its darker lip. */
const F = {
  cream:  '#FFFEF0', creamLip: 'rgba(11,21,48,0.16)',
  gold:   '#FFD32A', goldLip:  '#C98A00',
  red:    '#FF3B5C', redLip:   '#A3122F',
  aqua:   '#5EE6D0', aquaLip:  '#1C9C8A',
};

/** Visual config per tile type.
 *  `indicator` is a lucide-react component — inherits `currentColor` from the
 *  tile's `text-*` class so light tiles get dark strokes, dark tiles get white. */
export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: LucideIcon; text?: string; style?: React.CSSProperties }> = {
  standard:  { bg: '', text: 'text-neo-navy', style: key(F.cream, F.creamLip) },
  gold:      { bg: '', indicator: Coins,   text: 'text-neo-navy', style: key(F.gold, F.goldLip) },
  bomb:      { bg: '', indicator: Bomb,    text: 'text-white',    style: key(F.red,  F.redLip) },
  diamond:   { bg: '', indicator: Diamond, text: 'text-neo-navy', style: key(F.aqua, F.aquaLip) },
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
