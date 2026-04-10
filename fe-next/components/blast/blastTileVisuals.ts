import {
  type LucideIcon,
  Bomb, Zap, Triangle, Rainbow, Snowflake, Gem, Magnet,
  Diamond, Hourglass, Shuffle, Flame, Orbit, FlaskConical,
  Sparkles, Lock, Key, Star, Anchor,
} from 'lucide-react';
import type { BlastTileType } from './types';

const SHADOW = '2px 2px 0px rgba(0,0,0,0.85)';
const BORDER_SPECIAL = '2px solid rgba(0,0,0,0.4)';

/** Visual config per tile type.
 *  `indicator` is a lucide-react component — inherits `currentColor` from the
 *  tile's `text-*` class so gold/ice tiles get dark strokes, bombs get white. */
export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: LucideIcon; text?: string; style?: React.CSSProperties }> = {
  standard: {
    bg: '', text: 'text-neo-navy',
    style: { background: 'rgba(255,255,255,0.85)', boxShadow: SHADOW, border: '2px solid rgba(0,0,0,0.3)' },
  },
  gold: {
    bg: '', indicator: Star, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #FFE566 0%, #FFD700 40%, #F0C800 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  bomb: {
    bg: '', indicator: Bomb, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #FF6B6B 0%, #FF3366 40%, #E0194D 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  lightning: {
    bg: '', indicator: Zap, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #66FFFF 0%, #00FFFF 40%, #00E0E0 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  prism: {
    bg: '', indicator: Triangle, text: 'text-white',
    style: { background: 'conic-gradient(from 0deg, #FF1493, #8B5CF6, #00FFFF, #BFFF00, #FF1493)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  rainbow: {
    bg: '', indicator: Rainbow, text: 'text-white',
    style: { background: 'linear-gradient(135deg, #FF1493 0%, #8B5CF6 50%, #00FFFF 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  ice: {
    bg: '', indicator: Snowflake, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #E0FFFF 0%, #99EEFF 40%, #80DDEE 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  gem: {
    bg: '', indicator: Gem, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #7DFFB3 0%, #34D399 40%, #10B981 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  frozen: {
    bg: '', indicator: Snowflake, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #E8F4FF 0%, #B8DDFF 40%, #A0CCEE 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  magnet: {
    bg: '', indicator: Magnet, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #A78BFA 0%, #8B5CF6 40%, #7C3AED 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  diamond: {
    bg: '', indicator: Diamond, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #88FFFF 0%, #00EEFF 40%, #00DDEE 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  countdown: {
    bg: '', indicator: Hourglass, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #FF9966 0%, #FF6633 40%, #EE5522 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  shuffle: {
    bg: '', indicator: Shuffle, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #FFB347 0%, #FF8C00 40%, #E07700 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  magma: {
    bg: '', indicator: Flame, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #FF6B35 0%, #FF4500 40%, #CC3700 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  portal: {
    bg: '', indicator: Orbit, text: 'text-white',
    style: { background: 'radial-gradient(circle, #7B68EE 0%, #5B3BD6 60%, #4B0082 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  catalyst: {
    bg: '', indicator: FlaskConical, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #FFFACD 0%, #FFD700 40%, #F0C020 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  crystal: {
    bg: '', indicator: Sparkles, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #F0C8FF 0%, #C084FC 40%, #8B5CF6 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  fuse: {
    bg: '', indicator: Flame, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #FF7755 0%, #E33E1E 40%, #B02810 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  locked: {
    bg: '', indicator: Lock, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #9CA3AF 0%, #6B7280 40%, #4B5563 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  key: {
    bg: '', indicator: Key, text: 'text-neo-navy',
    style: { background: 'linear-gradient(165deg, #FDE68A 0%, #F59E0B 40%, #D97706 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
  anchor: {
    bg: '', indicator: Anchor, text: 'text-white',
    style: { background: 'linear-gradient(165deg, #60A5FA 0%, #2563EB 40%, #1E3A8A 100%)', boxShadow: SHADOW, border: BORDER_SPECIAL },
  },
};

/** Clearing phase background color per tile type */
export const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  bomb:      { background: 'radial-gradient(circle, #FF4444 0%, #CC0000 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  rainbow:   { background: 'linear-gradient(135deg, #FF69B4 0%, #A855F7 50%, #00BFFF 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  ice:       { background: 'linear-gradient(135deg, #B4E6FF 0%, #82C8FF 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  lightning: { background: 'linear-gradient(135deg, #FFE100 0%, #00BFFF 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  prism:     { background: 'conic-gradient(from 0deg, #f00, #f90, #ff0, #0f0, #06f, #93f, #f00)', border: '2px solid rgba(0,0,0,0.5)' },
  gem:       { background: 'radial-gradient(circle, #50C878 0%, #009450 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  frozen:    { background: 'linear-gradient(135deg, #C8DCFF 0%, #A0C8F0 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  magnet:    { background: 'radial-gradient(circle, #8B00FF 0%, #FF0040 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  diamond:   { background: 'radial-gradient(circle, #B9F2FF 0%, #00CED1 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  countdown:{ background: 'radial-gradient(circle, #FF9966 0%, #CC3300 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  shuffle:   { background: 'radial-gradient(circle, #FFB347 0%, #CC7000 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  magma:     { background: 'radial-gradient(circle, #FF6B35 0%, #CC2200 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  portal:    { background: 'radial-gradient(circle, #7B68EE 0%, #2E0054 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  catalyst:  { background: 'radial-gradient(circle, #FFD700 0%, #DAA520 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  crystal:   { background: 'radial-gradient(circle, #E0B0FF 0%, #7C3AED 100%)', border: '2px solid rgba(0,0,0,0.5)' },
  fuse:      { background: 'radial-gradient(circle, #FF7755 0%, #B02810 100%)', border: '2px solid rgba(0,0,0,0.5)' },
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
