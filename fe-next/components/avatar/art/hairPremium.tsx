/**
 * Rare / epic / legendary hair. Rare styles are signature silhouettes (some
 * with their own dye); epic styles are made of something (electricity, fire,
 * space, rainbow) and move; the legendary cues keep the player's hair color
 * but get a gold-foil sheen.
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, GoldFoil, INK, L, Mirror, O, Shaded, Sparkle, WHITE, type ArtCtx } from './kit';
import { HairMass, type HairDef } from './hair';

const CAP_PART = 'M26.5 46 Q24.5 16.5 50 15.5 Q75.5 16.5 73.5 46 L71 46 Q71 31 55 26 Q50 30 45 26 Q29 31 29 46 Z';

function GradDef({ id, stops, horizontal }: { id: string; stops: [number, string][]; horizontal?: boolean }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2={horizontal ? '1' : '0'} y2={horizontal ? '0' : '1'}>
        {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
      </linearGradient>
    </defs>
  );
}

/** A dyed mass: gradient fill + fixed shade. */
function Dyed({ ctx, name, d, grad, shadeColor, children }: { ctx: ArtCtx; name: string; d: string; grad: string; shadeColor: string; children?: ReactNode }) {
  return (
    <Shaded ctx={ctx} name={name} d={d} fill={`url(#${grad})`} shadeColor={shadeColor}>
      {children}
    </Shaded>
  );
}

const CLOUD =
  'M50 3 Q58 0 63 5 Q72 3 75 10 Q84 11 84 20 Q91 25 87 33 Q92 40 86 46 Q88 55 80 57 L20 57 Q12 55 14 46 Q8 40 13 33 Q9 25 16 20 Q16 11 25 10 Q28 3 37 5 Q42 0 50 3 Z';

export const HAIR_PREMIUM: Record<string, HairDef> = {
  // ── rare ──
  cottonCandy: {
    back: ctx => {
      const g = `${ctx.uid}-cc`;
      return (
        <g>
          <GradDef id={g} stops={[[0, '#FFB3E0'], [0.55, '#FF9ED8'], [1, '#8FE3FF']]} horizontal />
          <Dyed ctx={ctx} name="hb" d={CLOUD} grad={g} shadeColor="#E27FC0">
            <path d="M22 22 Q25 14 34 13" stroke={WHITE} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
          </Dyed>
        </g>
      );
    },
    front: ctx => (
      <g>
        <Dyed ctx={ctx} name="hf" d="M27 42 Q24 34 29 29 Q28 21 37 21 Q42 16 50 19 Q58 16 63 21 Q72 21 71 29 Q76 34 73 42 Q66 31 50 31 Q34 31 27 42 Z" grad={`${ctx.uid}-cc`} shadeColor="#E27FC0" />
        <Sparkle x={73} y={12} r={2.6} cls="av-tw" />
      </g>
    ),
  },
  vaporwave: {
    back: ctx => {
      const g = `${ctx.uid}-vw`;
      return (
        <g>
          <GradDef id={g} stops={[[0, '#FF6FD8'], [0.5, '#9B6BFF'], [1, '#22E5FF']]} />
          <Dyed ctx={ctx} name="hb" d="M24 42 Q22 13 50 12.5 Q78 13 76 42 L78 94 Q70 98 62 94 L38 94 Q30 98 22 94 Z" grad={g} shadeColor="#7B4FD9">
            <g stroke={WHITE} strokeWidth="1.2" opacity="0.5">
              <path d="M22 70 L78 70 M22 76 L78 76 M22 82 L78 82" />
            </g>
          </Dyed>
        </g>
      );
    },
    front: ctx => (
      <Dyed ctx={ctx} name="hf" d="M26 48 Q24 15 50 14.5 Q76 15 74 48 L71.5 48 L71 36.5 Q61 38.5 50 36.5 Q39 38.5 29 36.5 L28.5 48 Z" grad={`${ctx.uid}-vw`} shadeColor="#7B4FD9">
        <path d="M32 25 Q42 18.5 56 19" stroke={WHITE} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      </Dyed>
    ),
  },
  twintails: {
    back: ctx => (
      <g>
        <HairMass ctx={ctx} name="hb1" d="M30 20 Q14 18 12 38 Q10 60 18 86 Q22 70 24 56 Q27 40 32 30 Z" gloss="M17 34 Q15 46 16 60" />
        <HairMass ctx={ctx} name="hb2" d="M70 20 Q86 18 88 38 Q90 60 82 86 Q78 70 76 56 Q73 40 68 30 Z" />
      </g>
    ),
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d="M26 48 Q24 15 50 14.5 Q76 15 74 48 L71.5 48 L71 34 Q60 38 50 33 Q40 38 29 34 L28.5 48 Z" gloss="M32 25 Q42 18.5 56 19" />
        {[26, 74].map(x => (
          <g key={x}>
            <O d={`M${x} 22 L${x - 7} 16 L${x - 6} 27 Z`} fill={BRAND.pink} sw={DETAIL} />
            <O d={`M${x} 22 L${x + 7} 16 L${x + 6} 27 Z`} fill={BRAND.pink} sw={DETAIL} />
            <circle cx={x} cy="22" r="2.2" fill="#FF8CC4" stroke={INK} strokeWidth={DETAIL} />
          </g>
        ))}
      </g>
    ),
  },
  elvis: {
    front: ctx => (
      <HairMass
        ctx={ctx}
        name="hf"
        d="M27 44 Q24 24 32 18 Q35 6 52 4 Q70 3 73 12 Q66 10 60 13 Q74 16 73.5 30 Q75 36 73 44 L70.5 44 Q70 32 60 29.5 Q50 32 40 29.5 Q30 32 29.5 44 Z"
        gloss="M36 14 Q46 7 60 8"
      >
        <path d="M34 22 Q46 14 64 17 M38 27 Q50 21 66 23" stroke={ctx.hairLight} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />
      </HairMass>
    ),
  },
  spaceBuns: {
    back: ctx => (
      <g>
        <HairMass ctx={ctx} name="hb1" d="M22 18 A9.5 9.5 0 1 1 41 18 A9.5 9.5 0 1 1 22 18 Z" gloss="M26 13 Q28 10 32 9.5" />
        <HairMass ctx={ctx} name="hb2" d="M59 18 A9.5 9.5 0 1 1 78 18 A9.5 9.5 0 1 1 59 18 Z" gloss="M63 13 Q65 10 69 9.5" />
      </g>
    ),
    front: ctx => (
      <g>
        <HairMass ctx={ctx} name="hf" d={CAP_PART} gloss="M31 29 Q36 21 45 19" />
        <Sparkle x={36} y={9} r={3} fill={BRAND.cyan} cls="av-tw" />
        <Sparkle x={66} y={8} r={2.4} fill={BRAND.pink} cls="av-tw" delay={0.6} />
      </g>
    ),
  },
  undercut: {
    front: ctx => (
      <g>
        <path d="M27.5 41 Q26 26 32 22 L68 22 Q74 26 72.5 41 Q71.5 30 50 28.5 Q28.5 30 27.5 41 Z" fill={ctx.hairShade} opacity="0.7" />
        <HairMass ctx={ctx} name="hf" d="M29 30 Q28 12 50 10 Q74 9 78 24 Q72 20 66 21 Q70 27 70 32 Q62 25 48 27 Q36 28 29 30 Z" gloss="M36 17 Q48 12 64 14" />
      </g>
    ),
  },
  longFlow: {
    back: ctx => (
      <HairMass
        ctx={ctx}
        name="hb"
        d="M24 42 Q20 12 50 11.5 Q80 12 76 42 Q84 58 78 70 Q84 82 76 98 L24 98 Q16 82 22 70 Q16 58 24 42 Z"
        gloss="M21 56 Q18 66 22 76"
      >
        <path d="M70 50 Q76 62 72 74 M30 50 Q25 62 29 74" stroke={ctx.hairLight} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
      </HairMass>
    ),
    front: ctx => (
      <HairMass ctx={ctx} name="hf" d="M26 50 Q23 15 52 14.5 Q77 16 74 44 L71.5 44 Q70 30 58 25 Q46 34 34 36 Q30 40 29 50 Z" gloss="M31 27 Q40 19 54 18.5" />
    ),
  },
  // ── epic ──
  lightning: {
    back: () => (
      <g className="av-glow">
        <path d="M50 -2 L90 30 L50 40 L10 30 Z" fill={BRAND.cyan} opacity="0.3" />
      </g>
    ),
    front: ctx => {
      const g = `${ctx.uid}-lt`;
      return (
        <g>
          <GradDef id={g} stops={[[0, '#FFFFFF'], [0.35, '#FFF15A'], [1, '#22E5FF']]} />
          <g className="av-flicker">
            <O d="M27 44 Q24 32 28 26 L20 22 L31 18 L27 6 L40 14 L45 0 L52 12 L60 1 L62 14 L75 7 L70 19 L81 22 L72 27 Q76 32 73 44 L70.5 44 Q70 33 61 30 L50 33 L39 30 Q30 33 29.5 44 Z" fill={`url(#${g})`} />
          </g>
          <L d="M44 18 L41 24 L46 24 L42 31" w={1.2} c={WHITE} />
          <Sparkle x={80} y={10} r={2.6} fill={BRAND.cyan} cls="av-tw" />
        </g>
      );
    },
  },
  rainbowMohawk: {
    front: ctx => {
      const clip = `${ctx.uid}-rbm`;
      const d = 'M40 31 Q36 14 41 1 Q45.5 7.5 50 -1 Q54.5 7.5 59 1 Q64 14 60 31 Q50 28 40 31 Z';
      const bands = ['#FF3D5A', '#FF9A1F', '#FFE14D', '#6BE36B', '#22E5FF', '#9B6BFF'];
      return (
        <g>
          <path d="M27.5 41 Q26 20.5 50 18.5 Q74 20.5 72.5 41 Q71.5 30 50 28.5 Q28.5 30 27.5 41 Z" fill={ctx.hairShade} opacity="0.55" />
          <clipPath id={clip}><path d={d} /></clipPath>
          <g clipPath={`url(#${clip})`}>
            {bands.map((c, i) => <rect key={c} x={36 + i * 4.3} y="-2" width="4.4" height="34" fill={c} />)}
            <path d="M44 24 Q42 14 44 6" stroke={WHITE} strokeWidth="1.4" fill="none" opacity="0.7" strokeLinecap="round" />
          </g>
          <path d={d} fill="none" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" />
          <Sparkle x={64} y={6} r={2.4} cls="av-tw" />
        </g>
      );
    },
  },
  flame: {
    back: ctx => {
      const g = `${ctx.uid}-fh`;
      return (
        <g>
          <GradDef id={g} stops={[[0, '#FFE14D'], [0.5, '#FF8A1F'], [1, '#E8303F']]} />
          <g className="av-flicker">
            <O d="M24 46 Q14 34 20 20 Q22 28 28 28 Q24 14 34 4 Q34 14 40 16 Q42 4 52 -2 Q50 10 58 14 Q62 6 70 4 Q66 14 70 22 Q76 16 82 18 Q78 28 80 36 Q84 40 76 46 Z" fill={`url(#${g})`} />
          </g>
        </g>
      );
    },
    front: ctx => {
      const g = `${ctx.uid}-fh2`;
      return (
        <g>
          <GradDef id={g} stops={[[0, '#FFF3A6'], [0.4, '#FFB020'], [1, '#FF5A1F']]} />
          <g className="av-flicker">
            <O d="M27 44 Q22 32 26 24 Q28 28 31 28 Q28 16 37 8 Q37 16 42 18 Q43 7 51 1 Q50 11 57 15 Q60 7 67 5 Q64 14 68 20 Q72 16 76 18 Q72 26 73 44 L70.5 44 Q70 33 61 30 L50 33 L39 30 Q30 33 29.5 44 Z" fill={`url(#${g})`} />
          </g>
          <path d="M40 26 Q42 18 46 14 Q46 22 50 24 Q52 18 56 16 Q55 24 58 27" fill="#FFF7C8" opacity="0.8" />
        </g>
      );
    },
  },
  galaxy: {
    back: ctx => {
      const g = `${ctx.uid}-gh`;
      return (
        <g>
          <defs>
            <radialGradient id={g} cx="40%" cy="30%" r="80%">
              <stop offset="0" stopColor="#B06BFF" />
              <stop offset="0.5" stopColor="#3B1C9E" />
              <stop offset="1" stopColor="#0D0B2E" />
            </radialGradient>
          </defs>
          <Dyed ctx={ctx} name="hb" d="M23 42 Q20 11 50 10.5 Q80 11 77 42 L80 96 Q70 100 62 95 L38 95 Q30 100 20 96 Z" grad={g} shadeColor="#1B1450">
            <g fill={WHITE}>
              <circle cx="26" cy="60" r="0.8" /><circle cx="74" cy="70" r="0.9" /><circle cx="30" cy="84" r="0.6" /><circle cx="70" cy="52" r="0.6" /><circle cx="24" cy="74" r="0.5" />
            </g>
          </Dyed>
          <Sparkle x={75} y={82} r={2.6} fill="#FFD6FF" cls="av-tw" />
          <Sparkle x={24} y={50} r={2} cls="av-tw" delay={0.8} />
        </g>
      );
    },
    front: ctx => (
      <Dyed ctx={ctx} name="hf" d={CAP_PART} grad={`${ctx.uid}-gh`} shadeColor="#1B1450">
        <g fill={WHITE}>
          <circle cx="36" cy="24" r="0.7" /><circle cx="62" cy="21" r="0.8" /><circle cx="46" cy="19" r="0.5" />
        </g>
        <path d="M31 29 Q36 21 45 19" stroke="#E5C8FF" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.8" />
      </Dyed>
    ),
  },
  // ── legendary: the player's own color, finished in gold leaf ──
  trumpSwoop: {
    front: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-tsg`} horizontal />
        <HairMass
          ctx={ctx}
          name="hf"
          d="M26.5 45 Q23 26 32 18 Q44 8 62 10 Q76 12 80 22 Q84 28 78 30 Q74 22 64 23 Q72 28 73 45 L70.5 45 Q69 34 58 31 Q42 36 30 35 L29 45 Z"
          gloss="M36 16 Q52 9 70 14"
        >
          <path d="M31 27 Q50 15 79 25" stroke={`url(#${ctx.uid}-tsg)`} strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <path d="M40 20.5 Q52 15.5 66 17" stroke={WHITE} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.85" />
        </HairMass>
        <Sparkle x={80} y={14} r={2.8} fill={BRAND.goldLight} cls="av-tw" />
        <Sparkle x={28} y={17} r={1.8} cls="av-tw" delay={0.8} />
      </g>
    ),
  },
  recedingHair: {
    front: ctx => {
      const g = `${ctx.uid}-lau`;
      const leaves: [number, number, number][] = [[28.6, 43, -70], [30.4, 37, -52], [33.6, 31.6, -36], [38, 27.4, -20], [43.4, 24.8, -6]];
      const side = (
        <g>
          <path d="M29.5 46 Q30 32 44 25" fill="none" stroke={BRAND.goldDeep} strokeWidth="1.6" strokeLinecap="round" />
          {leaves.map(([x, y, a]) => (
            <ellipse key={`${x}`} cx={x} cy={y} rx="3.6" ry="1.8" transform={`rotate(${a} ${x} ${y})`} fill={`url(#${g})`} stroke={INK} strokeWidth="0.9" />
          ))}
        </g>
      );
      return (
        <g>
          <GoldFoil id={g} />
          <HairMass ctx={ctx} name="hf1" d="M26.5 46 Q24 32 31 26 Q34 30 33 36 Q30 38 29.5 46 Z" />
          <HairMass ctx={ctx} name="hf2" d="M73.5 46 Q76 32 69 26 Q66 30 67 36 Q70 38 70.5 46 Z" />
          <L d="M47 22 Q48 18 46 15 M50 22 Q51 17 50 14 M53 22 Q54 18 55 16" w={1.1} c={ctx.hair} />
          <g data-laurel="">
            {side}
            <Mirror>{side}</Mirror>
          </g>
          <Sparkle x={62} y={17} r={2.4} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={30} y={24} r={1.8} cls="av-tw" delay={0.7} />
        </g>
      );
    },
  },
  highAndTight: {
    front: ctx => {
      const g = `${ctx.uid}-hat`;
      const bolt = <path d="M29.6 31 L33 35.5 L30.6 36.6 L33.6 42" fill="none" stroke={`url(#${g})`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />;
      return (
        <g>
          <GoldFoil id={g} />
          <path d="M27.5 44 Q26.5 30 30 24 L70 24 Q73.5 30 72.5 44 Q71.5 32 66 30 L34 30 Q28.5 32 27.5 44 Z" fill={ctx.hairShade} opacity="0.55" />
          {bolt}
          <Mirror>{bolt}</Mirror>
          <HairMass ctx={ctx} name="hf" d="M33 30 L33 20 Q34 15 42 15 L58 15 Q66 15 67 20 L67 30 Q50 27 33 30 Z" gloss="M37 19 L55 18">
            <path d="M33 17.6 Q50 14 67 17.6 L67 20.4 Q50 17 33 20.4 Z" fill={`url(#${g})`} />
          </HairMass>
          <Sparkle x={70} y={14} r={2.4} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={31} y={17} r={1.7} cls="av-tw" delay={0.9} />
        </g>
      );
    },
  },
};
