import {
  type LucideIcon,
  Bomb, Zap, Triangle, Rainbow, Snowflake, Gem, Magnet,
  Diamond, Hourglass, Shuffle, Flame, Orbit, FlaskConical,
  Sparkles, Star, Anchor,
} from 'lucide-react';
import type { BlastTileType } from './types';

/* Neo-brutalist tile frame: a hard (blur-free) offset drop shadow + a soft
 * inner top-highlight for a "physical key" bevel. Shared by every tile so the
 * standard face and the colourful specials read as siblings of one set. */
const INK = '#0b1530';
const HARD_SHADOW = `3px 3px 0 0 ${INK}, inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.12)`;

/** Build a solid special-tile face: one flat brand colour + a thick ink-shade
 *  border + the shared hard frame. No gradients — the colour + lucide icon
 *  carry the identity, the hard frame carries the neo-brutalist chunk. */
function solid(face: string, border: string): React.CSSProperties {
  return { background: face, boxShadow: HARD_SHADOW, border: `3px solid ${border}` };
}

/* Single, flat brand-aligned hues. Each special owns one colour; siblings that
 * share a family (the two reds, the purples, the teals) are separated by icon
 * and by a darker/lighter step so all 18 stay distinguishable on a packed board. */
const F = {
  cream:  '#FFFEF0',                    // standard face — warm, never stark white
  gold:   '#FFD32A', goldEdge:  '#9A6B00',
  red:    '#FF3B5C', redEdge:   '#7A0B22',  // bomb
  magma:  '#E11D48', magmaEdge: '#5C0818',  // magma (deeper red)
  amber:  '#FFE600', amberEdge: '#8A6B00',  // lightning (electric yellow)
  fuse:   '#FB923C', fuseEdge:  '#8A3A10',  // fuse (amber-orange)
  orange: '#FF7A3C', orangeEdge:'#8A3A10',  // countdown
  cyan:   '#7DE0FF', cyanEdge:  '#155E75',  // ice
  iceLt:  '#D2F4FF',                         // frozen (paler, "set" ice)
  pink:   '#FF4DA6', pinkEdge:  '#8A1545',  // gem
  violet: '#9B6BFF', violetEdge:'#3B1A8A',  // magnet
  deepV:  '#7C3AED', deepVEdge: '#3B0A8A',  // portal
  lilac:  '#C084FC', lilacEdge: '#6B21A8',  // crystal
  orchid: '#E879F9', orchidEdge:'#86198F',  // shuffle
  aqua:   '#5EE6D0', aquaEdge:  '#0F6E62',  // diamond
  teal:   '#37D9A0', tealEdge:  '#0B5E45',  // catalyst
  anchor: '#14B8A6', anchorEdge:'#0B5E45',  // anchor
};

/* Prism/rainbow are inherently multi-colour. Instead of a soft gradient FACE
 * (banned), they get a SOLID near-white face + a hard-edged 4-colour border so
 * the multi-hue identity reads as crisp colour blocks, not an airbrush. The
 * face stays solid (and test-provably gradient-free). */
const PRISM_BORDER =
  '3px solid transparent';
const PRISM_BORDER_IMAGE =
  'conic-gradient(from 45deg, #FFD32A 0deg 90deg, #00E0FF 90deg 180deg, #9B6BFF 180deg 270deg, #FF4DA6 270deg 360deg) 1';

/** Visual config per tile type.
 *  `indicator` is a lucide-react component — inherits `currentColor` from the
 *  tile's `text-*` class so light tiles get dark strokes, dark tiles get white. */
export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: LucideIcon; text?: string; style?: React.CSSProperties }> = {
  standard:  { bg: '', text: 'text-neo-navy', style: { background: F.cream, boxShadow: HARD_SHADOW, border: `2px solid ${INK}` } },
  gold:      { bg: '', indicator: Star,         text: 'text-neo-navy', style: solid(F.gold,   F.goldEdge) },
  bomb:      { bg: '', indicator: Bomb,         text: 'text-white',    style: solid(F.red,    F.redEdge) },
  lightning: { bg: '', indicator: Zap,          text: 'text-neo-navy', style: solid(F.amber,  F.amberEdge) },
  prism:     { bg: '', indicator: Triangle,     text: 'text-neo-navy', style: { background: '#F6F7FF', boxShadow: HARD_SHADOW, border: PRISM_BORDER, borderImage: PRISM_BORDER_IMAGE } },
  rainbow:   { bg: '', indicator: Rainbow,      text: 'text-neo-navy', style: { background: '#FFFDF6', boxShadow: HARD_SHADOW, border: PRISM_BORDER, borderImage: PRISM_BORDER_IMAGE } },
  ice:       { bg: '', indicator: Snowflake,    text: 'text-neo-navy', style: solid(F.cyan,   F.cyanEdge) },
  gem:       { bg: '', indicator: Gem,          text: 'text-white',    style: solid(F.pink,   F.pinkEdge) },
  frozen:    { bg: '', indicator: Snowflake,    text: 'text-neo-navy', style: solid(F.iceLt,  F.cyanEdge) },
  magnet:    { bg: '', indicator: Magnet,       text: 'text-white',    style: solid(F.violet, F.violetEdge) },
  diamond:   { bg: '', indicator: Diamond,      text: 'text-neo-navy', style: solid(F.aqua,   F.aquaEdge) },
  countdown: { bg: '', indicator: Hourglass,    text: 'text-white',    style: solid(F.orange, F.orangeEdge) },
  shuffle:   { bg: '', indicator: Shuffle,      text: 'text-white',    style: solid(F.orchid, F.orchidEdge) },
  magma:     { bg: '', indicator: Flame,        text: 'text-white',    style: solid(F.magma,  F.magmaEdge) },
  portal:    { bg: '', indicator: Orbit,        text: 'text-white',    style: solid(F.deepV,  F.deepVEdge) },
  catalyst:  { bg: '', indicator: FlaskConical, text: 'text-neo-navy', style: solid(F.teal,   F.tealEdge) },
  crystal:   { bg: '', indicator: Sparkles,     text: 'text-white',    style: solid(F.lilac,  F.lilacEdge) },
  fuse:      { bg: '', indicator: Flame,        text: 'text-neo-navy', style: solid(F.fuse,   F.fuseEdge) },
  anchor:    { bg: '', indicator: Anchor,       text: 'text-white',    style: solid(F.anchor, F.anchorEdge) },
  // chocolate + cake paint via overlays in BlastTile; visual record is intentionally minimal.
  chocolate: { bg: '', text: 'text-white',    style: { background: '#3a1f0e', boxShadow: HARD_SHADOW, border: `3px solid #1c0e04` } },
  cake:      { bg: '', text: 'text-white',    style: { background: 'transparent', boxShadow: HARD_SHADOW, border: `3px solid ${INK}` } },
  // locked + key paint via dedicated BlastTile overlays; visual record is minimal.
  locked:    { bg: '', text: 'text-white',    style: { background: '#1a2444', boxShadow: HARD_SHADOW, border: `3px solid ${INK}` } },
  key:       { bg: '', text: 'text-neo-navy', style: { background: '#FFD32A', boxShadow: HARD_SHADOW, border: `3px solid #9A6B00` } },
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
