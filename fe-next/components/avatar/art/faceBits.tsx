/**
 * Small face features: eyebrows and noses. Brows carry half the emotion, so
 * each style has a clear angle; they take a darkened hair color.
 */
import type { ReactNode } from 'react';
import { DETAIL, INK, L, O, WHITE, shade, type ArtCtx } from './kit';

type Part = (ctx: ArtCtx) => ReactNode;

/** Left brow path (x 34–46); mirrored for the right. */
function pair(ctx: ArtCtx, left: string, w: number, extra?: ReactNode): ReactNode {
  return (
    <g>
      <L d={left} w={w + 1.4} c={INK} />
      <L d={left} w={w} c={ctx.brow} />
      <g transform="translate(100 0) scale(-1 1)">
        <L d={left} w={w + 1.4} c={INK} />
        <L d={left} w={w} c={ctx.brow} />
      </g>
      {extra}
    </g>
  );
}

export const BROWS: Record<string, Part> = {
  none: () => null,
  natural: ctx => pair(ctx, 'M34.5 41 Q39 38.4 45 40', 1.9),
  thin: ctx => pair(ctx, 'M35 40.6 Q39.5 38.8 45 40', 1),
  thick: ctx => pair(ctx, 'M34 41.2 Q39 37.8 45.5 39.8', 3),
  flat: ctx => pair(ctx, 'M34.5 40 L45.5 40', 2.2),
  raised: ctx => pair(ctx, 'M34.5 38.6 Q39.5 34.6 45 37.4', 2),
  worried: ctx => pair(ctx, 'M34.5 39.2 Q40 40 45.5 36.6', 2),
  angry: ctx => pair(ctx, 'M34.5 37.6 Q40 38.6 45.5 42', 2.2),
  unibrow: ctx => (
    <g>
      <L d="M34 40.6 Q42 37.6 50 40 Q58 37.6 66 40.6" w={4.2} c={INK} />
      <L d="M34 40.6 Q42 37.6 50 40 Q58 37.6 66 40.6" w={2.8} c={ctx.brow} />
    </g>
  ),
  arched: ctx => pair(ctx, 'M34.5 41.4 Q37.5 36 45.5 39.2', 1.8),
  bushy: ctx =>
    pair(
      ctx,
      'M33.5 41.4 Q39 36.8 46 39.6',
      3.8,
      <g stroke={shade(ctx.brow, 0.3)} strokeWidth="0.6" strokeLinecap="round">
        <path d="M36 39.8 L37 38.4 M39 39 L40 37.8 M42 38.8 L43 37.8 M64 39.8 L63 38.4 M61 39 L60 37.8 M58 38.8 L57 37.8" />
      </g>,
    ),
  scarred: ctx =>
    pair(
      ctx,
      'M34.5 41 Q39 38.4 45 40',
      2.4,
      <g>
        <L d="M58.5 35.5 L61.5 44.5" w={2.4} c={WHITE} />
        <L d="M58.5 35.5 L61.5 44.5" w={0.8} c="#E0707A" />
      </g>,
    ),
  angryThick: ctx =>
    pair(
      ctx,
      'M33.5 36.6 Q40 38 46.5 42.2',
      3.6,
      <g>
        <path d="M31 35 L33 33.4 L32.6 36 Z" fill="#FF4D2E" />
        <path d="M69 35 L67 33.4 L67.4 36 Z" fill="#FF4D2E" />
      </g>,
    ),
};

// ── Noses (skin-toned, shaded, centred at 50,55) ──

export const NOSES: Record<string, Part> = {
  none: () => null,
  button: ctx => <path d="M47.6 56 Q50 51.6 52.4 56 Q50 57.8 47.6 56 Z" fill={ctx.skinShade} />,
  round: ctx => (
    <g>
      <circle cx="50" cy="55" r="2.6" fill={ctx.skinShade} />
      <circle cx="49.2" cy="54.2" r="0.8" fill={WHITE} opacity="0.55" />
    </g>
  ),
  pointed: ctx => <path d="M50 50.5 L53 56.4 Q50 57.4 47.8 56.4 Z" fill={ctx.skinShade} />,
  wide: ctx => (
    <g>
      <path d="M45.8 56 Q46.5 52.5 50 52.5 Q53.5 52.5 54.2 56 Q50 58.2 45.8 56 Z" fill={ctx.skinShade} />
      <circle cx="47.8" cy="56" r="0.6" fill={INK} opacity="0.55" />
      <circle cx="52.2" cy="56" r="0.6" fill={INK} opacity="0.55" />
    </g>
  ),
  long: ctx => (
    <g>
      <path d="M49.6 48.5 L52.6 56.6 Q50 58 47.6 56.8 Z" fill={ctx.skinShade} />
      <L d="M50.5 49 L52.6 56.4" w={0.8} c={shade(ctx.skinShade, 0.25)} />
    </g>
  ),
  cat: () => (
    <g>
      <O d="M47.8 54 L52.2 54 L50 56.6 Z" fill="#FF7FB0" sw={DETAIL - 0.3} />
      <L d="M50 56.6 L50 58" w={DETAIL - 0.3} />
    </g>
  ),
  clown: () => (
    <g>
      <circle cx="50" cy="55" r="3.8" fill="#FF2E4D" stroke={INK} strokeWidth={DETAIL} />
      <circle cx="48.8" cy="53.7" r="1.2" fill={WHITE} opacity="0.85" />
    </g>
  ),
};
