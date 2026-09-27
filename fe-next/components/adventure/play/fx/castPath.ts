/**
 * Cast choreography (pure): the traced letters lift off and snap into ONE big word
 * banner (a centred row between board and target — Bookworm's cast word) with a praise
 * bubble. The banner HANGS there, glowing, for the whole cast while glowing bolts of
 * each letter dive into the target. The word ASSEMBLES letter by letter (~120ms), impact
 * is FRONT-LOADED (~0.17-0.32s) so the enemy is visibly reacting for most of the cast,
 * then a long decay (held recoil, count-up, fade) to ~1.15s.
 * Everything is gone by 1.2s. Every valid word gets this, not just the big ones.
 */

const GUTTER = 16;
/** Each letter's own lift-off → landing in its banner slot. */
const LAND_MS = 70;
/** The word assembles letter by letter over this span (Bookworm's word "building up"). */
const ASSEMBLE_SPAN_MS = 120;
const MAX_STAGGER_MS = 80;
/** Beat between the word completing and the bolts diving. */
const DIVE_GAP_MS = 10;
const BOLT_MS = 90;
const BOLT_SPAN_MS = 30;
const HOLD_MS = 1150;

export interface RowSlot { x: number; y: number; size: number }

/** Centre + size of each letter in the banner row; RTL puts the first letter on the right. */
export function castRow(n: number, tileW: number, vw: number, y: number, rtl = false): RowSlot[] {
  const count = Math.max(1, n);
  const gap = 4;
  const fit = (vw - GUTTER * 2 - gap * (count - 1)) / count;
  const size = Math.floor(Math.min(tileW * 1.15, fit, 96));
  const width = size * count + gap * (count - 1);
  const start = vw / 2 - width / 2 + size / 2;
  return Array.from({ length: n }, (_, i) => ({ x: Math.round(start + (rtl ? n - 1 - i : i) * (size + gap)), y, size }));
}

export interface CastTiming {
  /** Letters have snapped into the mid-air word banner. */
  snapMs: number;
  /** First bolt leaves the banner for the target. */
  diveAt: number;
  /** One bolt's travel time. */
  flightMs: number;
  /** Gap between consecutive letters lifting off (assembly). */
  stagger: number;
  /** Gap between consecutive bolts diving. */
  boltStagger: number;
  /** One letter's lift → landing time. */
  landMs: number;
  /** Last bolt lands: number, flash, recoil. */
  impactMs: number;
  /** The word banner + praise hang in the air until this, then fade. */
  holdMs: number;
}

export function castTiming(n: number, reduced: boolean): CastTiming {
  const stagger = n > 1 ? Math.min(MAX_STAGGER_MS, Math.round(ASSEMBLE_SPAN_MS / (n - 1))) : 0;
  if (reduced) return { snapMs: 0, diveAt: 0, flightMs: BOLT_MS, stagger, boltStagger: 0, impactMs: 0, holdMs: HOLD_MS, landMs: 0 };
  const snapMs = stagger * Math.max(0, n - 1) + LAND_MS;
  const diveAt = snapMs + DIVE_GAP_MS;
  const boltStagger = n > 1 ? Math.min(20, Math.floor(BOLT_SPAN_MS / (n - 1))) : 0;
  const impactMs = diveAt + BOLT_MS + boltStagger * Math.max(0, n - 1);
  return { snapMs, diveAt, flightMs: BOLT_MS, stagger, boltStagger, impactMs, holdMs: HOLD_MS, landMs: LAND_MS };
}

export interface FlightVec { wx: number; wy: number; ws: number; rot: number }

const tr = (x: number, y: number, s: number, r: number) => `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${s.toFixed(3)}) rotate(${r}deg)`;

/**
 * Web Animations keyframes for one banner letter (px offsets from its tile) over the
 * whole hold: lift + tilt, snap into the banner slot, a bounce as the bolts fire,
 * then hang there glowing until a quick fade at the very end.
 * `snap` = fraction of the duration spent getting into the slot.
 */
export function flightKeyframes({ wx, wy, ws, rot }: FlightVec, snap: number): Keyframe[] {
  const s = Math.min(0.4, Math.max(0.05, snap));
  return [
    { offset: 0, transform: tr(0, 0, 1, 0), opacity: 1, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' },
    { offset: s * 0.4, transform: tr(0, -18, 1.16, rot), easing: 'cubic-bezier(0.3, 0.8, 0.3, 1.1)' },
    { offset: s, transform: tr(wx, wy, ws, 0), easing: 'ease-out' },
    { offset: s + 0.1, transform: tr(wx, wy - 8, ws * 1.14, 0), easing: 'ease-in-out' },
    { offset: s + 0.22, transform: tr(wx, wy, ws, 0), opacity: 1 },
    { offset: 0.88, transform: tr(wx, wy, ws, 0), opacity: 1 },
    { offset: 1, transform: tr(wx, wy - 14, ws * 0.9, 0), opacity: 0 },
  ];
}

/** A bolt (glowing copy of a banner letter) diving from its slot into the target. */
export function boltKeyframes({ dx, dy }: { dx: number; dy: number }): Keyframe[] {
  return [
    { offset: 0, transform: tr(0, 0, 1, 0), opacity: 1, easing: 'cubic-bezier(0.55, 0, 0.9, 0.45)' },
    { offset: 0.9, transform: tr(dx * 0.95, dy * 0.95, 0.5, dx >= 0 ? 18 : -18), opacity: 1 },
    { offset: 1, transform: tr(dx, dy, 0.45, dx >= 0 ? 20 : -20), opacity: 0 },
  ];
}

/**
 * Gem tiles (Bookworm): every cast letter gets its own gem colour + matching glow, so a
 * word reads as a string of jewels, never one flat hue. Rare letters are gold.
 * Neighbours never share a colour. Tier is expressed by glow size, not variety.
 */
export interface Gem { fill: string; glow: string; rare: boolean }

const GEMS: ReadonlyArray<Omit<Gem, 'rare'>> = [
  { fill: '#ff8cc6', glow: '#ff2d95' }, // pink
  { fill: '#bef264', glow: '#65d10f' }, // green
  { fill: '#c4b5fd', glow: '#8b5cf6' }, // purple
  { fill: '#67e8f9', glow: '#0ea5e9' }, // blue
  { fill: '#fdba74', glow: '#ff4d2e' }, // ember
];
const GOLD = { fill: '#fde047', glow: '#f59e0b' };
const RARE = new Set(['J', 'Q', 'X', 'Z', 'K']);

export function letterGems(chars: readonly string[]): Gem[] {
  const out: Gem[] = [];
  let prev = -1;
  for (const ch of chars) {
    const up = ch.toUpperCase();
    const prevFill = out[out.length - 1]?.fill;
    if (RARE.has(up) && prevFill !== GOLD.fill) {
      out.push({ ...GOLD, rare: true });
      prev = -1;
      continue;
    }
    let idx = (up.codePointAt(0) ?? 0) % GEMS.length;
    if (idx === prev || GEMS[idx].fill === prevFill) idx = (idx + 1) % GEMS.length;
    out.push({ ...GEMS[idx], rare: RARE.has(up) });
    prev = idx;
  }
  return out;
}

/**
 * Target recoil over the whole post-impact window: a white-hot flash + knockback, then the
 * target HOLDS the knocked-back, red-hurt pose (pulsing) through the first half so every
 * frame of the hit shows it reeling, then a wobbling settle back to rest.
 */
export function recoilKeyframes({ kx, ky }: { kx: number; ky: number }, knockPx: number, power: number): { frames: Keyframe[]; duration: number } {
  const p = Math.min(1, Math.max(0, power));
  const k = knockPx;
  const squash = 1 - 0.06 - p * 0.1;
  const rot = (kx >= 0 ? 1 : -1) * Math.round(6 + p * 10);
  const at = (f: number) => `translate(${Math.round(kx * k * f)}px, ${Math.round(ky * k * f)}px)`;
  const hurt = 'brightness(1.4) sepia(1) saturate(5) hue-rotate(-40deg)';
  const white = 'brightness(3.2) saturate(0.1)';
  return {
    duration: Math.round(740 + p * 140),
    frames: [
      { offset: 0, transform: 'none', filter: 'none' },
      { offset: 0.05, transform: `${at(1)} scale(${squash.toFixed(3)}) rotate(${rot}deg)`, filter: white },
      { offset: 0.14, transform: `${at(0.95)} scale(${((squash + 1) / 2).toFixed(3)}) rotate(${Math.round(rot * 0.8)}deg)`, filter: hurt },
      { offset: 0.26, transform: `${at(0.85)} rotate(${Math.round(rot * 0.7)}deg)`, filter: 'brightness(2.4) saturate(0.4)' },
      { offset: 0.38, transform: `${at(0.75)} rotate(${Math.round(rot * 0.6)}deg)`, filter: hurt },
      { offset: 0.5, transform: `${at(0.55)} rotate(${Math.round(rot * 0.4)}deg)`, filter: 'brightness(1.3) sepia(0.8) saturate(4) hue-rotate(-40deg)' },
      { offset: 0.68, transform: `${at(-0.12)} rotate(${-Math.round(rot / 4)}deg)`, filter: 'brightness(1.15) sepia(0.4) saturate(2) hue-rotate(-40deg)' },
      { offset: 0.86, transform: `${at(0.04)}`, filter: 'none' },
      { offset: 1, transform: 'none', filter: 'none' },
    ],
  };
}
