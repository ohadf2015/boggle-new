/**
 * Eyes — the most expressive layer, so every style reads at 32px: big white
 * sclera, one bold iris, one hard highlight. Common eyes are flat; rare+ live
 * in eyesPremium.tsx.
 */
import type { ReactNode } from 'react';
import { DETAIL, INK, L, O, WHITE, shade, type ArtCtx } from './kit';

export interface EyeDef {
  render: (ctx: ArtCtx) => ReactNode;
  /** open eyes that should blink when idle */
  blink: boolean;
  /** drawn above hair + hats' underside (forehead gems that bangs must not hide) */
  over?: (ctx: ArtCtx) => ReactNode;
}

export const EYE_L = 40;
export const EYE_R = 60;
export const EYE_Y = 49;
const LINE_EYE = 2.3;

/** One open eye. `lid` = fraction of the eye hidden under an upper lid (0..0.8). */
export function OpenEye({
  ctx, cx, cy = EYE_Y, rx = 5.4, ry = 6, iris = 3.6, look = [0.4, 0.8], lid = 0, lidTilt = 0, lash = false,
}: {
  ctx: ArtCtx; cx: number; cy?: number; rx?: number; ry?: number; iris?: number;
  look?: [number, number]; lid?: number; lidTilt?: number; lash?: boolean;
}) {
  const ix = cx + look[0];
  const iy = cy + look[1];
  const id = `${ctx.uid}-eye${cx}`;
  const top = cy - ry;
  const lidY = top + ry * 2 * lid;
  const outer = cx < 50 ? -1 : 1;
  return (
    <g>
      <clipPath id={id}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={WHITE} />
      <g clipPath={`url(#${id})`}>
        <circle cx={ix} cy={iy} r={iris} fill={ctx.eye} />
        <circle cx={ix} cy={iy} r={iris * 0.56} fill={INK} />
        <circle cx={ix - iris * 0.34} cy={iy - iris * 0.38} r={iris * 0.32} fill={WHITE} />
        {lid > 0 && (
          <path
            d={`M${cx - rx - 1} ${top - 1} L${cx + rx + 1} ${top - 1} L${cx + rx + 1} ${lidY + lidTilt * outer} L${cx - rx - 1} ${lidY - lidTilt * outer} Z`}
            fill={ctx.skin}
          />
        )}
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={DETAIL + 0.2} />
      {lid > 0 && (
        <L d={`M${cx - rx - 0.6} ${lidY - lidTilt * outer} L${cx + rx + 0.6} ${lidY + lidTilt * outer}`} w={DETAIL + 0.5} />
      )}
      {lash && (
        <L d={`M${cx + outer * (rx - 1)} ${top + 1.6} L${cx + outer * (rx + 2)} ${top - 0.6} M${cx + outer * (rx - 3)} ${top + 0.2} L${cx + outer * (rx - 0.6)} ${top - 2.4}`} w={DETAIL + 0.2} />
      )}
    </g>
  );
}

function Pair(ctx: ArtCtx, props: Omit<Parameters<typeof OpenEye>[0], 'ctx' | 'cx'>) {
  return (
    <g>
      <OpenEye ctx={ctx} cx={EYE_L} {...props} />
      <OpenEye ctx={ctx} cx={EYE_R} {...props} />
    </g>
  );
}

function Heart({ cx, cy, s, fill }: { cx: number; cy: number; s: number; fill: string }) {
  const d = `M${cx} ${cy + s * 0.9} C${cx - s * 1.5} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.2} ${cx} ${cy - s * 0.45} C${cx + s * 0.9} ${cy - s * 1.2} ${cx + s * 1.5} ${cy - s * 0.1} ${cx} ${cy + s * 0.9} Z`;
  return <O d={d} fill={fill} sw={DETAIL + 0.1} />;
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.48;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return <O d={`M${pts.join(' L')} Z`} fill={fill} sw={DETAIL} />;
}

export { Heart as EyeHeart, Star as EyeStar };

const arc = (cx: number, up: boolean, w = 5, h = 3.4, y = EYE_Y) =>
  up
    ? `M${cx - w} ${y + 1} Q${cx} ${y - h * 1.6} ${cx + w} ${y + 1}`
    : `M${cx - w} ${y - 1} Q${cx} ${y + h * 1.4} ${cx + w} ${y - 1}`;

export const EYES_FREE: Record<string, EyeDef> = {
  round: { blink: true, render: ctx => Pair(ctx, {}) },
  sparkle: {
    blink: true,
    render: ctx => (
      <g>
        {Pair(ctx, { rx: 6, ry: 6.8, iris: 4.6, look: [0.2, 0.6] })}
        <circle cx={EYE_L + 2} cy={EYE_Y + 2.6} r="1" fill={WHITE} />
        <circle cx={EYE_R + 2} cy={EYE_Y + 2.6} r="1" fill={WHITE} />
      </g>
    ),
  },
  cool: { blink: true, render: ctx => Pair(ctx, { lid: 0.42, look: [1.4, 1.2], iris: 3.4 }) },
  sleepy: { blink: false, render: ctx => Pair(ctx, { lid: 0.62, lidTilt: -0.6, look: [0, 1.4] }) },
  angry: { blink: true, render: ctx => Pair(ctx, { lid: 0.34, lidTilt: -2.2, look: [0, 1] }) },
  sad: {
    blink: true,
    render: ctx => (
      <g>
        {Pair(ctx, { lid: 0.3, lidTilt: 1.8, look: [0, 1.2], iris: 3.9 })}
        <O d={`M${EYE_R + 4} ${EYE_Y + 5} Q${EYE_R + 6} ${EYE_Y + 9} ${EYE_R + 4} ${EYE_Y + 10} Q${EYE_R + 2} ${EYE_Y + 9} ${EYE_R + 4} ${EYE_Y + 5} Z`} fill="#7FDBFF" sw={1} />
      </g>
    ),
  },
  wide: { blink: true, render: ctx => Pair(ctx, { rx: 6.2, ry: 7.2, iris: 2.7, look: [0, 0] }) },
  curious: {
    blink: true,
    render: ctx => (
      <g>
        <OpenEye ctx={ctx} cx={EYE_L} lid={0.3} look={[1.3, -0.6]} />
        <OpenEye ctx={ctx} cx={EYE_R} rx={6.2} ry={7} look={[1.3, -0.8]} />
      </g>
    ),
  },
  lashes: { blink: true, render: ctx => Pair(ctx, { lash: true, look: [0.3, 0.9] }) },
  wink: {
    blink: false,
    render: ctx => (
      <g>
        <OpenEye ctx={ctx} cx={EYE_L} />
        <L d={`M${EYE_R - 5} ${EYE_Y} L${EYE_R + 4} ${EYE_Y - 3} M${EYE_R - 5} ${EYE_Y} L${EYE_R + 4} ${EYE_Y + 3}`} w={LINE_EYE} />
      </g>
    ),
  },
  happy: {
    blink: false,
    render: () => (
      <g>
        <L d={arc(EYE_L, true)} w={LINE_EYE} />
        <L d={arc(EYE_R, true)} w={LINE_EYE} />
      </g>
    ),
  },
  closed: {
    blink: false,
    render: () => (
      <g>
        <L d={arc(EYE_L, false, 4.8, 2.6, EYE_Y + 1)} w={LINE_EYE} />
        <L d={arc(EYE_R, false, 4.8, 2.6, EYE_Y + 1)} w={LINE_EYE} />
      </g>
    ),
  },
  dizzy: {
    blink: false,
    render: () => {
      const spiral = (cx: number) =>
        `M${cx} ${EYE_Y} m-0.6 0 a0.9 0.9 0 1 1 1.8 0 a2 2 0 1 1 -3.8 0 a3.1 3.1 0 1 1 6.2 0 a4.2 4.2 0 1 1 -8.4 0`;
      return (
        <g>
          <circle cx={EYE_L} cy={EYE_Y} r="5.8" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
          <circle cx={EYE_R} cy={EYE_Y} r="5.8" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
          <L d={spiral(EYE_L)} w={1.2} />
          <L d={spiral(EYE_R)} w={1.2} />
        </g>
      );
    },
  },
  hearts: {
    blink: false,
    render: () => (
      <g>
        <Heart cx={EYE_L} cy={EYE_Y} s={5} fill="#FF3D7F" />
        <Heart cx={EYE_R} cy={EYE_Y} s={5} fill="#FF3D7F" />
        <circle cx={EYE_L - 2.2} cy={EYE_Y - 2} r="1.1" fill={WHITE} />
        <circle cx={EYE_R - 2.2} cy={EYE_Y - 2} r="1.1" fill={WHITE} />
      </g>
    ),
  },
  star: {
    blink: false,
    render: () => (
      <g>
        <Star cx={EYE_L} cy={EYE_Y} r={6.4} fill="#FFD23F" />
        <Star cx={EYE_R} cy={EYE_Y} r={6.4} fill="#FFD23F" />
        <circle cx={EYE_L - 1.4} cy={EYE_Y - 1.6} r="1" fill={WHITE} />
        <circle cx={EYE_R - 1.4} cy={EYE_Y - 1.6} r="1" fill={WHITE} />
      </g>
    ),
  },
};


/** Shared dark-lash stroke for tinted eye parts. */
export function lashColor(ctx: ArtCtx): string {
  return shade(ctx.eye, 0.5);
}
