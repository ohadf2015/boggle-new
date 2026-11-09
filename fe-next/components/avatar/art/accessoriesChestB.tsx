/**
 * 2026-11 chest drop — accessories (epic + legendary). These parts come out of reward chests
 * (lib/avatar/chestDrops.ts); same kit, same outline and light rules as the
 * rest of the art (see kit.tsx header).
 *
 * Epic: a material (gradient, gloss, glow) and a sparkle or two.
 * Legendary (chest-only): built partly from gold leaf (GoldFoil), with its own
 * light and twinkling sparkles, so the tier reads from across the room.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, GoldFoil, INK, L, Mirror, O, Sparkle, WHITE, shade, tint, type ArtCtx } from './kit';
import { accFill, type AccDef } from './accessories';

const id = (ctx: ArtCtx, name: string) => `${ctx.uid}-${name}`;

function LinGrad({ gid, stops, x2 = '0', y2 = '1' }: { gid: string; stops: [number, string, number?][]; x2?: string; y2?: string }) {
  return (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2={x2} y2={y2}>
        {stops.map(([o, c, op]) => <stop key={o} offset={o} stopColor={c} stopOpacity={op ?? 1} />)}
      </linearGradient>
    </defs>
  );
}

function RadGlow({ gid, color, inner = 0.75 }: { gid: string; color: string; inner?: number }) {
  return (
    <defs>
      <radialGradient id={gid} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={color} stopOpacity={inner} />
        <stop offset="0.6" stopColor={color} stopOpacity={inner * 0.45} />
        <stop offset="1" stopColor={color} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/* ── flame aura: tongues around the silhouette, scaled copies for the core ── */
type Pt = [number, number];
const AURA_TIPS: Pt[] = [[3, 80], [4, 54], [10, 30], [22, 12], [36, 2], [50, -4], [64, 2], [78, 12], [90, 30], [96, 54], [97, 80]];
const AURA_VALLEYS: Pt[] = [[13, 66], [14, 44], [20, 26], [30, 16], [43, 10], [57, 10], [70, 16], [80, 26], [86, 44], [87, 66]];

function flamePath(scale: number, cx = 50, cy = 64): string {
  const p = ([x, y]: Pt): Pt => [cx + (x - cx) * scale, cy + (y - cy) * scale];
  const f = (n: number) => n.toFixed(1);
  const start = p([14, 104]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  let prev: Pt = start;
  AURA_TIPS.forEach((tip, i) => {
    const t = p(tip);
    const v = i < AURA_VALLEYS.length ? p(AURA_VALLEYS[i]) : p([86, 104]);
    // each tongue: a round belly up from the valley, a sharp tip, a belly back down
    d += ` Q${f(prev[0])} ${f(t[1] + (prev[1] - t[1]) * 0.45)} ${f(t[0])} ${f(t[1])}`;
    d += ` Q${f(v[0])} ${f(t[1] + (v[1] - t[1]) * 0.45)} ${f(v[0])} ${f(v[1])}`;
    prev = v;
  });
  return `${d} Z`;
}
const AURA_OUT = flamePath(1);
const AURA_MID = flamePath(0.8, 50, 66);
const AURA_CORE = flamePath(0.62, 50, 68);

/* ── dragon wings: one left wing, mirrored ── */
const DW_WRIST: Pt = [12, 6];
const DW_TIPS: Pt[] = [[1.5, 22], [1.5, 46], [8, 66], [24, 75]];
const DW_MEMBRANE = 'M44 76 L40 62 Q30 20 12 6 Q4 12 1.5 22 Q11 34 1.5 46 Q14 53 8 66 Q19 65 24 75 Q33 70 44 76 Z';
const DW_ARM = 'M42.4 66 Q32 19 12.6 3.8 Q9.6 5.6 11.2 8.2 Q28 22 37.6 64 Z';

function bone(from: Pt, to: Pt, w: number): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w;
  const ny = (dx / len) * w;
  const f = (n: number) => n.toFixed(1);
  return `M${f(from[0] + nx)} ${f(from[1] + ny)} L${f(to[0])} ${f(to[1])} L${f(from[0] - nx)} ${f(from[1] - ny)} Z`;
}

function DragonWing({ ctx }: { ctx: ArtCtx }) {
  const mem = id(ctx, 'dwm');
  const gold = id(ctx, 'dwg');
  // pulled in from the corner so the rarity frame never hides the wrist and scallops
  return (
    <g transform="translate(5 4) scale(0.92)">
      <O d={DW_MEMBRANE} fill={`url(#${mem})`} />
      {/* soft lighter panels between the fingers */}
      <path d="M12 6 Q6 22 4 30 Q10 36 6 42 Q14 22 12 6 Z M12 6 Q12 40 12 56 Q16 60 15 66 Q20 40 12 6 Z" fill={WHITE} opacity="0.2" />
      {DW_TIPS.map(t => <path key={t.join()} d={bone(DW_WRIST, t, 1.6)} fill={`url(#${gold})`} stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />)}
      <O d={DW_ARM} fill={`url(#${gold})`} sw={1.4} />
      <path d="M36 50 Q30 24 14 8.4" stroke={WHITE} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.85" />
      {/* friendly rounded wrist knob (no claws) */}
 <circle cx={DW_WRIST[0]} cy={DW_WRIST[1]} r="3.6" fill={`url(#${gold})`} stroke={INK} strokeWidth={DETAIL} />
      <circle cx={DW_WRIST[0] - 1} cy={DW_WRIST[1] - 1.1} r="1" fill={WHITE} />
      {DW_TIPS.map(([x, y]) => <circle key={`k${x}`} cx={x + 0.4} cy={y} r="1.5" fill={BRAND.goldLight} stroke={INK} strokeWidth="0.8" />)}
    </g>
  );
}

/* ── fairy wings: long translucent teardrops, mirrored ── */
const FW_UP = 'M43 58 Q30 40 20 22 Q14 10 6 7 Q1 9 3 18 Q7 38 41 63 Z';
const FW_LO = 'M42 66 Q28 68 17 80 Q11 88 13 93 Q18 96 25 90 Q36 80 43 69 Z';
const FW_VEINS_UP = 'M41 61 Q24 40 8 11 M30 46 Q22 36 10 30 M30 46 Q30 32 22 20';
const FW_VEINS_LO = 'M42 67 Q28 78 16 91 M33 75 Q24 80 20 86';

function FairyWing({ ctx }: { ctx: ArtCtx }) {
  const g = `url(#${id(ctx, 'fw')})`;
  return (
    <g>
      <path d={FW_UP} fill={g} fillOpacity="0.78" stroke={INK} strokeWidth={DETAIL + 0.3} strokeLinejoin="round" />
      <path d={FW_LO} fill={g} fillOpacity="0.78" stroke={INK} strokeWidth={DETAIL + 0.3} strokeLinejoin="round" />
      <path d={FW_UP} fill="none" stroke={WHITE} strokeWidth="1.2" strokeLinejoin="round" opacity="0.55" transform="translate(0.9 0.9)" />
      <L d={FW_VEINS_UP} w={0.9} c={WHITE} opacity={0.85} />
      <L d={FW_VEINS_LO} w={0.9} c={WHITE} opacity={0.85} />
      <path d="M8 13 Q12 22 18 30" stroke={WHITE} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9" />
      <circle cx="12" cy="17" r="1.3" fill={WHITE} opacity="0.9" />
      <circle cx="22" cy="86" r="1" fill={WHITE} opacity="0.9" />
    </g>
  );
}

/* ── ninja scarf tails (blow to the right) ── */
const NS_TAIL_A = 'M62 76 Q72 70 82 72 Q90 73 97 66 Q96 76 88 80 Q78 84 64 82 Z';
const NS_TAIL_B = 'M62 80 Q70 82 78 88 Q86 93 95 91 Q90 98 80 97 Q70 94 61 85 Z';

function Flower({ x, y, c, r = 1.5 }: { x: number; y: number; c: string; r?: number }): ReactNode {
  return (
    <g>
      {[0, 72, 144, 216, 288].map(a => (
        <circle key={a} cx={x + Math.cos(((a - 90) * Math.PI) / 180) * r * 1.15} cy={y + Math.sin(((a - 90) * Math.PI) / 180) * r * 1.15} r={r} fill={c} stroke={INK} strokeWidth="0.6" />
      ))}
      <circle cx={x} cy={y} r={r * 0.7} fill={BRAND.goldLight} stroke={INK} strokeWidth="0.5" />
    </g>
  );
}

export const ACC_CHEST_B: Record<string, AccDef> = {
  // ── epic ──
  ninjaScarf: {
    layer: 'neck',
    render: ctx => {
      const c = accFill(ctx);
      const g = id(ctx, 'nsg');
      const fill = `url(#${g})`;
      return (
        <g>
          <LinGrad gid={g} stops={[[0, tint(c, 0.35)], [0.5, c], [1, shade(c, 0.28)]]} x2="0.4" y2="1" />
          <O d={NS_TAIL_B} fill={fill} />
          <L d="M66 84 Q76 90 88 93" w={0.9} c={shade(c, 0.35)} />
          <O d={NS_TAIL_A} fill={fill} />
          <L d="M68 78 Q80 77 92 71" w={0.9} c={shade(c, 0.35)} />
          <path d="M68 75 Q76 72 84 73.5" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.75" />
          {/* two wraps around the neck */}
          <O d="M35 76 Q50 82 65 76 Q67.5 80.5 65.5 85 Q50 91 34.5 85 Q32.5 80.5 35 76 Z" fill={fill} />
          <O d="M36.5 69.5 Q50 76 63.5 69.5 Q66.5 73.5 64.5 78 Q50 84 35.5 78 Q33.5 73.5 36.5 69.5 Z" fill={fill} />
          <path d="M39 72.6 Q46 76 52 76.4" stroke={WHITE} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M38 79.6 Q44 82.4 49 82.8" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* knot */}
          <O d="M60.5 74.5 Q66 72 69 76 Q70 81 65 83 Q60 82.5 59.5 78.5 Z" fill={shade(c, 0.12)} />
          <path d="M62 76 Q64.5 74.6 66.5 75.6" stroke={WHITE} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7" />
          <Sparkle x={92} y={64} r={2.2} cls="av-tw" />
        </g>
      );
    },
  },
  cape: {
    layer: 'back',
    render: ctx => {
      const g = id(ctx, 'cpg');
      const lin = id(ctx, 'cpl');
      const collar = 'M38 64 Q22 54 11 29 Q22 21 34 25 Q36 44 44 60 Z';
      const trim = 'M11 29 Q22 21 34 25';
      return (
        <g>
          <LinGrad gid={g} stops={[[0, '#FF5A7A'], [0.55, '#E2245E'], [1, '#8E1250']]} x2="0.5" y2="1" />
          <LinGrad gid={lin} stops={[[0, '#B79BFF'], [1, '#5A3FD1']]} />
          {/* flowing body with a wavy hem that flares past the shoulders */}
          <O d="M30 48 Q18 60 10 74 Q4 86 -2 102 L102 102 Q96 86 90 74 Q82 60 70 48 Z" fill={`url(#${g})`} />
          <path d="M4 100 Q10 94 16 98 Q22 102 26 100 M74 100 Q78 102 84 98 Q90 94 96 100" fill="none" stroke={shade('#8E1250', 0.15)} strokeWidth="1" />
          <path d="M26 62 Q16 76 10 92" stroke={WHITE} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.45" />
          <path d="M74 62 Q82 74 88 88" stroke="#8E1250" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
          {/* high standing collar behind the head: purple lining, gold trim */}
          <O d={collar} fill={`url(#${lin})`} />
          <Mirror><O d={collar} fill={`url(#${lin})`} /></Mirror>
          <L d={trim} w={3.6} />
          <L d={trim} w={1.9} c={BRAND.gold} />
          <Mirror>
            <L d={trim} w={3.6} />
            <L d={trim} w={1.9} c={BRAND.gold} />
          </Mirror>
          <path d="M17 34 Q23 46 32 54" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.55" />
          <Sparkle x={9} y={22} r={2.4} fill={BRAND.goldLight} cls="av-tw" />
        </g>
      );
    },
  },
  wings: {
    layer: 'back',
    render: ctx => (
      <g className="av-float">
        <LinGrad gid={id(ctx, 'fw')} stops={[[0, '#FF6FD8'], [0.4, '#A97BFF'], [0.75, '#3FDCFF'], [1, '#8CFFE8']]} x2="1" y2="1" />
        <FairyWing ctx={ctx} />
        <Mirror><FairyWing ctx={ctx} /></Mirror>
        <Sparkle x={13} y={9} r={2.6} cls="av-tw" />
        <Sparkle x={93} y={22} r={2} fill="#FFD6FF" cls="av-tw" delay={0.6} />
        <Sparkle x={10} y={70} r={1.8} fill={BRAND.cyan} cls="av-tw" delay={1.1} />
      </g>
    ),
  },
  unicornHorn: {
    layer: 'front',
    render: ctx => {
      const g = id(ctx, 'uh');
      return (
        <g>
          <LinGrad gid={g} stops={[[0, '#FFFFFF'], [0.35, '#FFD1F0'], [0.7, '#D7C4FF'], [1, '#A8F0FF']]} x2="1" y2="1" />
          {/* flower band */}
          <L d="M29 31 Q50 19 71 31" w={3.2} />
          <L d="M29 31 Q50 19 71 31" w={1.6} c="#58C46A" />
          <O d="M35 26.4 Q36.5 22.6 40 23 Q38.6 26.2 35 26.4 Z" fill="#58C46A" sw={0.8} />
          <O d="M65 26.4 Q63.5 22.6 60 23 Q61.4 26.2 65 26.4 Z" fill="#58C46A" sw={0.8} />
          <Flower x={32} y={28.6} c="#FF8FC8" />
          <Flower x={43} y={23.4} c="#B79BFF" r={1.3} />
          <Flower x={57} y={23.4} c="#7FE3FF" r={1.3} />
          <Flower x={68} y={28.6} c="#FF8FC8" />
          {/* spiral horn */}
           <O d="M43 24 Q46.5 12 51.5 0.5 Q53.5 12 57 24 Q50 26.6 43 24 Z" fill={`url(#${g})`} />
          <g stroke="#B08AE8" strokeWidth="0.95" strokeLinecap="round" fill="none">
            <path d="M44.8 20.2 Q50 22.8 55.2 18.4" />
            <path d="M45.8 15.2 Q50 17.4 54.1 13.2" />
            <path d="M47 10.2 Q50.4 12 53.1 8.2" />
            <path d="M48.6 5.2 Q51 6.6 52.3 3.6" />
          </g>
          <path d="M47 21 Q48.4 11 51 1.5" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.95" />
          <circle cx="50" cy="24.4" r="1.7" fill={BRAND.pink} stroke={INK} strokeWidth="0.8" />
          <Sparkle x={57.5} y={0.5} r={2.4} cls="av-tw" />
          <Sparkle x={41} y={8} r={1.6} fill="#FFD6FF" cls="av-tw" delay={0.7} />
        </g>
      );
    },
  },
  // ── legendary ──
  dragonWings: {
    layer: 'back',
    render: ctx => (
      <g>
        <RadGlow gid={id(ctx, 'dwl')} color={BRAND.gold} inner={0.7} />
        <circle cx="50" cy="44" r="50" fill={`url(#${id(ctx, 'dwl')})`} className="av-glow" />
        <g className="av-float">
          <LinGrad gid={id(ctx, 'dwm')} stops={[[0, '#3FE0C8'], [0.45, '#1C9FBF'], [1, '#5A36C9']]} x2="0.6" y2="1" />
          <GoldFoil id={id(ctx, 'dwg')} />
          <DragonWing ctx={ctx} />
          <Mirror><DragonWing ctx={ctx} /></Mirror>
        </g>
        <Sparkle x={8} y={6} r={3} fill={BRAND.goldLight} cls="av-tw" />
        <Sparkle x={92} y={8} r={2.4} cls="av-tw" delay={0.6} />
        <Sparkle x={94} y={70} r={2} fill={BRAND.goldLight} cls="av-tw" delay={1.1} />
        <Sparkle x={5} y={88} r={1.8} cls="av-tw" delay={1.5} />
      </g>
    ),
  },
  flameAura: {
    layer: 'back',
    render: ctx => {
      const out = id(ctx, 'fao');
      const mid = id(ctx, 'fam');
      const core = id(ctx, 'fac');
      return (
        <g>
          <RadGlow gid={id(ctx, 'fal')} color="#FFB020" inner={0.65} />
          <circle cx="50" cy="52" r="52" fill={`url(#${id(ctx, 'fal')})`} className="av-glow" />
          <LinGrad gid={out} stops={[[0, '#FF6FB5'], [0.55, '#FF5A1F'], [1, '#FF8A1F']]} />
          <LinGrad gid={mid} stops={[[0, '#FFE14D'], [0.6, '#FF9A1F'], [1, '#FF7A2A']]} />
          <GoldFoil id={core} />
          <g className="av-flicker">
            <O d={AURA_OUT} fill={`url(#${out})`} />
          </g>
          <O d={AURA_MID} fill={`url(#${mid})`} sw={1.5} />
          <O d={AURA_CORE} fill={`url(#${core})`} sw={1.2} />
          {/* embers */}
          <g stroke={INK} strokeWidth="0.7">
            <circle cx="8" cy="20" r="1.6" fill="#FFE14D" className="av-glow" />
            <circle cx="93" cy="16" r="1.3" fill="#FF8A1F" />
            <circle cx="88" cy="88" r="1.4" fill="#FFE14D" className="av-glow" />
            <circle cx="16" cy="6" r="1.1" fill="#FF6FB5" />
          </g>
          <Sparkle x={50} y={-1} r={3} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={86} y={4} r={2.2} cls="av-tw" delay={0.6} />
          <Sparkle x={6} y={44} r={2.2} fill={BRAND.goldLight} cls="av-tw" delay={1.1} />
        </g>
      );
    },
  },
};
