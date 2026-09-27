/**
 * Drawing kit for the 2026-09 avatar art: colors, line weights and the few
 * primitives every part is built from. Server-safe (no hooks, no contexts,
 * no CSS imports) — the same parts render in the browser and in the Express
 * PNG route.
 *
 * Style rules (keep every part consistent):
 *  - ONE outline color (INK, brand navy) at ONE weight (LINE) for silhouettes,
 *    DETAIL for inner lines. Never a gradient outline.
 *  - Light comes from the top-left: every mass gets a cel-shade crescent on
 *    its lower-right (`Shaded`) and, where it helps, one soft highlight on the
 *    upper-left. No blur, no soft gradients on common parts.
 *  - Rare+ parts may use gradients, gloss and glow; common parts stay flat.
 *
 * Anchors (viewBox 0 0 100 100): head x 28–72 y 22–71, eyes y 49 at x 40/60,
 * brows y 41, nose y 55, mouth y 61.5, ears y 50, neck y 64–78, shoulders 78+.
 */
import type { ReactNode } from 'react';

export const INK = '#141A33';
export const LINE = 1.9;
export const DETAIL = 1.3;
export const WHITE = '#FFFFFF';

export const BRAND = {
  lime: '#BFFF00',
  pink: '#FF3D9A',
  cyan: '#22E5FF',
  purple: '#9B6BFF',
  navy: '#141A33',
  gold: '#FFC928',
  goldDeep: '#E08A00',
  goldLight: '#FFF0A8',
} as const;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  const h = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#808080';
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => clampByte(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix toward black. */
export function shade(hex: string, amount = 0.2): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Mix toward white. */
export function tint(hex: string, amount = 0.3): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** 0 (black) … 1 (white), perceptual. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Shade tone for a fill: a dark fill needs a lift, not more black, or the
 * crescent disappears into the outline.
 */
export function shadeFor(hex: string): string {
  return luminance(hex) < 0.22 ? tint(hex, 0.14) : shade(hex, 0.2);
}

/** Line/feature color drawn ON a fill (brows on dark hair, etc.). */
export function inkOn(hex: string): string {
  return luminance(hex) < 0.3 ? tint(hex, 0.45) : INK;
}

/** Safe fragment id from any string (React 19 useId has non-url chars). */
export function safeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '') || 'av';
}

export interface ArtCtx {
  uid: string;
  gender: 'male' | 'female';
  base: string;
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  hairLight: string;
  brow: string;
  eye: string;
  acc: string;
  accShade: string;
  shirt: string;
  /** Idle motion on (client, effects enabled, not SSR). */
  animated: boolean;
}

interface OutlineProps {
  d: string;
  fill: string;
  sw?: number;
  opacity?: number;
}

/** Filled path with the house outline. */
export function O({ d, fill, sw = LINE, opacity }: OutlineProps) {
  return <path d={d} fill={fill} stroke={INK} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />;
}

/** Plain stroked line (no fill). */
export function L({ d, w = LINE, c = INK, opacity }: { d: string; w?: number; c?: string; opacity?: number }) {
  return <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

interface ShadedProps {
  ctx: ArtCtx;
  /** unique within one avatar */
  name: string;
  d: string;
  fill: string;
  shadeColor?: string;
  /** crescent thickness (light from top-left) */
  dx?: number;
  dy?: number;
  sw?: number;
  children?: ReactNode;
}

/**
 * A mass with a cel-shade crescent on its lower-right and an outline on top.
 * `children` are clipped to the mass (patterns, highlights, stripes).
 */
export function Shaded({ ctx, name, d, fill, shadeColor, dx = 2.2, dy = 2.4, sw = LINE, children }: ShadedProps) {
  const id = `${ctx.uid}-${name}`;
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={shadeColor ?? shadeFor(fill)} />
        <path d={d} fill={fill} transform={`translate(${-dx} ${-dy})`} />
        {children}
      </g>
      <path d={d} fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
}

/** 4-point sparkle centred at (x, y). `cls` makes it twinkle when animated. */
export function Sparkle({ x, y, r, fill = WHITE, cls, delay }: { x: number; y: number; r: number; fill?: string; cls?: string; delay?: number }) {
  const k = r * 0.28;
  const d = `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`;
  return (
    <path
      d={d}
      fill={fill}
      stroke={INK}
      strokeWidth={Math.max(0.6, r * 0.18)}
      strokeLinejoin="round"
      className={cls}
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
    />
  );
}

/** Two-stop linear gradient def (top → bottom unless `horizontal`). */
export function Grad({ id, from, to, mid, horizontal }: { id: string; from: string; to: string; mid?: string; horizontal?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2={horizontal ? '0' : '1'}>
      <stop offset="0" stopColor={from} />
      {mid && <stop offset="0.5" stopColor={mid} />}
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

/** Mirror a part drawn for the LEFT side onto the right (x → 100 - x). */
export function Mirror({ children }: { children: ReactNode }) {
  return <g transform="translate(100 0) scale(-1 1)">{children}</g>;
}

/**
 * Legendary material: gold leaf with a hot highlight band. Every legendary
 * part is made (at least partly) of this, so the tier reads as ONE material
 * across hair, faces and accessories — not just a frame around the avatar.
 */
export function GoldFoil({ id, horizontal }: { id: string; horizontal?: boolean }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0.35'} y2={horizontal ? '0.2' : '1'}>
        <stop offset="0" stopColor={BRAND.goldLight} />
        <stop offset="0.38" stopColor={BRAND.gold} />
        <stop offset="0.52" stopColor="#FFF7D6" />
        <stop offset="0.66" stopColor={BRAND.gold} />
        <stop offset="1" stopColor={BRAND.goldDeep} />
      </linearGradient>
    </defs>
  );
}
