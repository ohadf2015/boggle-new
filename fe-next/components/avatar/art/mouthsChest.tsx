/**
 * 2026-11 chest drop — mouths. These parts come out of reward chests
 * (lib/avatar/chestDrops.ts); same kit, same outline and light rules as the
 * rest of the art (see kit.tsx header). Centred at (50, 61.5) and kept inside
 * x 40–60 / y 57–68 so they fit every head shape.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, Grad, INK, L, Sparkle, WHITE, type ArtCtx } from './kit';

type Part = (ctx: ArtCtx) => ReactNode;

// Same palette as mouths.tsx (its helpers are module-private).
const TONGUE = '#FF6F8E';
const TONGUE_LINE = '#D94A6C';
const MOUTH_DARK = '#5B1830';
const TOOTH_SHADE = '#DCE3EE';

/** The house open "D" mouth outline (same curve as mouths.tsx OpenMouth). */
function dPath(w: number, h: number, top = 59.5, lift = 1.5): string {
  return `M${50 - w} ${top} Q50 ${top + lift} ${50 + w} ${top} Q${50 + w * 0.9} ${top + h} 50 ${top + h} Q${50 - w * 0.9} ${top + h} ${50 - w} ${top} Z`;
}

/** Fill `d` with `fill`, clip `children` to it, outline on top. */
function Hole({ id, d, fill, children, sw = DETAIL + 0.3 }: { id: string; d: string; fill: string; children?: ReactNode; sw?: number }) {
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={fill} />
      <g clipPath={`url(#${id})`}>{children}</g>
      <path d={d} fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
}

const RAINBOW = ['#FF5C8A', '#FF9A2E', '#FFE14D', '#5FE07A', '#3FC8FF', '#9B6BFF'];

/** One emerald-cut diamond tooth: outer stone, bright table facet, corner facets. */
function GemTooth({ x, y, fill }: { x: number; y: number; fill: string }) {
  const w = 1.4;
  const h = 3.3;
  const ix = 0.6;
  const iy = 0.75;
  return (
    <g>
      <rect x={x - w} y={y} width={w * 2} height={h} rx="0.35" fill={fill} stroke={INK} strokeWidth="0.5" />
      <rect x={x - w + ix} y={y + iy} width={(w - ix) * 2} height={h - iy * 2} fill="#E9FDFF" stroke="#1A8FB8" strokeWidth="0.3" />
      <path
        d={`M${x - w} ${y} L${x - w + ix} ${y + iy} M${x + w} ${y} L${x + w - ix} ${y + iy} M${x - w} ${y + h} L${x - w + ix} ${y + h - iy} M${x + w} ${y + h} L${x + w - ix} ${y + h - iy}`}
        fill="none"
        stroke="#1A8FB8"
        strokeWidth="0.3"
      />
      <path d={`M${x - w + ix + 0.15} ${y + iy + 0.2} L${x - 0.1} ${y + iy + 0.2}`} stroke={WHITE} strokeWidth="0.45" strokeLinecap="round" />
    </g>
  );
}

export const MOUTHS_CHEST: Record<string, Part> = {
  // ── rare ──
  /** Big happy open mouth, rainbow-striped tongue lolling over the lip. */
  rainbowTongue: ctx => {
    const mouth = dPath(8, 6.4);
    const tongue = 'M45.2 62.8 Q50 61.2 54.8 62.8 Q56 66.2 54.4 67.8 Q50 69.4 45.6 67.8 Q44 66.2 45.2 62.8 Z';
    return (
      <g>
        <Hole id={`${ctx.uid}-rtm`} d={mouth} fill={MOUTH_DARK}>
          <rect x="42" y="58" width="16" height="3.3" fill={WHITE} />
        </Hole>
        <Hole id={`${ctx.uid}-rtt`} d={tongue} fill={RAINBOW[0]} sw={DETAIL}>
          {RAINBOW.slice(1).map((c, i) => (
            <circle key={c} cx="50" cy="70.6" r={7.2 - i * 1.25} fill={c} />
          ))}
          <ellipse cx="47.2" cy="63.8" rx="1.3" ry="0.6" fill={WHITE} opacity="0.8" />
        </Hole>
        <L d="M50 63 L50 66" w={0.6} c={INK} opacity={0.4} />
      </g>
    );
  },

  /** Cheeky lopsided smile, tongue tip poking out of one corner ("blep"). */
  tongueOut: ctx => (
    <g>
      <g transform="rotate(-24 53.4 62)">
        <Hole id={`${ctx.uid}-blep`} d="M51 61.4 L56 61.4 L56 64.4 Q53.5 68.4 51 64.4 Z" fill={TONGUE} sw={DETAIL}>
          <L d="M53.5 62 L53.5 64.8" w={0.7} c={TONGUE_LINE} />
          <ellipse cx="52.3" cy="63.1" rx="0.7" ry="0.45" fill={WHITE} opacity="0.8" />
        </Hole>
      </g>
      <L d="M43.6 61.2 Q49 64.6 56.8 59" w={2.1} />
      <L d="M42.8 60.2 Q43.2 61.4 44.4 61.8" w={1.1} />
    </g>
  ),

  /** "Eek!" — wide clenched-teeth grimace, corners pulled down, tension ticks at the corners. */
  grimace: ctx => {
    const d = 'M42.2 61.4 Q42.6 59 45 59.2 Q50 59.8 55 59.2 Q57.4 59 57.8 61.4 Q58 64.4 56.6 65 Q50 63.8 43.4 65 Q42 64.4 42.2 61.4 Z';
    return (
      <g>
        <Hole id={`${ctx.uid}-grm`} d={d} fill={WHITE}>
          <rect x="42" y="62.2" width="16" height="3" fill={TOOTH_SHADE} />
          <path d="M42 62.1 Q50 62.6 58 62.1" fill="none" stroke={INK} strokeWidth="0.9" />
          <g stroke={INK} strokeWidth="0.6">
            <path d="M45.4 59 L45.4 65 M48.1 59 L48.1 65 M50.8 59 L50.8 65 M53.5 59 L53.5 65 M56 59 L56 65" />
          </g>
        </Hole>
        <L d="M41.2 60.2 Q40.6 61.6 41.2 63" w={1.1} />
        <L d="M58.8 60.2 Q59.4 61.6 58.8 63" w={1.1} />
      </g>
    );
  },

  /** Serene closed smile with tiny dimples — calm, content, eyes-closed energy. */
  zen: ctx => (
    <g>
      <path d="M45 62.4 Q50 66.6 55 62.4 Q50 64.4 45 62.4 Z" fill={ctx.skinShade} opacity="0.7" />
      <L d="M44.2 60.8 Q50 65 55.8 60.8" w={2.2} />
      <L d="M43.1 60 Q42.6 60.8 43.2 61.6" w={1} />
      <L d="M56.9 60 Q57.4 60.8 56.8 61.6" w={1} />
    </g>
  ),

  // ── epic ──
  /** Smile showing a row of faceted diamond teeth, cyan-white ice, twinkling. */
  diamond: ctx => {
    const gid = `${ctx.uid}-dia`;
    const xs = [44.2, 47.1, 50, 52.9, 55.8];
    return (
      <g>
        <defs>
          <Grad id={gid} from="#FFFFFF" mid="#AEF6FF" to="#34CDEB" />
        </defs>
        <Hole id={`${ctx.uid}-diam`} d={dPath(8, 6.4)} fill={MOUTH_DARK}>
          <ellipse cx="50" cy="66" rx="4.6" ry="2.6" fill={TONGUE} />
          {xs.map((x, i) => (
            <GemTooth key={x} x={x} y={58.4 + (i === 2 ? 0.9 : i % 4 === 0 ? 0.3 : 0.7)} fill={`url(#${gid})`} />
          ))}
        </Hole>
        <Sparkle x={57.8} y={57.4} r={2.1} fill="#E6FDFF" cls="av-tw" />
        <Sparkle x={43.4} y={56.8} r={1.1} fill="#E6FDFF" cls="av-tw" delay={0.9} />
      </g>
    );
  },

  /** Huge joyful belly laugh: wide-open glossy mouth, upturned corners, laugh lines. */
  openLaugh: ctx => {
    const gid = `${ctx.uid}-lgh`;
    const tid = `${ctx.uid}-lght`;
    const d = 'M40.8 58.2 Q50 61.2 59.2 58.2 Q59.4 67.6 50 67.8 Q40.6 67.6 40.8 58.2 Z';
    return (
      <g>
        <defs>
          <Grad id={gid} from="#7A2440" to="#3C0E20" />
          <Grad id={tid} from="#FF9DB4" to="#F2557C" />
        </defs>
        <Hole id={`${ctx.uid}-lghm`} d={d} fill={`url(#${gid})`}>
          <path d="M40 57.4 Q50 60.6 60 57.4 L60 61.6 Q50 63.4 40 61.6 Z" fill={WHITE} />
          <path d="M40 61.6 Q50 63.4 60 61.6" fill="none" stroke={TOOTH_SHADE} strokeWidth="0.8" />
          <ellipse cx="50" cy="68.2" rx="7" ry="4" fill={`url(#${tid})`} stroke={INK} strokeWidth="0.8" />
          <L d="M50 64.6 L50 66.4" w={0.7} c={TONGUE_LINE} />
          <ellipse cx="46.4" cy="65.6" rx="1.6" ry="0.7" fill={WHITE} opacity="0.85" />
        </Hole>
        <L d="M39.6 56.6 Q38.8 58.2 39.6 59.8" w={1.2} />
        <L d="M60.4 56.6 Q61.2 58.2 60.4 59.8" w={1.2} />
        <Sparkle x={59.6} y={64.8} r={1.4} fill={BRAND.goldLight} cls="av-tw" />
      </g>
    );
  },

  /** Determined game face: gritted glossy teeth, one gold tooth with a glint. */
  toothyGrind: ctx => {
    const gid = `${ctx.uid}-grd`;
    const fid = `${ctx.uid}-grdg`;
    const d = 'M42.2 60.2 Q50 57.8 57.8 57.4 Q58.8 60.4 57.6 63.2 Q50 64.4 42.8 65 Q41.6 62.6 42.2 60.2 Z';
    return (
      <g>
        <defs>
          <Grad id={gid} from="#FFFFFF" to="#D3DCEA" />
          <Grad id={fid} from={BRAND.gold} to={BRAND.goldDeep} />
        </defs>
        <Hole id={`${ctx.uid}-grdm`} d={d} fill={`url(#${gid})`}>
          <path d="M43.6 60.9 Q45.6 60.1 47.4 59.8" fill="none" stroke={WHITE} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M51.4 56.5 L54.6 56.5 L54.6 60.9 L51.4 61.2 Z" fill={`url(#${fid})`} />
          <path d="M52 59.4 L53 59.2" fill="none" stroke={WHITE} strokeWidth="0.7" strokeLinecap="round" />
          <path d="M42 62.6 Q50 61.2 58 60.6" fill="none" stroke={INK} strokeWidth="1" />
          <g stroke={INK} strokeWidth="0.6">
            <path d="M45.2 58 L45.2 66 M48.3 58 L48.3 66 M51.4 58 L51.4 66 M54.6 58 L54.6 66" />
          </g>
        </Hole>
        <L d="M41 59.2 L42.2 60.6" w={1.1} />
        <L d="M58.8 56.4 L58.1 57.8" w={1.1} />
        <Sparkle x={55.6} y={57} r={1.6} fill={BRAND.goldLight} cls="av-tw" />
      </g>
    );
  },
};
