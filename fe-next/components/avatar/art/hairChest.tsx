/**
 * 2026-11 chest drop — hair. These parts come out of reward chests
 * (lib/avatar/chestDrops.ts); same kit, same outline and light rules as the
 * rest of the art (see kit.tsx header).
 *
 * Rare styles are signature silhouettes in the player's hair color; epic
 * styles are made of a material (neon light, ice); the legendary aurora is
 * dyed with the northern lights and finished in gold leaf.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, GoldFoil, INK, L, O, Shaded, Sparkle, WHITE, tint, type ArtCtx } from './kit';
import { HairMass, type HairDef } from './hair';

function Stops({ id, stops, x2 = 0, y2 = 1 }: { id: string; stops: [number, string, number?][]; x2?: number; y2?: number }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
        {stops.map(([o, c, a]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
      </linearGradient>
    </defs>
  );
}

/** A mass filled with a gradient (or any paint) and a fixed shade tone. */
function Painted({ ctx, name, d, paint, shadeColor, children }: { ctx: ArtCtx; name: string; d: string; paint: string; shadeColor: string; children?: ReactNode }) {
  return (
    <Shaded ctx={ctx} name={name} d={d} fill={paint} shadeColor={shadeColor}>
      {children}
    </Shaded>
  );
}

/** An outlined rope stroke (noodle, loose curl). */
function Rope({ d, fill, w = 2.2 }: { d: string; fill: string; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={w + 1.8} />
      <path d={d} stroke={fill} strokeWidth={w} />
    </g>
  );
}

/** A wavy horizontal line from x0 to x1 at y (noodle texture). */
function wave(x0: number, x1: number, y: number, step = 4, amp = 2.2): string {
  let d = `M${x0} ${y} q${step / 2} ${-amp} ${step} 0`;
  for (let x = x0 + step; x < x1; x += step) d += ` t${step} 0`;
  return d;
}

/** Scalloped outline through points (clockwise ⇒ bumps bulge outward). */
function scallop(pts: [number, number][], bump: number): string {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / bump));
    const r = (Math.hypot(bx - ax, by - ay) / n) * 0.62;
    for (let k = 1; k <= n; k++) {
      const x = +(ax + ((bx - ax) * k) / n).toFixed(2);
      const y = +(ay + ((by - ay) * k) / n).toFixed(2);
      d += ` A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x} ${y}`;
    }
  }
  return d;
}

/** Brightest, most saturated version of the hair color (grey/brown → cyan). */
function neonOf(hex: string): string {
  const h = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#808080';
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const max = Math.max(...c);
  const min = Math.min(...c);
  if (max - min < 48) return '#5CF4FF';
  const s = c.map(v => Math.round(((v - min) / (max - min)) * 255));
  return tint(`#${s.map(v => v.toString(16).padStart(2, '0')).join('')}`, 0.22);
}

/** Mirror a list of [dx-from-centre, y] points to one side as path coords. */
function side(pts: [number, number][], s: 1 | -1): [number, number][] {
  return pts.map(([dx, y]) => [+(50 + s * dx).toFixed(2), y]);
}

function poly(pts: [number, number][]): string {
  return `M${pts.map(p => p.join(' ')).join(' L')} Z`;
}

// ── ramen ──
const RAMEN_PILE = 'M30 31 Q24.5 25.5 28.5 20.5 Q27 13 35 12 Q37.5 5.5 45 7 Q50 2 56 6 Q64 5 65.5 12 Q73 13 71.5 20.5 Q75.5 25.5 70 31 Q60 27.5 50 29.5 Q40 27.5 30 31 Z';
const RAMEN_CAP = 'M27 44 Q25 28 31 24 L69 24 Q75 28 73 44 L70.5 44 Q70 34 63 31 Q50 33 37 31 Q30 34 29.5 44 Z';

// ── fade curly ──
const FADE_TOP = `${scallop([[33, 30], [31.5, 9.5], [68.5, 9.5], [67, 30]], 4.6)} Q50 27 33 30 Z`;
const FADE_SIDES = 'M27.5 44 Q26 28 33 24 L67 24 Q74 28 72.5 44 Q71.5 32 64 30.5 L36 30.5 Q28.5 32 27.5 44 Z';

// ── twin tails: one tail as [dx from centre, y], drawn on the left ──
const TAIL: [number, number][] = [
  [17, 13], [28, 10.5], [34, 19], [38.5, 34], [37, 52], [33.5, 70], [37, 84], [33, 98], [27.5, 90], [27, 76], [29, 58], [29.5, 42], [27, 28], [21, 21],
];
function tailPath(s: 1 | -1): string {
  const p = side(TAIL, s).map(q => q.join(' '));
  return `M${p[0]} Q${p[1]} ${p[2]} Q${p[3]} ${p[4]} Q${p[5]} ${p[6]} Q${p[7]} ${p[8]} Q${p[9]} ${p[10]} Q${p[11]} ${p[12]} Q${p[13]} ${p[0]} Z`;
}
function Ribbon({ s }: { s: 1 | -1 }) {
  const P = (pts: [number, number][]) => poly(side(pts, s));
  const [kx, ky] = side([[19, 15.5]], s)[0];
  return (
    <g>
      <O d={P([[19, 16], [12, 26], [14.5, 34], [16, 31], [18.5, 33.5], [21, 17]])} fill={BRAND.cyan} sw={DETAIL} />
      <O d={P([[19, 16], [10.5, 9], [9, 16.5], [12, 21]])} fill={BRAND.cyan} sw={DETAIL} />
      <O d={P([[19, 16], [27.5, 9.5], [29, 17], [25.5, 21]])} fill={BRAND.cyan} sw={DETAIL} />
      <L d={`M${side([[11, 12]], s)[0].join(' ')} L${side([[16, 15]], s)[0].join(' ')}`} w={0.9} c={WHITE} />
      <circle cx={kx} cy={ky} r="2.5" fill="#8FF3FF" stroke={INK} strokeWidth={DETAIL} />
    </g>
  );
}

// ── bob cut ──
const BOB_BACK = 'M23 44 Q22 12 50 12 Q78 12 77 44 L77.5 67.5 L22.5 67.5 Z';
const BOB_FRONT = 'M23.5 67.5 L23.5 42 Q22.5 13 50 13 Q77.5 13 76.5 42 L76.5 67.5 L70.5 67.5 L70.5 38.5 L29.5 38.5 L29.5 67.5 Z';

// ── pompadour ──
const POMP_SIDES = 'M27 44 Q25.5 29 31.5 24 L68.5 24 Q74.5 29 73 44 L70.5 44 Q70 33 63 30 L37 30 Q30 33 29.5 44 Z';
const POMP_ROLL = 'M31 30 Q24.5 22 27 12.5 Q30.5 2 42 1.5 Q57 1 66 7 Q73 12 71 21 Q70.5 26 68.5 30 Q60 26.5 50 27 Q40 26.5 31 30 Z';

// ── slick back ──
const SLICK = 'M28 41 Q25 14.5 50 11.5 Q75 14.5 72 41 Q70 34 66 31.5 Q60.5 29.5 55.5 30.5 Q52.5 31.2 50 34 Q47.5 31.2 44.5 30.5 Q39.5 29.5 34 31.5 Q30 34 28 41 Z';

// ── neon ──
const NEON =
  'M27 44 Q24 33 27.5 26 Q20 23 14 15 Q23 16.5 30 20 Q28 13 30 6.5 Q36 12 40.5 17.5 Q43 10 49 4 Q54 10.5 55.5 17.5 Q60 11 68 6.5 Q68 13 66.5 19.5 Q74 15.5 86 15 Q79 21 72.5 26 Q76 33 73 44 L70.5 44 Q70 33 62 30.5 L50 33 L38 30.5 Q30 33 29.5 44 Z';

// ── ice spikes: [base left, base right, tip x, tip y, base y] ──
const SHARDS: [number, number, number, number, number][] = [
  [25, 35, 13, 15, 32], [65, 75, 87, 15, 32], [32, 45, 28, 7, 28], [55, 68, 72, 7, 28], [41, 59, 50, 4, 27],
];
const ICE_CAP = 'M27 44 Q25 21 50 18.5 Q75 21 73 44 L70.5 44 Q70 33 63 31 L60 37 L56.5 31.5 L53 35.5 L50 31 L47 35.5 L43.5 31.5 L40 37 L37 31 Q30 33 29.5 44 Z';

// ── aurora ──
const AUR_BACK =
  'M23 42 Q19 10.5 50 10 Q81 10.5 77 42 Q85 54 81 65 Q90 77 85 89 Q88 96 82 100 L18 100 Q12 96 15 89 Q10 77 19 65 Q15 54 23 42 Z';
const AUR_FRONT = 'M26 50 Q22.5 14 50 13.5 Q77.5 14 74 50 L71.5 50 Q71.5 33 60 26.5 Q55 24 51 20 Q47 26 40 29 Q30.5 34 28.5 50 Z';
const AUR_STOPS: [number, string][] = [[0, '#7CFFB8'], [0.28, '#2FE6D2'], [0.52, '#4FA6FF'], [0.76, '#9B6BFF'], [1, '#E27BFF']];

export const HAIR_CHEST: Record<string, HairDef> = {
  // ── rare ──
  ramen: {
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf1" d={RAMEN_CAP} />
        <HairMass ctx={ctx} name="hf2" d={RAMEN_PILE} gloss="M31 19.5 Q32 14.5 37 14">
          {[11, 15.5, 20, 24.5].map((y, i) => (
            <path key={y} d={wave(22 + (i % 2) * 2, 78, y)} fill="none" stroke={i % 2 ? ctx.hairLight : ctx.hairShade} strokeWidth="1.1" strokeLinecap="round" opacity={i % 2 ? 0.75 : 0.9} />
          ))}
        </HairMass>
        <Rope d="M41.5 29.5 q-2.4 1.6 0 3.2 t0 3.2 t0 3" fill={ctx.hair} />
        <Rope d="M58.5 29.5 q2.4 1.6 0 3.2 t0 3.2" fill={ctx.hair} />
        <Rope d="M64.5 9 q2 -3.5 4.5 -1.5 t4 -2.5" fill={ctx.hair} />
      </g>
    ),
  },
  fadeCurly: {
    front: ctx => {
      const g = `${ctx.uid}-hfade`;
      const dots: [number, number][] = [[37, 13.5], [43, 13], [49, 14], [55, 13], [61, 13.5], [40, 17.5], [46, 18], [52, 17], [58, 18], [64, 17], [37, 23], [43, 23.5], [49, 22.5], [55, 23.5], [61, 23]];
      return (
        <g>
          <Stops id={g} stops={[[0, ctx.hairShade, 1], [0.5, ctx.hairShade, 0.75], [1, ctx.hairShade, 0.15]]} />
          <path d={FADE_SIDES} fill={`url(#${g})`} />
          <L d="M30 37 Q31 31 36 30.5 M70 37 Q69 31 64 30.5" w={0.9} c={ctx.hairShade} />
          <HairMass ctx={ctx} name="hf" d={FADE_TOP} gloss="M35.5 14.5 Q36.5 11 41 11">
            {dots.map(([x, y]) => (
              <path key={`${x}-${y}`} d={`M${x + 1.4} ${y - 1} a1.7 1.7 0 1 0 0.3 2`} fill="none" stroke={ctx.hairShade} strokeWidth="0.95" strokeLinecap="round" />
            ))}
          </HairMass>
        </g>
      );
    },
  },
  twinTails: {
    back: ctx => (
      <g>
        <HairMass ctx={ctx} name="hb1" d={tailPath(-1)} gloss="M18 30 Q13.5 44 15 60" />
        <HairMass ctx={ctx} name="hb2" d={tailPath(1)} gloss="M84 34 Q86 46 84 58" />
      </g>
    ),
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d="M26 47 Q24 16 50 15 Q76 16 74 47 L71.5 47 Q71 33 58 27.5 Q53 25.5 50 21 Q47 25.5 42 27.5 Q29 33 28.5 47 Z" gloss="M31.5 28 Q36 20.5 45 18.5">
          <L d="M50 21 L50 15.5" w={0.9} c={ctx.hairShade} />
        </HairMass>
        <Ribbon s={-1} />
        <Ribbon s={1} />
      </g>
    ),
  },
  bobCut: {
    back: ctx => <HairMass ctx={ctx} name="hb" d={BOB_BACK} />,
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d={BOB_FRONT}>
        <path d="M29 27 Q50 15.5 71 27" fill="none" stroke={ctx.hairLight} strokeWidth="3.2" strokeDasharray="7 2.4" strokeLinecap="round" opacity="0.85" />
        <path d="M33 24.5 Q38 21.5 42 20.6" fill="none" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
        <g stroke={ctx.hairShade} strokeWidth="0.9" strokeLinecap="round">
          <path d="M38 38 L38 32 M46 38 L46 31 M54 38 L54 31 M62 38 L62 32 M26.5 50 L26.5 64 M73.5 50 L73.5 64" />
        </g>
      </HairMass>
    ),
  },
  pompadour: {
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf1" d={POMP_SIDES}>
          <L d="M29.5 41 Q30 32 37 27.5 M32 43 Q32.5 35 38 31 M70.5 41 Q70 32 63 27.5 M68 43 Q67.5 35 62 31" w={0.9} c={ctx.hairShade} />
        </HairMass>
        <HairMass ctx={ctx} name="hf2" d={POMP_ROLL} gloss="M45 5 Q55 4 62 7.5">
          <L d="M42 8.5 Q56 5 67 11.5 M42.5 15 Q57 11.5 70 18 M40 21.5 Q55 18.5 69.5 24.5" w={0.95} c={ctx.hairShade} />
          <path d="M45 11.5 Q53 9 60 10.5" fill="none" stroke={ctx.hairLight} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        </HairMass>
        <path d="M36.5 13.5 Q36.6 11.6 35 11.7 Q33.2 11.9 33.4 14 Q33.8 16.8 37 16.6 Q40.6 16.2 40.4 12.4 Q40 7.6 35 7.9 Q29.6 8.4 29.8 14.5" fill="none" stroke={INK} strokeWidth={DETAIL} strokeLinecap="round" />
        <Rope d="M51 25.5 Q48 28.5 50 31 Q52 33.5 49.5 35" fill={ctx.hair} w={1.9} />
      </g>
    ),
  },
  slickBack: {
    back: ctx => <HairMass ctx={ctx} name="hb" d="M24.5 44 Q23 14.5 50 13 Q77 14.5 75.5 44 L74.5 55 Q70 58.5 66 54 L34 54 Q30 58.5 25.5 55 Z" />,
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d={SLICK}>
        <path d="M45.5 31 Q44 21 48.5 11 L51.5 11 Q47.5 21 49 32 Z" fill={ctx.hairLight} opacity="0.6" />
        <g stroke={ctx.hairShade} strokeWidth="0.9" fill="none" strokeLinecap="round">
          <path d="M35 31 Q32 23 38 14.5 M37.8 30.3 Q35.5 22 40.8 13.6 M40.6 30 Q39 21.5 43.6 12.9" />
          <path d="M65 31 Q68 23 62 14.5 M62.2 30.3 Q64.5 22 59.2 13.6 M59.4 30 Q61 21.5 56.4 12.9" />
        </g>
        <path d="M32 33 Q31.5 26 34.5 20" fill="none" stroke={ctx.hairLight} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M46.5 24 Q46.3 18 48 14" fill="none" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      </HairMass>
    ),
  },
  // ── epic ──
  neon: {
    back: ctx => (
      <g className="av-glow">
        <path d={NEON} fill="none" stroke={neonOf(ctx.hair)} strokeWidth="5" strokeLinejoin="round" opacity="0.45" />
      </g>
    ),
    front: ctx => {
      const g = `${ctx.uid}-hneon`;
      const neon = neonOf(ctx.hair);
      return (
        <g>
          <Stops id={g} stops={[[0, tint(neon, 0.5)], [0.35, neon], [0.85, ctx.hair]]} />
          <Painted ctx={ctx} name="hf" d={NEON} paint={`url(#${g})`} shadeColor={ctx.hairShade}>
            <path d={NEON} fill="none" stroke={neon} strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M33 18.5 Q32 13 31.5 10 M43.5 16 Q46 10 48.5 7" fill="none" stroke={WHITE} strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
          </Painted>
          <Sparkle x={81} y={7} r={2.6} fill={tint(neon, 0.6)} cls="av-tw" />
          <Sparkle x={19} y={7} r={1.8} cls="av-tw" delay={0.7} />
        </g>
      );
    },
  },
  iceSpikes: {
    back: () => (
      <g className="av-glow">
        <path d="M8 20 L26 0 L50 -5 L74 0 L92 20 L72 34 L28 34 Z" fill="#BDF3FF" opacity="0.28" />
      </g>
    ),
    front: ctx => {
      const g = `${ctx.uid}-hice`;
      return (
        <g>
          <Stops id={g} stops={[[0, '#FFFFFF'], [0.45, '#C6F5FF'], [1, '#7FD8F5']]} />
          {SHARDS.map(([bl, br, tx, ty, by]) => {
            const mid = (bl + br) / 2;
            return (
              <g key={tx}>
                <O d={`M${bl} ${by} L${tx} ${ty} L${br} ${by} Z`} fill={`url(#${g})`} />
                <path d={`M${bl} ${by} L${tx} ${ty} L${mid} ${by} Z`} fill={WHITE} opacity="0.55" />
                <L d={`M${tx} ${ty} L${mid} ${by}`} w={0.8} c="#5BB8E0" />
              </g>
            );
          })}
          <Painted ctx={ctx} name="hf" d={ICE_CAP} paint={`url(#${g})`} shadeColor="#62BFE6">
            <path d="M31 30 Q37 22.5 47 21" fill="none" stroke={WHITE} strokeWidth="1.8" strokeLinecap="round" />
            <g fill={WHITE}>
              <circle cx="58" cy="24" r="0.8" /><circle cx="64" cy="27" r="0.6" /><circle cx="41" cy="27" r="0.6" />
            </g>
          </Painted>
          <Sparkle x={83} y={6} r={2.6} fill="#E6FBFF" cls="av-tw" />
          <Sparkle x={17} y={26} r={1.9} fill={WHITE} cls="av-tw" delay={0.6} />
          <Sparkle x={60} y={9} r={1.6} fill={WHITE} cls="av-tw" delay={1.1} />
        </g>
      );
    },
  },
  // ── legendary ──
  aurora: {
    back: ctx => {
      const g = `${ctx.uid}-haur`;
      const r = `${ctx.uid}-hauh`;
      const gf = `${ctx.uid}-haug`;
      return (
        <g>
          <Stops id={g} stops={AUR_STOPS} x2={1} y2={0.6} />
          <GoldFoil id={gf} />
          <defs>
            <radialGradient id={r} cx="50%" cy="45%" r="50%">
              <stop offset="0" stopColor="#7CFFE0" stopOpacity="0.55" />
              <stop offset="1" stopColor="#9B6BFF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse className="av-glow" cx="50" cy="48" rx="46" ry="48" fill={`url(#${r})`} />
          <Painted ctx={ctx} name="hb" d={AUR_BACK} paint={`url(#${g})`} shadeColor="#5B3FC0">
            <g stroke={WHITE} strokeLinecap="round" fill="none" opacity="0.3">
              <path d="M22 50 L20 96 M27 48 L26 96 M73 48 L74 96 M78 50 L80 96" strokeWidth="1.6" />
            </g>
            <path d="M14 70 Q30 64 50 70 Q70 76 86 68" fill="none" stroke="#7CFFB8" strokeWidth="2.2" opacity="0.55" />
            <path d="M14 84 Q30 78 50 84 Q70 90 86 82" fill="none" stroke="#E27BFF" strokeWidth="2.2" opacity="0.55" />
            <path d="M8 70 Q19 67.5 30 70 L30 74.5 Q19 72 8 74.5 Z" fill={`url(#${gf})`} stroke={INK} strokeWidth="0.9" />
            <path d="M76 44 Q83 58 78 68 Q84 80 80 96 L77 96 Q80 80 75 68 Q79 58 73.5 46 Z" fill={`url(#${gf})`} stroke={INK} strokeWidth="0.8" />
          </Painted>
          <Sparkle x={84} y={86} r={2.6} fill={BRAND.goldLight} cls="av-tw" delay={0.4} />
          <Sparkle x={15} y={60} r={2.2} fill="#C9FFF0" cls="av-tw" delay={1} />
        </g>
      );
    },
    front: ctx => {
      const g = `${ctx.uid}-hauf`;
      const gf = `${ctx.uid}-haug`;
      const star = 'M36.5 17 Q37.6 21.4 41.5 22.5 Q37.6 23.6 36.5 28 Q35.4 23.6 31.5 22.5 Q35.4 21.4 36.5 17 Z';
      return (
        <g>
          <Stops id={g} stops={AUR_STOPS} x2={1} y2={0.25} />
          <Painted ctx={ctx} name="hf" d={AUR_FRONT} paint={`url(#${g})`} shadeColor="#5B3FC0">
            <g fill="none" strokeLinecap="round" opacity="0.5" stroke={WHITE} strokeWidth="1.2">
              <path d="M30 40 Q33 26 41 20 M62 27 Q70 33 71 44" />
            </g>
            <path d="M51 20 Q62 21.5 68 29.5 Q72.5 37 72.5 50 L68.8 50 Q68.5 39 64.5 32.5 Q59.5 25.5 51 24 Z" fill={`url(#${gf})`} stroke={INK} strokeWidth="0.9" />
            <path d="M55 22.6 Q62 24.5 66 30" fill="none" stroke={WHITE} strokeWidth="0.9" strokeLinecap="round" opacity="0.9" />
          </Painted>
          <O d={star} fill={`url(#${gf})`} sw={DETAIL} />
          <circle cx="36.5" cy="22.5" r="1.2" fill="#7CFFE0" stroke={INK} strokeWidth="0.6" />
          <Sparkle x={79} y={14} r={3} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={22} y={13} r={2} fill={WHITE} cls="av-tw" delay={0.7} />
          <Sparkle x={58} y={8} r={1.6} fill="#C9FFF0" cls="av-tw" delay={1.3} />
        </g>
      );
    },
  },
};
