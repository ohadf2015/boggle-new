import {
  type LucideIcon,
  Bomb, Zap, Triangle, Rainbow, Snowflake, Gem, Magnet,
  Diamond, Hourglass, Shuffle, Flame, Orbit, FlaskConical,
  Sparkles, Star, Anchor, Lock, Key,
} from 'lucide-react';
import type { BlastTileType } from './types';

const SHADOW = '2px 2px 0px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.25)';
const BORDER_SPECIAL = '2px solid rgba(0,0,0,0.4)';

/** Animated gradient shimmer: oversize the background and slide it.
 *  Applied on special tiles to make gradients feel "alive". */
const SHIMMER_STYLE: React.CSSProperties = {
  backgroundSize: '200% 200%',
  animation: 'blast-gradient-travel 3s ease-in-out infinite',
};
const SHIMMER_FAST: React.CSSProperties = {
  backgroundSize: '300% 300%',
  animation: 'blast-gradient-travel 2s ease-in-out infinite',
};

/** Visual config per tile type.
 *  `indicator` is a lucide-react component — inherits `currentColor` from the
 *  tile's `text-*` class so gold/ice tiles get dark strokes, bombs get white. */
/* Harmonized multi-hue palette. Every gradient shares the same geometry
 * (radial at 30%/30%, 0→35→75→100 stops) and the same warm yellow hotspot,
 * so distinct hues still read as siblings under a shared light source. */
const C = {
  // Pink/rose — jewel / destruction energy
  rose:    'radial-gradient(circle at 30% 30%, #FFE4A0 0%, #FFB3C8 35%, #E04A82 75%, #8A1545 100%)',
  crimson: 'radial-gradient(circle at 30% 30%, #FFD890 0%, #FF6A7C 30%, #B01838 70%, #5C0818 100%)',
  // Amber/gold — electric / value
  gold:    'radial-gradient(circle at 30% 30%, #FFF6C0 0%, #FFD85A 35%, #D88820 75%, #5E3200 100%)',
  amber:   'radial-gradient(circle at 30% 30%, #FFF0A8 0%, #FFB040 30%, #B84808 70%, #4C1600 100%)',
  // Cyan/ice — cold
  ice:     'radial-gradient(circle at 30% 30%, #FFFAE0 0%, #C8F0FF 35%, #5AB0D8 75%, #1C4A72 100%)',
  aqua:    'radial-gradient(circle at 30% 30%, #FFF4C8 0%, #8AE0DC 30%, #227A8A 70%, #083642 100%)',
  // Violet/purple — magic
  violet:  'radial-gradient(circle at 30% 30%, #FFE4B0 0%, #D8A0E8 35%, #7830C0 75%, #28084E 100%)',
  orchid:  'radial-gradient(circle at 30% 30%, #FFD8A8 0%, #F090E0 30%, #8C1CAC 70%, #360856 100%)',
  // Teal/mint — utility / alchemy
  teal:    'radial-gradient(circle at 30% 30%, #FFF4C0 0%, #98E4BC 35%, #1E8864 75%, #083826 100%)',
  // Neutral stone — locked
  stone:   'linear-gradient(165deg, #D8D0C2 0%, #8E8676 45%, #564E42 100%)',
};

export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: LucideIcon; text?: string; style?: React.CSSProperties }> = {
  standard:  { bg: '', text: 'text-neo-navy', style: { background: '#FFFFFF', boxShadow: SHADOW, border: '2px solid rgba(0,0,0,0.3)' } },
  gold:      { bg: '', indicator: Star,         text: 'text-neo-navy', style: { background: C.gold,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  bomb:      { bg: '', indicator: Bomb,         text: 'text-white',    style: { background: C.crimson, boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  lightning: { bg: '', indicator: Zap,          text: 'text-neo-navy', style: { background: C.amber,   boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  prism:     { bg: '', indicator: Triangle,     text: 'text-white',    style: { background: 'conic-gradient(from 0deg, #FFD85A, #5AB0D8, #7830C0, #E04A82, #FFD85A)', boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  rainbow:   { bg: '', indicator: Rainbow,      text: 'text-white',    style: { background: 'linear-gradient(135deg, #FFD85A 0%, #E04A82 33%, #7830C0 66%, #227A8A 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  ice:       { bg: '', indicator: Snowflake,    text: 'text-neo-navy', style: { background: C.ice,     boxShadow: SHADOW, border: BORDER_SPECIAL } },
  gem:       { bg: '', indicator: Gem,          text: 'text-white',    style: { background: C.rose,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  frozen:    { bg: '', indicator: Snowflake,    text: 'text-neo-navy', style: { background: C.ice,     boxShadow: SHADOW, border: BORDER_SPECIAL } },
  magnet:    { bg: '', indicator: Magnet,       text: 'text-white',    style: { background: C.violet,  boxShadow: SHADOW, border: BORDER_SPECIAL } },
  diamond:   { bg: '', indicator: Diamond,      text: 'text-neo-navy', style: { background: C.aqua,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  countdown: { bg: '', indicator: Hourglass,    text: 'text-white',    style: { background: C.amber,   boxShadow: SHADOW, border: BORDER_SPECIAL } },
  shuffle:   { bg: '', indicator: Shuffle,      text: 'text-white',    style: { background: C.orchid,  boxShadow: SHADOW, border: BORDER_SPECIAL } },
  magma:     { bg: '', indicator: Flame,        text: 'text-white',    style: { background: C.crimson, boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  portal:    { bg: '', indicator: Orbit,        text: 'text-white',    style: { background: 'radial-gradient(circle, #D8A0E8 0%, #5820A0 60%, #1A0540 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  catalyst:  { bg: '', indicator: FlaskConical, text: 'text-neo-navy', style: { background: C.teal,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  crystal:   { bg: '', indicator: Sparkles,     text: 'text-white',    style: { background: C.violet,  boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  fuse:      { bg: '', indicator: Flame,        text: 'text-white',    style: { background: C.amber,   boxShadow: SHADOW, border: BORDER_SPECIAL } },
  anchor:    { bg: '', indicator: Anchor,       text: 'text-white',    style: { background: C.teal,    boxShadow: SHADOW, border: BORDER_SPECIAL } },
  locked:    { bg: '', indicator: Lock,         text: 'text-white',    style: { background: C.stone,   boxShadow: SHADOW, border: BORDER_SPECIAL } },
  key:       { bg: '', indicator: Key,          text: 'text-neo-navy', style: { background: C.gold,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  // chocolate + cake paint via overlays in BlastTile; visual record is intentionally minimal.
  chocolate: { bg: '', text: 'text-white',    style: { background: '#3a1f0e', boxShadow: SHADOW, border: BORDER_SPECIAL } },
  cake:      { bg: '', text: 'text-white',    style: { background: 'transparent', boxShadow: SHADOW, border: BORDER_SPECIAL } },
};

/** Clearing phase background color per tile type — matches the idle hue
 * so the destruction flash reads as the same object, just amped up. */
const CB = '2px solid rgba(0,0,0,0.5)';
export const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFE46A 0%, #D88820 100%)', border: CB },
  bomb:      { background: 'radial-gradient(circle, #FF6A7C 0%, #5C0818 100%)', border: CB },
  rainbow:   { background: 'linear-gradient(135deg, #FFD85A 0%, #E04A82 33%, #7830C0 66%, #227A8A 100%)', border: CB },
  ice:       { background: 'linear-gradient(135deg, #E8F6FF 0%, #5AB0D8 100%)', border: CB },
  lightning: { background: 'linear-gradient(135deg, #FFE088 0%, #B84808 100%)', border: CB },
  prism:     { background: 'conic-gradient(from 0deg, #FFD85A, #5AB0D8, #7830C0, #E04A82, #FFD85A)', border: CB },
  gem:       { background: 'radial-gradient(circle, #FFB3C8 0%, #8A1545 100%)', border: CB },
  frozen:    { background: 'linear-gradient(135deg, #E8F6FF 0%, #5AB0D8 100%)', border: CB },
  magnet:    { background: 'radial-gradient(circle, #D8A0E8 0%, #28084E 100%)', border: CB },
  diamond:   { background: 'radial-gradient(circle, #C0EDF0 0%, #227A8A 100%)', border: CB },
  countdown: { background: 'radial-gradient(circle, #FFB040 0%, #4C1600 100%)', border: CB },
  shuffle:   { background: 'radial-gradient(circle, #F090E0 0%, #360856 100%)', border: CB },
  magma:     { background: 'radial-gradient(circle, #FF6A7C 0%, #5C0818 100%)', border: CB },
  portal:    { background: 'radial-gradient(circle, #D8A0E8 0%, #1A0540 100%)', border: CB },
  catalyst:  { background: 'radial-gradient(circle, #98E4BC 0%, #083826 100%)', border: CB },
  crystal:   { background: 'radial-gradient(circle, #D8A0E8 0%, #28084E 100%)', border: CB },
  fuse:      { background: 'radial-gradient(circle, #FFB040 0%, #4C1600 100%)', border: CB },
};

/** Type-specific clearing transform overrides — visually distinct death animations.
 * Each type has a UNIQUE signature: bombs explode outward, ice shatters inward,
 * lightning stretches vertically, magnet implodes with spin, etc. */
export const CLEARING_ANIMS: Partial<Record<BlastTileType, { transform: string; transition: string; filter?: string }>> = {
  bomb:      { transform: 'scale(2.2) rotate(15deg)', transition: 'all 200ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(2.5) saturate(2)' },
  lightning: { transform: 'scaleY(3.5) scaleX(0.15) translateY(-30%)', transition: 'all 140ms ease-in', filter: 'brightness(3) contrast(1.5)' },
  prism:     { transform: 'scale(2.0) rotate(270deg)', transition: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', filter: 'hue-rotate(180deg) brightness(1.8)' },
  ice:       { transform: 'scale(0.3) rotate(25deg) translateY(10px)', transition: 'all 180ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(2) blur(2px)' },
  frozen:    { transform: 'scale(0.1) rotate(-45deg)', transition: 'all 250ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(1.5) blur(3px)' },
  gem:       { transform: 'scale(1.8) rotate(90deg)', transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(2) saturate(3)' },
  gold:      { transform: 'scale(1.6) rotate(-20deg)', transition: 'all 200ms ease-out', filter: 'brightness(2.5) saturate(2)' },
  rainbow:   { transform: 'scale(2.0) rotate(540deg)', transition: 'all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'hue-rotate(360deg) brightness(2)' },
  magnet:    { transform: 'scale(0.05) rotate(1080deg)', transition: 'all 300ms cubic-bezier(0.36, 0, 0.66, -0.56)', filter: 'brightness(0.3) saturate(3)' },
  diamond:   { transform: 'scale(1.9) rotate(45deg)', transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(3) saturate(2)' },
  countdown: { transform: 'scale(2.5) rotate(30deg)', transition: 'all 180ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(3) saturate(2.5)' },
  shuffle:   { transform: 'scale(1.4) rotate(720deg)', transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(2) hue-rotate(45deg)' },
  magma:     { transform: 'scale(2.5) rotate(45deg)', transition: 'all 250ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(3) saturate(2.5)' },
  portal:    { transform: 'scale(0.01) rotate(720deg)', transition: 'all 350ms cubic-bezier(0.36, 0, 0.66, -0.56)', filter: 'brightness(2) blur(2px)' },
  catalyst:  { transform: 'scale(2.0) rotate(-15deg)', transition: 'all 220ms ease-out', filter: 'brightness(2.5) saturate(2)' },
  crystal:   { transform: 'scale(1.7) rotate(180deg)', transition: 'all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(2.2) saturate(2.5) hue-rotate(20deg)' },
  fuse:      { transform: 'scale(2.3) rotate(-20deg)', transition: 'all 220ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(2.8) saturate(2.5)' },
};
