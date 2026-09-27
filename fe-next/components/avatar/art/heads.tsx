/**
 * Heads ("base"): the face shape, ears and neck. Human heads take the
 * player's skin color; costume heads (slime, diamond, skull, robot, alien,
 * ghost, dragon) have their own signature color — they are items, and an
 * item should look the same on everyone.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, GoldFoil, INK, L, O, Shaded, Sparkle, WHITE, shade, tint, type ArtCtx } from './kit';

export interface HeadDef {
  d: string;
  /** ear centre x (left); null = no ears */
  earX: number | null;
  /** fixed costume color (overrides skin for head + neck) */
  costume?: string;
  /** draws its own nose anatomy → skip the nose part */
  ownNose?: boolean;
  /** blush reads wrong on this material */
  noBlush?: boolean;
  /** extra art clipped inside the head (texture, facets) */
  inner?: (ctx: ArtCtx) => ReactNode;
  /** art drawn ABOVE hair (cat ears, horns, antenna) */
  top?: (ctx: ArtCtx) => ReactNode;
  /** art drawn behind the head (fins, glow) */
  behind?: (ctx: ArtCtx) => ReactNode;
  /** horizontal scale for hair drawn for the 44-wide square head (default 1) */
  hairScale?: number;
}

const SQUARE = 'M28 37 Q28 22 43 22 L57 22 Q72 22 72 37 L72 57 Q72 71 57 71 L43 71 Q28 71 28 57 Z';

export const HEADS: Record<string, HeadDef> = {
  square: { d: SQUARE, earX: 28.5 },
  round: { d: 'M24.5 47.5 A25.5 24.5 0 1 0 75.5 47.5 A25.5 24.5 0 1 0 24.5 47.5 Z', earX: 25.5, hairScale: 1.1 },
  oval: { d: 'M30 46.5 A20 26 0 1 0 70 46.5 A20 26 0 1 0 30 46.5 Z', earX: 30.5, hairScale: 0.93 },
  heart: {
    d: 'M27 38 Q27 21 44 21 L56 21 Q73 21 73 38 L72.5 47 Q71.5 58 60 67 Q54 73.5 50 73.5 Q46 73.5 40 67 Q28.5 58 27.5 47 Z',
    earX: 28,
    hairScale: 1.03,
  },
  pear: {
    d: 'M32 34 Q32 21 50 21 Q68 21 68 34 L73 54 Q75.5 71 58 71 L42 71 Q24.5 71 27 54 Z',
    earX: 28.5,
    hairScale: 0.95,
  },
  catFace: {
    d: SQUARE,
    earX: null,
    top: ctx => (
      <g>
        <O d="M29 31 L27 12 L43 22 Z" fill={ctx.skin} />
        <path d="M30.5 27 L29.5 16.5 L38 22 Z" fill="#FF9EC7" />
        <O d="M71 31 L73 12 L57 22 Z" fill={ctx.skin} />
        <path d="M69.5 27 L70.5 16.5 L62 22 Z" fill="#FF9EC7" />
      </g>
    ),
    inner: () => (
      <g stroke={INK} strokeWidth={0.9} strokeLinecap="round" opacity={0.7}>
        <path d="M31 56 L22 54 M31 59 L22 60 M69 56 L78 54 M69 59 L78 60" />
      </g>
    ),
  },
  // ── rare ──
  slime: {
    hairScale: 1.03,
    d: 'M27 45 Q27 20 50 20 Q73 20 73 45 L73 64 Q73 68 70 68 Q68 68 68 72 Q68 75 65 75 Q62 75 62 71 L60 70 L40 70 Q38 70 38 74 Q38 77 35 77 Q32 77 32 73 L32 70 Q27 70 27 64 Z',
    earX: null,
    costume: '#6BE36B',
    noBlush: true,
    inner: () => (
      <g>
        <ellipse cx="39" cy="31" rx="6" ry="3.4" fill={WHITE} opacity="0.55" transform="rotate(-25 39 31)" />
        <circle cx="47" cy="27" r="1.6" fill={WHITE} opacity="0.7" />
        <circle cx="64" cy="62" r="2.2" fill="#A8FF9E" stroke={INK} strokeWidth="0.7" />
        <circle cx="33" cy="58" r="1.4" fill="#A8FF9E" stroke={INK} strokeWidth="0.6" />
      </g>
    ),
  },
  diamond: {
    d: 'M40 21 L60 21 L73 36 L70 60 L56 72 L44 72 L30 60 L27 36 Z',
    earX: null,
    costume: '#8BEBFF',
    noBlush: true,
    inner: () => (
      <g>
        <path d="M40 21 L50 34 L60 21 Z" fill="#D4F9FF" />
        <path d="M27 36 L40 21 L50 34 Z" fill="#B9F4FF" />
        <path d="M73 36 L60 21 L50 34 Z" fill="#6FD8F2" />
        <path d="M30 60 L27 36 L36 48 Z" fill="#C7F7FF" opacity="0.8" />
        <path d="M70 60 L73 36 L64 48 Z" fill="#4CC3E6" opacity="0.8" />
        <g stroke={INK} strokeWidth={0.8} fill="none" opacity="0.45">
          <path d="M27 36 L73 36 M40 21 L50 34 L60 21 M30 60 L36 48 L27 36 M70 60 L64 48 L73 36 M44 72 L50 66 L56 72" />
        </g>
        <Sparkle x={37} y={29} r={3} />
      </g>
    ),
  },
  // ── epic ──
  skull: {
    hairScale: 1.06,
    d: 'M26 44 Q26 20 50 20 Q74 20 74 44 Q74 55 67 59 L66 67 Q66 72 60 72 L40 72 Q34 72 34 67 L33 59 Q26 55 26 44 Z',
    earX: null,
    costume: '#F3ECD9',
    ownNose: true,
    noBlush: true,
    inner: () => (
      <g>
        <g className="av-glow">
          <ellipse cx="40" cy="49" rx="9.4" ry="8.6" fill={BRAND.purple} opacity="0.45" />
          <ellipse cx="60" cy="49" rx="9.4" ry="8.6" fill={BRAND.purple} opacity="0.45" />
        </g>
        <ellipse cx="40" cy="49" rx="8" ry="7.2" fill="#3A2F4A" opacity="0.85" />
        <ellipse cx="60" cy="49" rx="8" ry="7.2" fill="#3A2F4A" opacity="0.85" />
        <path d="M50 54 L47 59 L53 59 Z" fill="#3A2F4A" />
        <L d="M58 22 L55 28 L58 31" w={0.9} />
        <g stroke={INK} strokeWidth={0.9}>
          <path d="M42 66 L42 71 M46 66 L46 72 M50 66 L50 72 M54 66 L54 72 M58 66 L58 71" />
        </g>
      </g>
    ),
  },
  robotHead: {
    d: 'M29 30 Q29 23 36 23 L64 23 Q71 23 71 30 L71 64 Q71 71 64 71 L36 71 Q29 71 29 64 Z',
    earX: null,
    costume: '#B9C6DA',
    noBlush: true,
    inner: () => (
      <g>
        <rect x="33" y="27" width="34" height="3" rx="1.5" fill={WHITE} opacity="0.5" />
        <g stroke={INK} strokeWidth={0.7} opacity="0.5">
          <path d="M29 38 L33 38 M67 38 L71 38 M29 62 L33 62 M67 62 L71 62" />
        </g>
        <circle cx="33" cy="67" r="1.1" fill={INK} opacity="0.5" />
        <circle cx="67" cy="67" r="1.1" fill={INK} opacity="0.5" />
      </g>
    ),
    behind: () => (
      <g>
        <O d="M22 44 L29 44 L29 56 L22 56 Q20 56 20 54 L20 46 Q20 44 22 44 Z" fill="#8D9BB3" />
        <O d="M78 44 L71 44 L71 56 L78 56 Q80 56 80 54 L80 46 Q80 44 78 44 Z" fill="#8D9BB3" />
      </g>
    ),
    top: () => (
      <g>
        <L d="M50 23 L50 12" w={DETAIL + 0.4} />
        <circle cx="50" cy="10" r="3.6" fill={BRAND.lime} stroke={INK} strokeWidth={DETAIL} className="av-glow" />
        <circle cx="49" cy="9" r="1.1" fill={WHITE} />
      </g>
    ),
  },
  alienHead: {
    hairScale: 1.18,
    d: 'M22 40 Q22 17 50 17 Q78 17 78 40 Q78 55 64 64 Q57 71 50 71 Q43 71 36 64 Q22 55 22 40 Z',
    earX: null,
    costume: '#9CF26E',
    noBlush: true,
    inner: () => (
      <g fill="#7AD24E">
        <circle cx="34" cy="30" r="2.4" />
        <circle cx="64" cy="27" r="1.8" />
        <circle cx="68" cy="36" r="1.2" />
        <ellipse cx="38" cy="24" rx="5" ry="2.4" fill={WHITE} opacity="0.45" transform="rotate(-20 38 24)" />
      </g>
    ),
    top: () => (
      <g>
        <L d="M40 19 Q36 11 31 9" w={DETAIL + 0.3} />
        <L d="M60 19 Q64 11 69 9" w={DETAIL + 0.3} />
        <g className="av-glow">
          <circle cx="30" cy="8.5" r="2.8" fill={BRAND.pink} stroke={INK} strokeWidth={DETAIL} />
          <circle cx="70" cy="8.5" r="2.8" fill={BRAND.pink} stroke={INK} strokeWidth={DETAIL} />
        </g>
        <Sparkle x={76} y={20} r={2.2} fill={BRAND.lime} cls="av-tw" />
      </g>
    ),
  },
  ghostFace: {
    hairScale: 1.04,
    d: 'M26 46 Q26 20 50 20 Q74 20 74 46 L74 80 Q70 76 66 80 Q62 84 58 80 Q54 76 50 80 Q46 84 42 80 Q38 76 34 80 Q30 84 26 80 Z',
    earX: null,
    costume: '#F4F6FF',
    noBlush: true,
    behind: () => <circle cx="50" cy="50" r="33" fill={BRAND.cyan} opacity="0.22" className="av-glow" />,
    inner: () => (
      <g>
        <path d="M60 24 Q72 30 72 50 L72 78" fill="none" stroke="#C9D2F2" strokeWidth="5" opacity="0.8" />
        <ellipse cx="38" cy="30" rx="5" ry="2.6" fill={WHITE} transform="rotate(-25 38 30)" />
        <circle cx="36" cy="60" r="3" fill="#C8B8FF" opacity="0.6" />
        <circle cx="64" cy="60" r="3" fill="#C8B8FF" opacity="0.6" />
      </g>
    ),
  },
  // ── legendary ──
  dragonHead: {
    d: 'M27 42 Q27 20 50 20 Q73 20 73 42 L73 55 Q73 72 55 72 L45 72 Q27 72 27 55 Z',
    earX: null,
    costume: '#E8413C',
    noBlush: true,
    ownNose: true,
    behind: () => (
      <g>
        <circle cx="50" cy="46" r="34" fill="#FF6A1F" opacity="0.3" className="av-glow" />
        <O d="M28 40 L14 32 L18 44 L10 48 L27 54 Z" fill="#FFB020" />
        <O d="M72 40 L86 32 L82 44 L90 48 L73 54 Z" fill="#FFB020" />
      </g>
    ),
    inner: () => (
      <g>
        <path d="M36 62 Q50 76 64 62 L64 74 L36 74 Z" fill="#FFB347" />
        <g fill="#C2261F" opacity="0.8">
          <path d="M44 24 Q47 28 50 24 Q53 28 56 24 L56 27 Q53 31 50 27 Q47 31 44 27 Z" />
          <path d="M33 32 Q35 35 37 32 L37 34 Q35 37 33 34 Z" />
          <path d="M63 32 Q65 35 67 32 L67 34 Q65 37 63 34 Z" />
        </g>
        <ellipse cx="46" cy="58" rx="1.3" ry="0.9" fill={INK} />
        <ellipse cx="54" cy="58" rx="1.3" ry="0.9" fill={INK} />
        <ellipse cx="38" cy="28" rx="5" ry="2.2" fill={WHITE} opacity="0.4" transform="rotate(-25 38 28)" />
      </g>
    ),
    top: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-dhorn`} />
        <O d="M34 26 Q28 12 34 4 Q36 14 42 22 Z" fill={`url(#${ctx.uid}-dhorn)`} />
        <O d="M66 26 Q72 12 66 4 Q64 14 58 22 Z" fill={`url(#${ctx.uid}-dhorn)`} />
        <path d="M33 22 Q31 14 33.5 8" fill="none" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M64.5 20 Q68 14 66.5 8" fill="none" stroke={BRAND.goldDeep} strokeWidth="1.2" strokeLinecap="round" />
        <O d="M44 21 L47 14 L50 20 L53 14 L56 21 Z" fill="#FF8A2A" sw={DETAIL} />
        <Sparkle x={36} y={8} r={2.4} fill={BRAND.goldLight} cls="av-tw" />
        <Sparkle x={70} y={10} r={1.8} cls="av-tw" delay={0.9} />
      </g>
    ),
  },
};

export function headFor(base: string): HeadDef {
  return HEADS[base] ?? HEADS.square;
}

/** Ears (behind the head). */
export function Ears({ ctx, head }: { ctx: ArtCtx; head: HeadDef }) {
  if (head.earX === null) return null;
  const x = head.earX;
  const r = 100 - x;
  const inner = shade(ctx.skin, 0.16);
  return (
    <g>
      <O d={`M${x} 44 A6 6.5 0 1 0 ${x} 57 Z`} fill={ctx.skin} />
      <path d={`M${x} 47.5 A3 3.3 0 1 0 ${x} 54`} fill={inner} />
      <O d={`M${r} 44 A6 6.5 0 1 1 ${r} 57 Z`} fill={ctx.skin} />
      <path d={`M${r} 47.5 A3 3.3 0 1 1 ${r} 54`} fill={inner} />
    </g>
  );
}

/** Neck column between head and collar. */
export function Neck({ ctx }: { ctx: ArtCtx }) {
  return (
    <g>
      <O d="M43 62 L43 80 L57 80 L57 62 Z" fill={ctx.skin} />
      <path d="M43.9 66 Q50 71 56.1 66 L56.1 72 Q50 75 43.9 72 Z" fill={ctx.skinShade} />
    </g>
  );
}

/** The head mass with cel shade + optional inner art. */
export function HeadShape({ ctx, head }: { ctx: ArtCtx; head: HeadDef }) {
  return (
    <Shaded ctx={ctx} name="head" d={head.d} fill={ctx.skin} dx={2.6} dy={2.8}>
      <ellipse cx="37" cy="30" rx="5.5" ry="2.6" fill={tint(ctx.skin, 0.55)} opacity="0.5" transform="rotate(-22 37 30)" />
      {head.inner?.(ctx)}
    </Shaded>
  );
}
