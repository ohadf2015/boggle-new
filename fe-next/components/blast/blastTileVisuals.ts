import {
  type LucideIcon,
  Bomb, Zap, Triangle, Rainbow, Snowflake, Gem, Magnet,
  Diamond, Hourglass, Shuffle, Flame, Orbit, FlaskConical,
  Sparkles, Lock, Key, Star, Anchor,
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
/* Pink tonal family — all tiles share a hue range (rose → magenta).
 * Type identity comes from the indicator icon, not hue contrast. */
const PK = {
  blush:   'linear-gradient(165deg, #FFE4EF 0%, #FFC2D8 45%, #FFA8C6 100%)',
  rose:    'linear-gradient(165deg, #FFB8D4 0%, #FF8FB8 45%, #F06BA0 100%)',
  pink:    'linear-gradient(165deg, #FF9FC4 0%, #FF5C97 45%, #E63C7E 100%)',
  hot:     'linear-gradient(165deg, #FF6BA3 0%, #FF1F7A 45%, #C8145C 100%)',
  magenta: 'linear-gradient(165deg, #FF4D9E 0%, #E01579 45%, #9C0A52 100%)',
  deep:    'linear-gradient(165deg, #E63978 0%, #B21458 45%, #70083A 100%)',
};

export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: LucideIcon; text?: string; style?: React.CSSProperties }> = {
  standard:  { bg: '', text: 'text-neo-navy', style: { background: PK.blush,   boxShadow: SHADOW, border: '2px solid rgba(0,0,0,0.3)' } },
  gold:      { bg: '', indicator: Star,         text: 'text-neo-navy', style: { background: PK.rose,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  bomb:      { bg: '', indicator: Bomb,         text: 'text-white',    style: { background: PK.deep,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  lightning: { bg: '', indicator: Zap,          text: 'text-neo-navy', style: { background: PK.pink,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  prism:     { bg: '', indicator: Triangle,     text: 'text-white',    style: { background: 'conic-gradient(from 0deg, #FF4D9E, #FF1F7A, #E01579, #FF6BA3, #FF4D9E)', boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  rainbow:   { bg: '', indicator: Rainbow,      text: 'text-white',    style: { background: 'linear-gradient(135deg, #FF9FC4 0%, #FF1F7A 50%, #9C0A52 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  ice:       { bg: '', indicator: Snowflake,    text: 'text-neo-navy', style: { background: PK.blush,   boxShadow: SHADOW, border: BORDER_SPECIAL } },
  gem:       { bg: '', indicator: Gem,          text: 'text-white',    style: { background: PK.hot,     boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  frozen:    { bg: '', indicator: Snowflake,    text: 'text-neo-navy', style: { background: PK.blush,   boxShadow: SHADOW, border: BORDER_SPECIAL } },
  magnet:    { bg: '', indicator: Magnet,       text: 'text-white',    style: { background: PK.magenta, boxShadow: SHADOW, border: BORDER_SPECIAL } },
  diamond:   { bg: '', indicator: Diamond,      text: 'text-neo-navy', style: { background: PK.rose,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  countdown: { bg: '', indicator: Hourglass,    text: 'text-white',    style: { background: PK.hot,     boxShadow: SHADOW, border: BORDER_SPECIAL } },
  shuffle:   { bg: '', indicator: Shuffle,      text: 'text-neo-navy', style: { background: PK.pink,    boxShadow: SHADOW, border: BORDER_SPECIAL } },
  magma:     { bg: '', indicator: Flame,        text: 'text-white',    style: { background: PK.deep,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  portal:    { bg: '', indicator: Orbit,        text: 'text-white',    style: { background: 'radial-gradient(circle, #FF4D9E 0%, #B21458 60%, #5C0530 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_FAST } },
  catalyst:  { bg: '', indicator: FlaskConical, text: 'text-neo-navy', style: { background: PK.rose,    boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  crystal:   { bg: '', indicator: Sparkles,     text: 'text-white',    style: { background: PK.magenta, boxShadow: SHADOW, border: BORDER_SPECIAL, ...SHIMMER_STYLE } },
  fuse:      { bg: '', indicator: Flame,        text: 'text-white',    style: { background: PK.deep,    boxShadow: SHADOW, border: BORDER_SPECIAL } },
  locked:    { bg: '', indicator: Lock,         text: 'text-neo-navy', style: { background: 'linear-gradient(165deg, #D8A5B8 0%, #A67888 45%, #78525F 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL } },
  key:       { bg: '', indicator: Key,          text: 'text-neo-navy', style: { background: PK.rose,    boxShadow: SHADOW, border: BORDER_SPECIAL } },
  anchor:    { bg: '', indicator: Anchor,       text: 'text-white',    style: { background: PK.magenta, boxShadow: SHADOW, border: BORDER_SPECIAL } },
};

/** Clearing phase background color per tile type — pink tonal family */
const CB = '2px solid rgba(0,0,0,0.5)';
export const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFB8D4 0%, #F06BA0 100%)', border: CB },
  bomb:      { background: 'radial-gradient(circle, #FF1F7A 0%, #70083A 100%)', border: CB },
  rainbow:   { background: 'linear-gradient(135deg, #FF9FC4 0%, #FF1F7A 50%, #9C0A52 100%)', border: CB },
  ice:       { background: 'linear-gradient(135deg, #FFE4EF 0%, #FFA8C6 100%)', border: CB },
  lightning: { background: 'linear-gradient(135deg, #FF9FC4 0%, #E63C7E 100%)', border: CB },
  prism:     { background: 'conic-gradient(from 0deg, #FF4D9E, #FF1F7A, #E01579, #FF6BA3, #FF4D9E)', border: CB },
  gem:       { background: 'radial-gradient(circle, #FF6BA3 0%, #C8145C 100%)', border: CB },
  frozen:    { background: 'linear-gradient(135deg, #FFE4EF 0%, #FFA8C6 100%)', border: CB },
  magnet:    { background: 'radial-gradient(circle, #FF4D9E 0%, #9C0A52 100%)', border: CB },
  diamond:   { background: 'radial-gradient(circle, #FFC2D8 0%, #F06BA0 100%)', border: CB },
  countdown: { background: 'radial-gradient(circle, #FF6BA3 0%, #B21458 100%)', border: CB },
  shuffle:   { background: 'radial-gradient(circle, #FF9FC4 0%, #E63C7E 100%)', border: CB },
  magma:     { background: 'radial-gradient(circle, #FF4D9E 0%, #70083A 100%)', border: CB },
  portal:    { background: 'radial-gradient(circle, #FF4D9E 0%, #5C0530 100%)', border: CB },
  catalyst:  { background: 'radial-gradient(circle, #FFB8D4 0%, #F06BA0 100%)', border: CB },
  crystal:   { background: 'radial-gradient(circle, #FF4D9E 0%, #9C0A52 100%)', border: CB },
  fuse:      { background: 'radial-gradient(circle, #FF1F7A 0%, #70083A 100%)', border: CB },
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
