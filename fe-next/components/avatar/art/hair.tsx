/**
 * Hair — common styles. Each style has an optional BACK mass (behind the head:
 * length, volume) and FRONT mass (over the forehead: fringe, cap). Hair takes
 * the player's hair color with a cel-shade crescent and one gloss stroke.
 */
import type { ReactNode } from 'react';
import { DETAIL, INK, L, O, Shaded, type ArtCtx } from './kit';

export interface HairDef {
  back?: (ctx: ArtCtx) => ReactNode;
  front?: (ctx: ArtCtx) => ReactNode;
}

/** Gloss stroke on the upper-left of a hair mass. */
export function Gloss({ ctx, d, w = 1.8 }: { ctx: ArtCtx; d: string; w?: number }) {
  return <path d={d} fill="none" stroke={ctx.hairLight} strokeWidth={w} strokeLinecap="round" opacity="0.8" />;
}

export function HairMass({ ctx, name, d, gloss, children }: { ctx: ArtCtx; name: string; d: string; gloss?: string; children?: ReactNode }) {
  return (
    <Shaded ctx={ctx} name={name} d={d} fill={ctx.hair} shadeColor={ctx.hairShade}>
      {gloss && <Gloss ctx={ctx} d={gloss} />}
      {children}
    </Shaded>
  );
}

const CAP_SHORT = 'M27.5 41 Q26 20.5 50 18.5 Q74 20.5 72.5 41 Q71.5 30 50 28.5 Q28.5 30 27.5 41 Z';
const CAP_PART = 'M26.5 46 Q24.5 16.5 50 15.5 Q75.5 16.5 73.5 46 L71 46 Q71 31 55 26 Q50 30 45 26 Q29 31 29 46 Z';

/** Braid rope down from (x, y0) to y1. */
function Braid({ ctx, x, y0, y1, name }: { ctx: ArtCtx; x: number; y0: number; y1: number; name: string }) {
  const links: ReactNode[] = [];
  for (let y = y0, i = 0; y < y1; y += 6, i++) {
    links.push(
      <ellipse key={`${name}${i}`} cx={x} cy={y + 3} rx="4.2" ry="3.6" fill={i % 2 ? ctx.hair : ctx.hairShade} stroke={INK} strokeWidth={DETAIL} />,
    );
  }
  return (
    <g>
      {links}
      <O d={`M${x - 2.6} ${y1 + 1} L${x + 2.6} ${y1 + 1} L${x + 2} ${y1 + 5} L${x - 2} ${y1 + 5} Z`} fill={ctx.hair} sw={DETAIL} />
      <rect x={x - 3} y={y1 - 1} width="6" height="2.4" rx="1" fill="#FF3D9A" stroke={INK} strokeWidth="0.9" />
    </g>
  );
}

function Puff({ ctx, cx, cy, r, name }: { ctx: ArtCtx; cx: number; cy: number; r: number; name: string }) {
  const k = r * 0.35;
  const d = `M${cx - r} ${cy} Q${cx - r - k} ${cy - r + k} ${cx - r * 0.5} ${cy - r} Q${cx} ${cy - r - k} ${cx + r * 0.5} ${cy - r} Q${cx + r + k} ${cy - r + k} ${cx + r} ${cy} Q${cx + r + k} ${cy + r - k} ${cx + r * 0.5} ${cy + r} Q${cx} ${cy + r + k} ${cx - r * 0.5} ${cy + r} Q${cx - r - k} ${cy + r - k} ${cx - r} ${cy} Z`;
  return <HairMass ctx={ctx} name={name} d={d} gloss={`M${cx - r * 0.6} ${cy - r * 0.2} Q${cx - r * 0.5} ${cy - r * 0.7} ${cx - r * 0.05} ${cy - r * 0.75}`} />;
}

export const HAIR_FREE: Record<string, HairDef> = {
  none: {},
  buzz: {
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d={CAP_SHORT} gloss="M34 26 Q42 22 50 22">
        <g fill={ctx.hairShade} opacity="0.6">
          <circle cx="40" cy="25" r="0.6" /><circle cx="56" cy="24" r="0.6" /><circle cx="63" cy="27" r="0.6" /><circle cx="47" cy="23" r="0.6" />
        </g>
      </HairMass>
    ),
  },
  spiky: {
    front: ctx => (
      <HairMass
        ctx={ctx}
        name="hf"
        d="M27 44 Q24 30 29 24 L25.5 15 L35 18.5 L36 8 L44 15.5 L50 5 L55.5 15 L63.5 8 L64.5 18.5 L74 15 L71 24 Q76 30 73 44 L70.5 44 Q70 33 61 30 L50 33 L39 30 Q30 33 29.5 44 Z"
        gloss="M33 25 L37 14 M44 21 L48 11"
      />
    ),
  },
  sideSwept: {
    front: ctx => (
      <HairMass
        ctx={ctx}
        name="hf"
        d="M27 44 Q24 17 50 15.5 Q75 16 74.5 37 L72.5 44 L70.8 44 Q70.5 35 67 32 Q58 39 42 35 Q35 34 31.5 38 L29.5 44 Z"
        gloss="M34 25 Q46 19 62 22"
      >
        <L d="M44 34 Q56 31 66 25" w={0.9} c={ctx.hairShade} />
      </HairMass>
    ),
  },
  mohawk: {
    front: ctx => (
      <g>
        <path d={CAP_SHORT} fill={ctx.hairShade} opacity="0.55" />
        <HairMass ctx={ctx} name="hf" d="M42.5 31 Q39 17 43 3 Q47.5 9.5 50 2 Q52.5 9.5 57 3 Q61 17 57.5 31 Q50 28.5 42.5 31 Z" gloss="M45 22 Q44.5 14 46 8" />
      </g>
    ),
  },
  curly: {
    front: ctx => (
      <HairMass
        ctx={ctx}
        name="hf"
        d="M26.5 45 Q22.5 38.5 26 33 Q22.5 25.5 30 22.5 Q29.5 15.5 38 16.5 Q42 10.5 50 13.5 Q58 10.5 62 16.5 Q70.5 15.5 70 22.5 Q77.5 25.5 74 33 Q77.5 38.5 73.5 45 L71 45 Q71 35 64.5 32 Q60 36 55 33 Q50 37 45 33 Q40 36 35.5 32 Q29 35 29 45 Z"
        gloss="M31 27 Q33 21 38 20 M44 17 Q48 15 52 16"
      />
    ),
  },
  afro: {
    back: ctx => (
      <HairMass
        ctx={ctx}
        name="hb"
        d="M50 4 Q59 1 65 6 Q74 5 78 13 Q86 17 85 27 Q90 35 85 43 Q88 53 80 58 Q78 65 70 64 L30 64 Q22 65 20 58 Q12 53 15 43 Q10 35 15 27 Q14 17 22 13 Q26 5 35 6 Q41 1 50 4 Z"
        gloss="M24 24 Q27 15 36 12"
      />
    ),
    front: ctx => <HairMass ctx={ctx} name="hf" d="M27 42 Q26 21.5 50 20 Q74 21.5 73 42 Q67 31 50 30.5 Q33 31 27 42 Z" />,
  },
  dreads: {
    back: ctx => (
      <g>
        {[21, 27, 73, 79].map((x, i) => (
          <O key={x} d={`M${x - 3} 34 L${x + 3} 34 L${x + 3} ${76 + (i % 2) * 6} Q${x} ${80 + (i % 2) * 6} ${x - 3} ${76 + (i % 2) * 6} Z`} fill={i % 2 ? ctx.hair : ctx.hairShade} sw={DETAIL + 0.2} />
        ))}
        <HairMass ctx={ctx} name="hb" d="M22 46 Q18 14 50 12 Q82 14 78 46 Z" />
      </g>
    ),
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d="M26.5 44 Q24.5 17 50 15 Q75.5 17 73.5 44 L71 44 Q70 31 50 28 Q30 31 29 44 Z" gloss="M33 24 Q40 19 49 18" />
        <O d="M33 27 L37 27 L36 40 Q34.5 42 33 40 Z" fill={ctx.hair} sw={DETAIL} />
        <O d="M63 27 L67 27 L67 40 Q65.5 42 64 40 Z" fill={ctx.hairShade} sw={DETAIL} />
      </g>
    ),
  },
  cornrows: {
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d="M27 44 Q25 19 50 17 Q75 19 73 44 L70.5 44 Q70 31 50 29 Q30 31 29.5 44 Z">
        <g stroke={ctx.hairLight} strokeWidth="0.9" fill="none" opacity="0.75" strokeLinecap="round">
          <path d="M36 30 Q33 22 38 17.5 M43 29 Q41 21 44 16.5 M50 28.5 L50 16 M57 29 Q59 21 56 16.5 M64 30 Q67 22 62 17.5" />
        </g>
      </HairMass>
    ),
  },
  straight: {
    back: ctx => <HairMass ctx={ctx} name="hb" d="M24.5 42 Q23 15 50 14 Q77 15 75.5 42 L76.5 71 Q70 74 64.5 69.5 L35.5 69.5 Q30 74 23.5 71 Z" />,
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d="M26 47 Q24 16 50 15.5 Q76 16 74 47 L71.5 47 Q70.5 32 58.5 26.5 Q50 34 33.5 33.5 Q30 37 28.5 47 Z" gloss="M32 25 Q42 18.5 55 19" />
    ),
  },
  wavy: {
    back: ctx => (
      <HairMass
        ctx={ctx}
        name="hb"
        d="M24 42 Q22 14 50 13 Q78 14 76 42 Q80 52 76 60 Q81 68 76 76 Q72 82 66 79 L34 79 Q28 82 24 76 Q19 68 24 60 Q20 52 24 42 Z"
      />
    ),
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d={CAP_PART} gloss="M31 28 Q37 20 46 19">
        <L d="M50 26 Q49 21 50 17" w={0.9} c={ctx.hairShade} />
      </HairMass>
    ),
  },
  long: {
    back: ctx => (
      <HairMass ctx={ctx} name="hb" d="M24 42 Q22 13 50 12.5 Q78 13 76 42 L79 96 Q70 100 62 96 L38 96 Q30 100 21 96 Z" gloss="M23 55 L22.5 82" />
    ),
    front: ctx => <HairMass ctx={ctx} name="hf" d={CAP_PART} gloss="M31 29 Q36 21 45 19" />,
  },
  bob: {
    back: ctx => <HairMass ctx={ctx} name="hb" d="M24 44 Q22.5 13.5 50 13.5 Q77.5 13.5 76 44 L77 64 Q71 69 64.5 65 L35.5 65 Q29 69 23 64 Z" />,
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d="M26 48 Q24 15 50 14.5 Q76 15 74 48 L71.5 48 L71 36.5 Q61 38.5 50 36.5 Q39 38.5 29 36.5 L28.5 48 Z" gloss="M32 25 Q42 18.5 56 19">
        <g stroke={ctx.hairShade} strokeWidth="0.9" strokeLinecap="round">
          <path d="M40 37.5 L41 32 M50 36.5 L50 31 M60 37.5 L59 32" />
        </g>
      </HairMass>
    ),
  },
  pixie: {
    front: ctx => (
      <HairMass
        ctx={ctx}
        name="hf"
        d="M27 46 Q24 18 50 16 Q76 18 73 44 L70.5 44 Q70 34 64 31 L60 36 L57 31 Q48 38 38 37 L35 41 L33 36 Q30 38 29.5 46 Z"
        gloss="M32 26 Q42 19 55 20"
      />
    ),
  },
  ponytail: {
    back: ctx => (
      <HairMass ctx={ctx} name="hb" d="M58 21 Q80 13 84 32 Q87 50 78 64 Q79 49 73 40 Q69 33 61 30 Z" gloss="M70 20 Q79 24 81 36" />
    ),
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d="M27 43 Q25 18 50 16.5 Q75 18 73 43 L70.5 43 Q70 30 50 28 Q30 30 29.5 43 Z" gloss="M33 26 Q41 20 50 19.5">
          <L d="M36 28 Q46 22 62 19 M44 28 Q54 23 65 22" w={0.8} c={ctx.hairShade} />
        </HairMass>
        <circle cx="65" cy="20.5" r="3" fill="#FF3D9A" stroke={INK} strokeWidth={DETAIL} />
      </g>
    ),
  },
  bun: {
    back: ctx => <Puff ctx={ctx} cx={50} cy={11} r={9} name="hb" />,
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d="M27 43 Q25 18 50 17 Q75 18 73 43 L70.5 43 Q70 30 50 28 Q30 30 29.5 43 Z" gloss="M33 26 Q41 20.5 50 20" />
        <O d="M44 18.5 Q50 21 56 18.5 L55 16 Q50 18 45 16 Z" fill="#22E5FF" sw={DETAIL} />
      </g>
    ),
  },
  pigtails: {
    back: ctx => (
      <g>
        <Puff ctx={ctx} cx={24} cy={25} r={12} name="hb1" />
        <Puff ctx={ctx} cx={76} cy={25} r={12} name="hb2" />
      </g>
    ),
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d={CAP_PART} gloss="M31 29 Q36 21 45 19" />
        <circle cx="31.5" cy="21" r="3.2" fill="#FFB020" stroke={INK} strokeWidth={DETAIL} />
        <circle cx="68.5" cy="21" r="3.2" fill="#FFB020" stroke={INK} strokeWidth={DETAIL} />
      </g>
    ),
  },
  braids: {
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d={CAP_PART} gloss="M31 29 Q36 21 45 19" />
        <Braid ctx={ctx} x={26} y0={44} y1={84} name="bl" />
        <Braid ctx={ctx} x={74} y0={44} y1={84} name="br" />
      </g>
    ),
  },
};
