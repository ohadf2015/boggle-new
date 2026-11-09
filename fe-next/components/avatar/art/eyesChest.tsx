/**
 * 2026-11 chest drop — eyes. These parts come out of reward chests
 * (lib/avatar/chestDrops.ts); same kit, same outline and light rules as the
 * rest of the art (see kit.tsx header).
 * Rare = one bold idea in flat color; epic = a material (gradient, gloss,
 * glow) + a sparkle; legendary = gold leaf + its own light.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, GoldFoil, INK, L, Mirror, O, Sparkle, WHITE, shade, tint, type ArtCtx } from './kit';
import { EYE_L, EYE_R, EYE_Y, OpenEye, type EyeDef } from './eyes';

const BOTH = [EYE_L, EYE_R] as const;

/** White eye socket with its own clip (children are clipped), optional curved upper lid. */
function Socket({
  ctx, name, cx, cy = EYE_Y, rx = 5.6, ry = 6.2, lid = 0, lidTilt = 0, lidCurve = 0, children,
}: {
  ctx: ArtCtx; name: string; cx: number; cy?: number; rx?: number; ry?: number;
  lid?: number; lidTilt?: number; lidCurve?: number; children?: ReactNode;
}) {
  const id = `${ctx.uid}-${name}${cx}`;
  const top = cy - ry;
  const lidY = top + ry * 2 * lid;
  const o = cx < 50 ? -1 : 1;
  const yl = lidY - lidTilt * o;
  const yr = lidY + lidTilt * o;
  const ctl = lidY + lidCurve * 2;
  return (
    <g>
      <clipPath id={id}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={WHITE} />
      <g clipPath={`url(#${id})`}>
        {children}
        {lid > 0 && (
          <path d={`M${cx - rx - 1} ${top - 1} L${cx + rx + 1} ${top - 1} L${cx + rx + 1} ${yr} Q${cx} ${ctl} ${cx - rx - 1} ${yl} Z`} fill={ctx.skin} />
        )}
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth={DETAIL + 0.2} />
      {lid > 0 && <L d={`M${cx - rx - 0.7} ${yl} Q${cx} ${ctl} ${cx + rx + 0.7} ${yr}`} w={DETAIL + 0.7} />}
    </g>
  );
}

/** Cartoon "$" glyph centred at (x, y), s = half height. */
const dollar = (x: number, y: number, s: number) => {
  const k = s / 3;
  return `M${x + 1.8 * k} ${y - 2 * k} C${x + 1.2 * k} ${y - 3 * k} ${x - 1.9 * k} ${y - 3 * k} ${x - 1.9 * k} ${y - 1.3 * k} C${x - 1.9 * k} ${y + 0.2 * k} ${x + 1.9 * k} ${y - 0.2 * k} ${x + 1.9 * k} ${y + 1.3 * k} C${x + 1.9 * k} ${y + 3 * k} ${x - 1.2 * k} ${y + 3 * k} ${x - 1.8 * k} ${y + 2 * k} M${x} ${y - 3.9 * k} L${x} ${y + 3.9 * k}`;
};

/** 8-bit eye: one char per cell. X ink, W white, I iris, P pupil. */
const PIXEL_EYE = ['.XXXXX.', 'XWWWWWX', 'XWIIIWX', 'XWIPIWX', 'XWIIIWX', 'XWWWWWX', '.XXXXX.'];

function PixelEye({ ctx, cx }: { ctx: ArtCtx; cx: number }) {
  const c = 1.86;
  const x0 = cx - c * 3.5;
  const y0 = EYE_Y - c * 3.5;
  const color: Record<string, string> = { X: INK, W: WHITE, I: ctx.eye, P: INK };
  const cells: ReactNode[] = [];
  PIXEL_EYE.forEach((row, r) => [...row].forEach((ch, k) => {
    if (ch === '.') return;
    cells.push(<rect key={`${r}-${k}`} x={x0 + k * c} y={y0 + r * c} width={c + 0.05} height={c + 0.05} fill={color[ch]} />);
  }));
  return (
    <g shapeRendering="crispEdges">
      {cells}
      <rect x={x0 + 4 * c} y={y0 + 4 * c} width={c} height={c} fill={shade(ctx.eye, 0.3)} />
      <rect x={x0 + 3 * c} y={y0 + 3 * c} width={c * 0.5} height={c * 0.5} fill={WHITE} />
      <rect x={x0 + 2 * c} y={y0 + 2 * c} width={c * 0.5} height={c * 0.5} fill={tint(ctx.eye, 0.5)} />
    </g>
  );
}

function GlitchEye({ ctx, cx }: { ctx: ArtCtx; cx: number }) {
  return (
    <Socket ctx={ctx} name="gl" cx={cx}>
      <rect x={cx - 2.6} y={EYE_Y - 2} width="5.6" height="5.6" rx="0.6" fill={ctx.eye} />
      <rect x={cx - 1} y={EYE_Y - 0.4} width="2.6" height="2.6" fill={INK} />
      <rect x={cx - 2.2} y={EYE_Y - 1.6} width="1.5" height="1.5" fill={WHITE} />
      {[44.4, 46.6, 48.8, 51, 53.2].map(y => <rect key={y} x={cx - 7} y={y} width="14" height="0.55" fill={INK} opacity="0.16" />)}
    </Socket>
  );
}

/** Spiky burst polygon (alternating long/short rays). */
function burst(cx: number, cy: number, n: number, long: number[], short: number, rot = -90) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (180 / n) * i) * Math.PI) / 180;
    const r = i % 2 === 0 ? long[(i / 2) % long.length] : short;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** Emerald-cut (step-cut) gem filling an eye. */
function StepGem({ cx, id, light, mid, deep }: { cx: number; id: string; light: string; mid: string; deep: string }) {
  const y = EYE_Y;
  const [w, h, c] = [6.4, 6, 2.2];
  const [tw, th, tc] = [3.4, 3, 1.1];
  const oct = (a: number, b: number, k: number) =>
    `M${cx - a + k} ${y - b} L${cx + a - k} ${y - b} L${cx + a} ${y - b + k} L${cx + a} ${y + b - k} L${cx + a - k} ${y + b} L${cx - a + k} ${y + b} L${cx - a} ${y + b - k} L${cx - a} ${y - b + k} Z`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
      </defs>
      <ellipse cx={cx} cy={y} rx="8" ry="7.4" fill={mid} opacity="0.28" className="av-glow" />
      <O d={oct(w, h, c)} fill={deep} sw={DETAIL + 0.3} />
      <path d={`M${cx - w + c} ${y - h} L${cx + w - c} ${y - h} L${cx + w} ${y - h + c} L${cx + tw} ${y - th + tc} L${cx + tw - tc} ${y - th} L${cx - tw + tc} ${y - th} L${cx - tw} ${y - th + tc} L${cx - w} ${y - h + c} Z`} fill={light} />
      <path d={`M${cx - w} ${y - h + c} L${cx - tw} ${y - th + tc} L${cx - tw} ${y + th - tc} L${cx - w} ${y + h - c} Z`} fill={mid} />
      <path d={oct(tw, th, tc)} fill={`url(#${id})`} stroke={INK} strokeWidth="0.6" strokeLinejoin="round" />
      <path d={`M${cx - w + c} ${y - h} L${cx - tw + tc} ${y - th} M${cx + w - c} ${y - h} L${cx + tw - tc} ${y - th} M${cx + w} ${y + h - c} L${cx + tw} ${y + th - tc} M${cx - w + c} ${y + h} L${cx - tw + tc} ${y + th} M${cx + w - c} ${y + h} L${cx + tw - tc} ${y + th} M${cx - w} ${y + h - c} L${cx - tw} ${y + th - tc}`} stroke={INK} strokeWidth="0.5" opacity="0.6" />
      <O d={oct(w, h, c)} fill="none" sw={DETAIL + 0.3} />
      <path d={`M${cx - 2.6} ${y - 1.4} L${cx - 1.2} ${y - 2.4}`} stroke={WHITE} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx={cx + 0.8} cy={y + 0.7} r="1.3" fill={INK} opacity="0.85" />
    </g>
  );
}

export const EYES_CHEST: Record<string, EyeDef> = {
  // ── rare ──
  money: {
    blink: true,
    render: ctx => (
      <g>
        {BOTH.map(cx => (
          <Socket key={cx} ctx={ctx} name="mo" cx={cx} rx={6} ry={6.6}>
            <circle cx={cx + 0.3} cy={EYE_Y + 0.6} r="4.9" fill="#2FCB63" />
            <circle cx={cx + 0.3} cy={EYE_Y + 0.6} r="4.9" fill="none" stroke="#178A3E" strokeWidth="0.9" />
            <path d={dollar(cx + 0.3, EYE_Y + 0.6, 3.6)} fill="none" stroke={INK} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={cx - 2.3} cy={EYE_Y - 2} r="1" fill={WHITE} />
          </Socket>
        ))}
        <Sparkle x={EYE_R + 6.6} y={EYE_Y - 6.4} r={2} fill="#B6FFC9" cls="av-tw" />
      </g>
    ),
  },
  alien: {
    blink: true,
    render: () => {
      const almond = (cx: number) =>
        `M${cx - 7.6} ${EYE_Y - 0.6} C${cx - 6.6} ${EYE_Y - 6} ${cx + 4} ${EYE_Y - 5.2} ${cx + 5.6} ${EYE_Y + 0.6} C${cx + 6.2} ${EYE_Y + 4.6} ${cx - 2.4} ${EYE_Y + 5.4} ${cx - 7.6} ${EYE_Y - 0.6} Z`;
      const one = (
        <g transform={`rotate(18 ${EYE_L} ${EYE_Y})`}>
          <O d={almond(EYE_L)} fill="#0B0E22" sw={DETAIL + 0.3} />
          <ellipse cx={EYE_L - 2.6} cy={EYE_Y - 2} rx="2.3" ry="1.3" fill={WHITE} transform={`rotate(-14 ${EYE_L - 2.6} ${EYE_Y - 2})`} />
          <circle cx={EYE_L + 2.6} cy={EYE_Y + 1.4} r="0.85" fill={WHITE} />
          <path d={`M${EYE_L - 4.6} ${EYE_Y + 1.8} Q${EYE_L - 1} ${EYE_Y + 3.6} ${EYE_L + 3} ${EYE_Y + 2.4}`} fill="none" stroke="#3A4580" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      );
      return <g>{one}<Mirror>{one}</Mirror></g>;
    },
  },
  pixelEyes: {
    blink: false,
    render: ctx => <g>{BOTH.map(cx => <PixelEye key={cx} ctx={ctx} cx={cx} />)}</g>,
  },
  targetEyes: {
    blink: true,
    render: ctx => (
      <g>
        {BOTH.map(cx => (
          <g key={cx}>
            <Socket ctx={ctx} name="tg" cx={cx} rx={6} ry={6.4} lid={0.2} lidTilt={-0.6}>
              <circle cx={cx} cy={EYE_Y + 0.4} r="4.7" fill={ctx.eye} stroke={INK} strokeWidth="0.7" />
              <circle cx={cx} cy={EYE_Y + 0.4} r="3.4" fill={WHITE} />
              <circle cx={cx} cy={EYE_Y + 0.4} r="2.2" fill={ctx.eye} />
              <circle cx={cx} cy={EYE_Y + 0.4} r="1" fill={INK} />
              <path d={`M${cx - 6} ${EYE_Y + 0.4} L${cx + 6} ${EYE_Y + 0.4} M${cx} ${EYE_Y - 6} L${cx} ${EYE_Y + 7}`} stroke={INK} strokeWidth="0.55" opacity="0.55" />
              <circle cx={cx} cy={EYE_Y + 0.4} r="1" fill={INK} />
              <circle cx={cx - 1.7} cy={EYE_Y - 1.5} r="0.75" fill={WHITE} />
            </Socket>
          </g>
        ))}
      </g>
    ),
  },
  catEye: {
    blink: true,
    render: ctx => (
      <g>
        {BOTH.map(cx => {
          const o = cx < 50 ? -1 : 1;
          return (
            <g key={cx}>
              <Socket ctx={ctx} name="ct" cx={cx} rx={6} ry={6} lid={0.16} lidTilt={-1.1}>
                <ellipse cx={cx} cy={EYE_Y + 0.6} rx="4.6" ry="5.2" fill={ctx.eye} />
                <ellipse cx={cx} cy={EYE_Y + 0.6} rx="4.6" ry="5.2" fill="none" stroke={shade(ctx.eye, 0.35)} strokeWidth="0.8" />
                <ellipse cx={cx} cy={EYE_Y + 0.8} rx="0.95" ry="4.3" fill={INK} />
                <ellipse cx={cx - 2} cy={EYE_Y - 1.4} rx="0.9" ry="1.3" fill={WHITE} />
              </Socket>
              <L d={`M${cx + o * 5.6} ${EYE_Y - 2.6} Q${cx + o * 8} ${EYE_Y - 3.6} ${cx + o * 9.4} ${EYE_Y - 6.2}`} w={2.3} />
            </g>
          );
        })}
      </g>
    ),
  },
  sleepyEye: {
    blink: true,
    render: ctx => (
      <g>
        {BOTH.map(cx => {
          const o = cx < 50 ? -1 : 1;
          return (
            <g key={cx}>
              <Socket ctx={ctx} name="sl" cx={cx} rx={5.8} ry={5.6} lid={0.5} lidTilt={-0.4} lidCurve={-0.9}>
                <circle cx={cx + 0.6} cy={EYE_Y + 1.4} r="3.9" fill={ctx.eye} />
                <circle cx={cx + 0.6} cy={EYE_Y + 1.4} r="2.1" fill={INK} />
                <circle cx={cx - 0.9} cy={EYE_Y + 0.9} r="0.95" fill={WHITE} />
                <circle cx={cx + 2.2} cy={EYE_Y + 3} r="0.5" fill={WHITE} />
              </Socket>
              <L d={`M${cx + o * 4} ${EYE_Y - 0.9} L${cx + o * 6.4} ${EYE_Y + 1.2} M${cx + o * 5.6} ${EYE_Y - 0.3} L${cx + o * 8.2} ${EYE_Y + 0.6}`} w={DETAIL + 0.3} />
              <L d={`M${cx - 3.6} ${EYE_Y + 6.6} Q${cx} ${EYE_Y + 7.6} ${cx + 3.6} ${EYE_Y + 6.6}`} w={0.9} opacity={0.55} />
            </g>
          );
        })}
      </g>
    ),
  },
  laserEye: {
    blink: false,
    render: ctx => (
      <g>
        {BOTH.map(cx => (
          <g key={cx}>
            <Socket ctx={ctx} name="lz" cx={cx} rx={5.8} ry={6.2}>
              <circle cx={cx} cy={EYE_Y + 0.4} r="6" fill="#FFB547" opacity="0.5" className="av-glow" />
              <circle cx={cx} cy={EYE_Y + 0.4} r="4.4" fill="#FF5A1F" stroke={INK} strokeWidth="0.7" />
              <circle cx={cx} cy={EYE_Y + 0.4} r="2.6" fill="#FFB547" />
              <circle cx={cx} cy={EYE_Y + 0.4} r="1.3" fill="#FFF8D6" />
            </Socket>
            <path d={`M${cx - 7.8} ${EYE_Y + 0.4} L${cx - 1} ${EYE_Y - 0.4} L${cx} ${EYE_Y - 4.4} L${cx + 1} ${EYE_Y - 0.4} L${cx + 7.8} ${EYE_Y + 0.4} L${cx + 1} ${EYE_Y + 1.2} L${cx} ${EYE_Y + 5.2} L${cx - 1} ${EYE_Y + 1.2} Z`} fill="#FFF3B0" stroke={INK} strokeWidth="0.6" strokeLinejoin="round" opacity="0.95" />
            <circle cx={cx} cy={EYE_Y + 0.4} r="1" fill={WHITE} />
          </g>
        ))}
      </g>
    ),
  },
  // ── epic ──
  glitchEyes: {
    blink: false,
    render: ctx => {
      const a = `${ctx.uid}-glA`;
      const b = `${ctx.uid}-glB`;
      const eyes = BOTH.map(cx => <GlitchEye key={cx} ctx={ctx} cx={cx} />);
      return (
        <g>
          <defs>
            <clipPath id={a}>
              <rect x="0" y="0" width="100" height="47.2" />
              <rect x="0" y="49.8" width="100" height="50" />
            </clipPath>
            <clipPath id={b}>
              <rect x="0" y="47.2" width="100" height="2.6" />
            </clipPath>
          </defs>
          {BOTH.map(cx => (
            <g key={cx}>
              <ellipse cx={cx - 1.7} cy={EYE_Y - 0.4} rx="5.6" ry="6.2" fill={BRAND.cyan} opacity="0.9" />
              <ellipse cx={cx + 1.7} cy={EYE_Y + 0.4} rx="5.6" ry="6.2" fill={BRAND.pink} opacity="0.9" />
            </g>
          ))}
          <g clipPath={`url(#${a})`}>{eyes}</g>
          <g clipPath={`url(#${b})`}><g transform="translate(1.8 0)">{eyes}</g></g>
          <g className="av-glow" shapeRendering="crispEdges">
            <rect x="27.6" y="44" width="2" height="2" fill={BRAND.cyan} stroke={INK} strokeWidth="0.5" />
            <rect x="30.2" y="41.4" width="1.2" height="1.2" fill={BRAND.pink} />
            <rect x="70.6" y="52" width="2" height="2" fill={BRAND.pink} stroke={INK} strokeWidth="0.5" />
            <rect x="69" y="55.4" width="1.2" height="1.2" fill={BRAND.cyan} />
          </g>
          <Sparkle x={69.6} y={41.6} r={1.8} fill={BRAND.cyan} cls="av-tw" />
        </g>
      );
    },
  },
  rainbowEyes: {
    blink: true,
    render: ctx => {
      const g = `${ctx.uid}-rb`;
      const bands = [[0.3, INK], [0.44, '#9B6BFF'], [0.57, '#3D8BFF'], [0.69, '#2ED47A'], [0.8, '#FFD23F'], [0.9, '#FF8A1F'], [1, '#FF3D9A']] as const;
      const stops: ReactNode[] = [];
      let prev = 0;
      for (const [end, c] of bands) {
        stops.push(<stop key={`${end}a`} offset={prev} stopColor={c} />, <stop key={`${end}b`} offset={end} stopColor={c} />);
        prev = end;
      }
      return (
        <g>
          <defs>
            <radialGradient id={g} cx="50%" cy="50%" r="50%">{stops}</radialGradient>
          </defs>
          {BOTH.map(cx => (
            <Socket key={cx} ctx={ctx} name="rb" cx={cx} rx={6} ry={6.6}>
              <circle cx={cx + 0.3} cy={EYE_Y + 0.6} r="5.1" fill={`url(#${g})`} />
              <path d={`M${cx - 3.6} ${EYE_Y - 1.4} Q${cx - 2.6} ${EYE_Y - 3.8} ${cx} ${EYE_Y - 4}`} fill="none" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
              <circle cx={cx + 2.4} cy={EYE_Y + 2.8} r="0.7" fill={WHITE} />
            </Socket>
          ))}
          <Sparkle x={EYE_L - 1.4} y={EYE_Y - 0.6} r={1.6} cls="av-tw" />
          <Sparkle x={EYE_R - 1.4} y={EYE_Y - 0.6} r={1.6} cls="av-tw" delay={0.7} />
        </g>
      );
    },
  },
  diamondEye: {
    blink: true,
    render: ctx => {
      const g = `${ctx.uid}-dm`;
      const y = EYE_Y + 0.6;
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor={WHITE} />
              <stop offset="0.5" stopColor="#C9F6FF" />
              <stop offset="1" stopColor="#6FCBF0" />
            </linearGradient>
          </defs>
          {BOTH.map(cx => (
            <Socket key={cx} ctx={ctx} name="dm" cx={cx} rx={6} ry={6.6}>
              <circle cx={cx} cy={y} r="5" fill={ctx.eye} />
              <circle cx={cx} cy={y} r="5" fill="none" stroke={shade(ctx.eye, 0.4)} strokeWidth="0.8" />
              <O d={`M${cx - 1.6} ${y - 2.6} L${cx + 1.6} ${y - 2.6} L${cx + 3.4} ${y - 0.8} L${cx} ${y + 3.6} L${cx - 3.4} ${y - 0.8} Z`} fill={`url(#${g})`} sw={0.9} />
              <path d={`M${cx - 3.4} ${y - 0.8} L${cx + 3.4} ${y - 0.8} M${cx - 1.6} ${y - 2.6} L${cx - 1.2} ${y - 0.8} L${cx} ${y + 3.6} L${cx + 1.2} ${y - 0.8} L${cx + 1.6} ${y - 2.6}`} fill="none" stroke={INK} strokeWidth="0.5" strokeLinejoin="round" opacity="0.7" />
              <path d={`M${cx - 2.4} ${y - 0.8} L${cx - 1.6} ${y - 2.6} L${cx - 1.2} ${y - 0.8} Z`} fill={WHITE} />
            </Socket>
          ))}
          <Sparkle x={EYE_L + 3.6} y={EYE_Y - 3.6} r={1.9} cls="av-tw" />
          <Sparkle x={EYE_R + 3.6} y={EYE_Y - 3.6} r={1.9} cls="av-tw" delay={0.8} />
          <Sparkle x={70.4} y={42} r={1.5} fill="#C9F6FF" cls="av-tw" delay={0.4} />
        </g>
      );
    },
  },
  cyberEye: {
    blink: false,
    render: ctx => {
      const m = `${ctx.uid}-cbm`;
      const lens = `${ctx.uid}-cbl`;
      const cx = EYE_R;
      const ticks: string[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i;
        const r1 = i % 3 === 0 ? 3.6 : 4.3;
        ticks.push(`M${(cx + Math.cos(a) * r1).toFixed(2)} ${(EYE_Y + Math.sin(a) * r1).toFixed(2)} L${(cx + Math.cos(a) * 5.2).toFixed(2)} ${(EYE_Y + Math.sin(a) * 5.2).toFixed(2)}`);
      }
      return (
        <g>
          <defs>
            <linearGradient id={m} x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#E3E8F5" />
              <stop offset="0.55" stopColor="#8A93B2" />
              <stop offset="1" stopColor="#4A5274" />
            </linearGradient>
            <radialGradient id={lens} cx="45%" cy="40%" r="60%">
              <stop offset="0" stopColor="#1E6C8C" />
              <stop offset="0.6" stopColor="#0C2A44" />
              <stop offset="1" stopColor="#050B1C" />
            </radialGradient>
          </defs>
          <OpenEye ctx={ctx} cx={EYE_L} look={[0.6, 0.8]} />
          <circle cx={cx} cy={EYE_Y} r="9.4" fill={BRAND.cyan} opacity="0.3" className="av-glow" />
          <circle cx={cx} cy={EYE_Y} r="8.2" fill={`url(#${m})`} stroke={INK} strokeWidth={DETAIL + 0.6} />
          <circle cx={cx} cy={EYE_Y} r="6" fill={`url(#${lens})`} stroke={INK} strokeWidth={DETAIL} />
          <circle cx={cx} cy={EYE_Y} r="5.2" fill="none" stroke={BRAND.cyan} strokeWidth="0.9" className="av-glow" />
          <path d={ticks.join(' ')} stroke={BRAND.cyan} strokeWidth="0.7" strokeLinecap="round" />
          <circle cx={cx} cy={EYE_Y} r="2.2" fill="none" stroke={BRAND.cyan} strokeWidth="0.7" />
          <circle cx={cx} cy={EYE_Y} r="1.1" fill="#B8FBFF" />
          <path d={`M${cx - 3.6} ${EYE_Y - 2.4} Q${cx - 2.4} ${EYE_Y - 4} ${cx - 0.6} ${EYE_Y - 4.4}`} fill="none" stroke={WHITE} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
          {[[-6.2, -5.2], [6.4, 5]].map(([dx, dy]) => (
            <circle key={dx} cx={cx + dx} cy={EYE_Y + dy} r="0.75" fill="#5B6380" stroke={INK} strokeWidth="0.4" />
          ))}
          <Sparkle x={cx + 7.4} y={EYE_Y - 6.8} r={1.7} fill={BRAND.cyan} cls="av-tw" />
        </g>
      );
    },
  },
  gemEye: {
    blink: false,
    render: ctx => (
      <g>
        <StepGem cx={EYE_L} id={`${ctx.uid}-gmE`} light="#B6FFD2" mid="#1FC36A" deep="#0A6B3A" />
        <StepGem cx={EYE_R} id={`${ctx.uid}-gmS`} light="#B8D4FF" mid="#2F6BFF" deep="#14247A" />
        <Sparkle x={EYE_L - 3.4} y={EYE_Y - 4.4} r={1.9} cls="av-tw" />
        <Sparkle x={EYE_R - 3.4} y={EYE_Y - 4.4} r={1.9} cls="av-tw" delay={0.9} />
      </g>
    ),
  },
  moonEye: {
    blink: true,
    render: ctx => {
      const g = `${ctx.uid}-mn`;
      const y = EYE_Y + 0.6;
      return (
        <g>
          <defs>
            <radialGradient id={g} cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor="#F2F7FF" />
              <stop offset="0.5" stopColor="#9DB4E6" />
              <stop offset="1" stopColor="#4A5C9A" />
            </radialGradient>
          </defs>
          {BOTH.map(cx => (
            <Socket key={cx} ctx={ctx} name="mn" cx={cx} rx={6} ry={6.6}>
              <circle cx={cx} cy={y} r="5.1" fill={`url(#${g})`} stroke={INK} strokeWidth="0.6" />
              <circle cx={cx} cy={y} r="3.1" fill="#16204A" />
              <circle cx={cx} cy={y} r="3.4" fill="#FFF3B8" opacity="0.25" className="av-glow" />
              <path d={`M${cx - 0.2} ${y - 2.3} A2.3 2.3 0 1 0 ${cx + 1.9} ${y + 1.2} A1.9 1.9 0 1 1 ${cx - 0.2} ${y - 2.3} Z`} fill="#FFF3B8" />
              <Sparkle x={cx + 1.4} y={y - 1.2} r={0.75} fill="#FFF3B8" />
              <circle cx={cx - 3} cy={y - 2.6} r="0.8" fill={WHITE} />
            </Socket>
          ))}
          <Sparkle x={70.2} y={41.4} r={1.8} fill="#DCE8FF" cls="av-tw" />
        </g>
      );
    },
  },
  // ── legendary ──
  supernova: {
    blink: false,
    render: ctx => {
      const foil = `${ctx.uid}-snF`;
      const flare = `${ctx.uid}-snR`;
      return (
        <g>
          <GoldFoil id={foil} />
          <defs>
            <radialGradient id={flare} cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={WHITE} />
              <stop offset="0.22" stopColor="#FFF7D6" />
              <stop offset="0.42" stopColor={BRAND.gold} />
              <stop offset="0.62" stopColor={BRAND.pink} />
              <stop offset="0.8" stopColor="#6B3BFF" />
              <stop offset="1" stopColor="#2A1A6B" />
            </radialGradient>
          </defs>
          {BOTH.map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy={EYE_Y} r="9.6" fill={BRAND.gold} opacity="0.32" className="av-glow" />
              <O d={burst(cx, EYE_Y, 10, [10.2], 6.4, -81 + i * 9)} fill={BRAND.pink} sw={DETAIL - 0.3} />
              <O d={burst(cx, EYE_Y, 10, [10, 8.4], 6.9, -90 + i * 9)} fill={`url(#${foil})`} sw={DETAIL} />
              <circle cx={cx} cy={EYE_Y} r="5.2" fill={`url(#${flare})`} stroke={INK} strokeWidth={DETAIL + 0.2} />
              <circle cx={cx} cy={EYE_Y} r="4.4" fill="none" stroke={BRAND.cyan} strokeWidth="0.7" opacity="0.85" />
              <g className="av-pulse">
                <Sparkle x={cx} y={EYE_Y} r={2.4} fill={WHITE} />
              </g>
              <circle cx={cx - 2.3} cy={EYE_Y - 2.1} r="0.7" fill={WHITE} />
            </g>
          ))}
          <Sparkle x={71} y={39} r={2.6} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={29.4} y={57.6} r={2} fill={BRAND.goldLight} cls="av-tw" delay={0.7} />
          <Sparkle x={50} y={43.4} r={1.4} fill={BRAND.cyan} cls="av-tw" delay={1.2} />
          <Sparkle x={28.6} y={40.4} r={1.4} fill={BRAND.pink} cls="av-tw" delay={0.3} />
        </g>
      );
    },
  },
};
