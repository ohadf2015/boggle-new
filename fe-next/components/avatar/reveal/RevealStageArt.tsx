/**
 * Hand-drawn props for the reveal stage, in the avatar art's own language
 * (one navy outline, light from the top-left, cel-shade on the lower right):
 * the reward box the avatar pops out of, its flying lid, the hands on the rim,
 * the thumbs-up, and the little effects that float around each item.
 *
 * Stage coordinates: viewBox 0 0 200 214. The avatar is drawn at
 * translate(22 2) scale 1.56, so its shoulders meet the box rim at y≈140.
 * Pure SVG, no hooks.
 */
import type { ReactNode } from 'react';
import type { RevealFx } from './revealAttitude';
import type { RevealBox } from './revealTheme';

export const INK = '#141A33';
const LINE = 3;
export const RIM_Y = 140;

// ── Box ──────────────────────────────────────────────────────────────

/** The open top of the box + the light pouring out of it (behind the avatar). */
export function BoxBack({ box, uid }: { box: RevealBox; uid: string }) {
  return (
    <g data-testid="unlock-reveal-box">
      <defs>
        <linearGradient id={`${uid}-in`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={box.inside} />
          <stop offset="1" stopColor={box.glow} />
        </linearGradient>
      </defs>
      <ellipse cx="106" cy="203" rx="80" ry="6.5" fill="#000" opacity="0.35" />
      <path d="M44 130 L182 130 L168 140 L32 140 Z" fill={`url(#${uid}-in)`} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
    </g>
  );
}

/** Front face: glossy gradient, cel-shade, halftone grit, ribbon, star medallion, rim lip. */
export function BoxFront({ box, star, uid }: { box: RevealBox; star: string; uid: string }) {
  const face = 'M32 140 L168 140 L164 197 L36 197 Z';
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-bx`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={box.light} />
          <stop offset="0.3" stopColor={box.face} />
          <stop offset="1" stopColor={box.shade} />
        </linearGradient>
        <pattern id={`${uid}-grit`} patternUnits="userSpaceOnUse" width="4" height="4">
          <circle cx="1" cy="1" r="0.55" fill="#000" />
        </pattern>
        <pattern id={`${uid}-wrap`} patternUnits="userSpaceOnUse" width="16" height="14" patternTransform="rotate(-8)">
          <circle cx="4" cy="4" r="2.6" fill={box.light} />
          <circle cx="12" cy="11" r="2.6" fill={box.light} />
        </pattern>
        <clipPath id={`${uid}-face`}><path d={face} /></clipPath>
      </defs>
      {/* right side, receding: a 3/4 box, not a flat panel */}
      <path d="M168 140 L182 130 L179.5 186 L164 197 Z" fill={box.shade} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M168 140 L182 130 L181.4 144 L167.4 154 Z" fill="#fff" opacity="0.18" />
      <path d="M173 136.4 L177 133.6 L174.6 189 L170.6 191.8 Z" fill={box.ribbonShade} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={face} fill={`url(#${uid}-bx)`} />
      <g clipPath={`url(#${uid}-face)`}>
        <rect x="30" y="138" width="140" height="62" fill={`url(#${uid}-wrap)`} opacity="0.55" />
        <path d="M168 140 L164 197 L36 197 L36.6 186 Q100 192 157 183 Q162 163 161 140 Z" fill={box.shade} opacity="0.55" />
        <rect x="30" y="138" width="140" height="62" fill={`url(#${uid}-grit)`} opacity="0.1" />
        <path d="M42 149 L45 188" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity="0.55" />
        <path d="M50 150 L51.5 162" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </g>
      <path d={face} fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      {/* ribbon */}
      <path d="M91 140 L109 140 L108.4 197 L91.6 197 Z" fill={box.ribbon} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M104 141.5 L107.6 141.5 L107.1 195.5 L103.6 195.5 Z" fill={box.ribbonShade} />
      {/* medallion */}
      <circle cx="100" cy="169" r="12" fill={box.light} stroke={INK} strokeWidth="2.6" />
      <path
        d="M100 160.8 L102.5 166.1 L108.3 166.7 L103.9 170.5 L105.2 176.2 L100 173.2 L94.8 176.2 L96.1 170.5 L91.7 166.7 L97.5 166.1 Z"
        fill={star}
        stroke={INK}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="96" cy="164.5" r="1.3" fill="#fff" opacity="0.9" />
      {/* rim lip */}
      <path d="M169.2 145.8 L170 138.5 L184 128.6 L183.4 135.4 Z" fill={box.face} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M30 138.5 L170 138.5 L169.2 145.8 L30.8 145.8 Z" fill={box.light} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M36 141.6 L120 141.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

/** The lid, blown off to the upper left (behind the avatar). */
export function FlyingLid({ box }: { box: RevealBox }) {
  return (
    <g transform="translate(36 60) rotate(-26)">
      <g className="lcr-anim lcr-lid">
        <path d="M-40 -15 L40 -15 L43 -9 L-43 -9 Z" fill={box.light} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        <path d="M-43 -9 L43 -9 L41 9 L-41 9 Z" fill={box.face} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
        <path d="M-41 3 L41 3 L41 9 L-41 9 Z" fill={box.shade} opacity="0.5" />
        <rect x="-7" y="-9" width="14" height="18" fill={box.ribbon} stroke={INK} strokeWidth="2.4" />
        <path d="M0 -15 C-15 -33 -27 -17 -6 -14 Z" fill={box.ribbon} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M0 -15 C15 -33 27 -17 6 -14 Z" fill={box.ribbon} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M-2 -17 C-8 -24 -14 -22 -9 -17" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <circle cx="0" cy="-15" r="3.8" fill={box.ribbonShade} stroke={INK} strokeWidth="2.2" />
      </g>
      <g className="lcr-anim lcr-whoosh" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.85">
        <path d="M34 22 L48 30" />
        <path d="M22 28 L32 34" />
        <path d="M44 12 L54 17" />
      </g>
    </g>
  );
}

// ── Hands ────────────────────────────────────────────────────────────

const GRIP =
  'M-14 1 C-14 -9 -8 -15 0 -15 C8 -15 14 -9 14 1 L14 5 A3.5 3.5 0 0 1 7 5 A3.5 3.5 0 0 1 0 5 A3.5 3.5 0 0 1 -7 5 A3.5 3.5 0 0 1 -14 5 Z';

/** A mitten hand holding the box rim, fingers curled over the front. */
export function GripHand({ x, skin, flip = false }: { x: number; skin: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${RIM_Y + 1}) scale(${flip ? -0.92 : 0.92} 0.92)`}>
      <path d={GRIP} fill={skin} stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M14 1 L14 5 A3.5 3.5 0 0 1 7 5 A3.5 3.5 0 0 1 0 5 A3.5 3.5 0 0 1 -7 5 A3.5 3.5 0 0 1 -14 5 L-14 3 Q0 6 14 1 Z" fill="#000" opacity="0.14" />
      <path d="M7 0.5 L7 5 M0 1.5 L0 5 M-7 0.5 L-7 5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M-8 -10 Q-4 -13 1 -12.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.55" />
    </g>
  );
}

/** Thumbs-up beside the head (the free hand for the `thumbsUp` pose). */
export function ThumbsUp({ skin }: { skin: string }) {
  return (
    <g transform="translate(170 110) rotate(10) scale(1.08)">
      <g className="lcr-anim lcr-pop-in" style={{ animationDelay: '480ms' }}>
        <path
          d="M-10 -1 C-10 -7 -6 -9 -3 -9 L-3 -19 C-3 -25 5 -25 5 -19 L5 -9 L9 -9 C13 -9 14 -5.5 13 -2.5 L12 9 C12 12 9 13.5 7 13.5 L-6 13.5 C-9.5 13.5 -11 11 -11 8 Z"
          fill={skin}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M-11 8 L12 8 C12 12 9 13.5 7 13.5 L-6 13.5 C-9.5 13.5 -11 11 -11 8 Z" fill="#000" opacity="0.14" />
        <path d="M-11 2.5 L12.6 2.5 M-11 8 L12 8" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M0 -21 Q2 -23 3.5 -21" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.65" />
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.9">
          <path d="M-9 -20 L-13 -25" />
          <path d="M11 -18 L16 -22" />
          <path d="M1 -30 L1 -35" />
        </g>
      </g>
    </g>
  );
}

// ── Effects ──────────────────────────────────────────────────────────

/** Where the floating effects sit (around the head, clear of the lid). */
export const FX_SPOTS: ReadonlyArray<{ x: number; y: number; s: number; rot: number }> = [
  { x: 168, y: 50, s: 1.3, rot: 12 },
  { x: 30, y: 102, s: 1.05, rot: -12 },
  { x: 186, y: 84, s: 0.85, rot: 16 },
  { x: 150, y: 16, s: 0.8, rot: 8 },
  { x: 20, y: 132, s: 0.75, rot: -6 },
  { x: 64, y: 14, s: 0.7, rot: -10 },
];
/** With a thumbs-up beside the head, the spot next to it moves down beside the box. */
const THUMB_SWAP = { index: 2, spot: { x: 194, y: 158, s: 0.8, rot: 16 } } as const;

export function fxSpots(withThumb: boolean): ReadonlyArray<{ x: number; y: number; s: number; rot: number }> {
  if (!withThumb) return FX_SPOTS;
  return FX_SPOTS.map((p, i) => (i === THUMB_SWAP.index ? THUMB_SWAP.spot : p));
}

const BAT = 'M0 -2 C-2 -5 -4 -5 -5 -3 C-8 -8 -13 -6 -15 -2 C-12 -3 -10 -1 -10 1 C-8 -1 -6 0 -5 2 C-3 0 -1 1 0 3 C1 1 3 0 5 2 C6 0 8 -1 10 1 C10 -1 12 -3 15 -2 C13 -6 8 -8 5 -3 C4 -5 2 -5 0 -2 Z';

function glyph(kind: RevealFx, i: number, accent: string): ReactNode {
  const alt = i % 2 === 0;
  switch (kind) {
    case 'notes':
      return (
        <g>
          <path d="M3.5 7 L3.5 -9 Q9 -7 10 -2" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="0" cy="7.5" rx="4.6" ry="3.4" transform="rotate(-22 0 7.5)" fill={alt ? '#BFFF00' : '#22E5FF'} stroke={INK} strokeWidth="1.8" />
        </g>
      );
    case 'hearts':
      return (
        <g>
          <path d="M0 -2 C-2 -6 -9 -6 -9 0 C-9 5 -3 8 0 11 C3 8 9 5 9 0 C9 -6 2 -6 0 -2 Z" fill={alt ? '#FF3D9A' : '#FF6FB5'} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <ellipse cx="-4.3" cy="-1" rx="2" ry="1.3" fill="#fff" opacity="0.85" transform="rotate(-30 -4.3 -1)" />
        </g>
      );
    case 'stars':
      return (
        <g>
          <path d="M0 -10 L3 -3.2 L10.4 -2.6 L4.8 2.2 L6.4 9.4 L0 5.6 L-6.4 9.4 L-4.8 2.2 L-10.4 -2.6 L-3 -3.2 Z" fill={alt ? '#FFD23F' : accent} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="-2.4" cy="-2.4" r="1.2" fill="#fff" opacity="0.9" />
        </g>
      );
    case 'sparkles':
      return (
        <path d="M0 -11 Q1.6 -1.6 11 0 Q1.6 1.6 0 11 Q-1.6 1.6 -11 0 Q-1.6 -1.6 0 -11 Z" fill={alt ? '#FFFFFF' : accent} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      );
    case 'bubbles':
      return (
        <g>
          <circle r="7.5" fill={alt ? '#9CF6FF' : '#BFFF9E'} fillOpacity="0.55" stroke={INK} strokeWidth="1.8" />
          <path d="M-4.2 -2.4 Q-3.4 -4.8 -1 -5.2" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'bats':
      return <path d={BAT} fill={alt ? '#3B2A6B' : INK} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />;
    case 'bolts':
      return (
        <path d="M2 -12 L-6 1 L-0.5 1 L-3 12 L7 -3 L1.5 -3 Z" fill={alt ? '#FFE14D' : '#22E5FF'} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      );
    case 'snow':
      return (
        <g stroke={INK} strokeLinecap="round">
          <g strokeWidth="4.2">
            <path d="M0 -9 L0 9 M-7.8 -4.5 L7.8 4.5 M-7.8 4.5 L7.8 -4.5" />
          </g>
          <g stroke={alt ? '#FFFFFF' : '#BDF3FF'} strokeWidth="2">
            <path d="M0 -9 L0 9 M-7.8 -4.5 L7.8 4.5 M-7.8 4.5 L7.8 -4.5" />
          </g>
        </g>
      );
  }
}

/** The item's floating effect, six of them around the head, popping in then bobbing. */
export function FxGlyphs({ kind, accent, withThumb = false }: { kind: RevealFx; accent: string; withThumb?: boolean }) {
  return (
    <g>
      {fxSpots(withThumb).map((p, i) => (
        <g key={i} data-fx-glyph={kind} transform={`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${p.s})`}>
          <g className="lcr-anim lcr-pop-in" style={{ animationDelay: `${200 + i * 70}ms` }}>
            <g className="lcr-anim lcr-float" style={{ animationDelay: `${(1 + i * 0.37).toFixed(2)}s` }}>
              {glyph(kind, i, accent)}
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

// ── Background unlock ────────────────────────────────────────────────

/** A background unlock: the new color as a big disc behind the head (stars in a dark one). */
export function ColorBackdrop({ color, ring, dark }: { color: string; ring: string; dark: boolean }) {
  return (
    <g>
      <circle cx="100" cy="80" r="90" fill={ring} opacity="0.3" />
      <circle cx="100" cy="80" r="84" fill={ring} stroke={INK} strokeWidth={LINE} />
      <circle data-testid="unlock-reveal-backdrop" cx="100" cy="80" r="77" fill={color} stroke={INK} strokeWidth={LINE} />
      <path d="M36 52 A70 70 0 0 1 88 11" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity={dark ? 0.4 : 0.6} />
      {dark && (
        <g fill="#fff">
          <circle cx="44" cy="92" r="1.4" opacity="0.8" />
          <circle cx="158" cy="60" r="1.7" opacity="0.9" />
          <circle cx="150" cy="112" r="1.2" opacity="0.7" />
          <circle cx="62" cy="30" r="1.1" opacity="0.7" />
          <circle cx="132" cy="22" r="1" opacity="0.6" />
          <path d="M162 88 Q162.9 91.6 166.5 92.5 Q162.9 93.4 162 97 Q161.1 93.4 157.5 92.5 Q161.1 91.6 162 88 Z" opacity="0.95" />
          <path d="M40 62 Q40.7 64.8 43.5 65.5 Q40.7 66.2 40 69 Q39.3 66.2 36.5 65.5 Q39.3 64.8 40 62 Z" opacity="0.85" />
        </g>
      )}
    </g>
  );
}

/** Light shafts fanning up out of the open box (behind everything but the burst). */
export function LightShafts({ color }: { color: string }) {
  const shafts = [0.52, 0.92, 1.32, 1.82, 2.22, 2.6].map(a => {
    const x1 = 100 + 150 * Math.cos(a);
    const y1 = 138 - 170 * Math.sin(a);
    const x2 = 100 + 150 * Math.cos(a + 0.13);
    const y2 = 138 - 170 * Math.sin(a + 0.13);
    return `M100 138 L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  });
  return (
    <g className="lcr-anim lcr-shafts" fill={color} opacity="0.3">
      {shafts.map((d, i) => <path key={i} d={d} />)}
    </g>
  );
}
