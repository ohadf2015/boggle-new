/**
 * Rare / epic / legendary accessories. These are the collectibles players
 * show off, so each is a signature object with its own material colors
 * (gold, ice, feathers) rather than the player's accessory tint.
 */
import { BRAND, DETAIL, GoldFoil, INK, L, LINE, Mirror, O, Shaded, Sparkle, WHITE, shade, tint, type ArtCtx } from './kit';
import { accFill, type AccDef } from './accessories';

const GOLD = BRAND.gold;
const GOLD_D = BRAND.goldDeep;

function Grad({ id, stops, x2 = '0', y2 = '1' }: { id: string; stops: [number, string][]; x2?: string; y2?: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
        {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
      </linearGradient>
    </defs>
  );
}

function Wing({ d, fill, feather }: { d: string; fill: string; feather: string }) {
  return (
    <g>
      <O d={d} fill={fill} />
      <path d={feather} fill="none" stroke={shade(fill, 0.22)} strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

const WING_L = 'M34 80 Q14 76 6 58 Q2 46 8 36 Q14 50 22 52 Q12 42 14 30 Q22 44 32 48 Q26 38 30 28 Q36 48 42 66 Z';
const WING_L_FEATHER = 'M12 50 Q20 58 32 64 M18 40 Q24 50 34 56';

function mirror(d: string): string {
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${(100 - Number(x)).toFixed(1)} ${y}`);
}

export const ACC_PREMIUM: Record<string, AccDef> = {
  // ── rare ──
  headphones: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      return (
        <g>
          <path d="M24 46 Q22 12 50 11 Q78 12 76 46" fill="none" stroke={INK} strokeWidth="6.4" strokeLinecap="round" />
          <path d="M24 46 Q22 12 50 11 Q78 12 76 46" fill="none" stroke={c} strokeWidth="3.6" strokeLinecap="round" />
          <O d="M18 42 Q18 38 22 38 L28 38 L28 60 L22 60 Q18 60 18 56 Z" fill={c} />
          <O d="M82 42 Q82 38 78 38 L72 38 L72 60 L78 60 Q82 60 82 56 Z" fill={c} />
          <rect x="20" y="41" width="3" height="16" rx="1.5" fill={BRAND.lime} stroke={INK} strokeWidth="0.8" />
          <rect x="77" y="41" width="3" height="16" rx="1.5" fill={BRAND.lime} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    },
  },
  cowboyHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <O d="M12 30 Q14 24 26 26 Q50 32 74 26 Q86 24 88 30 Q84 38 72 35 Q50 40 28 35 Q16 38 12 30 Z" fill="#B8733A" />
        <Shaded ctx={ctx} name="acc" d="M30 28 Q30 6 40 6 Q45 6 50 10 Q55 6 60 6 Q70 6 70 28 Q50 33 30 28 Z" fill="#C98545" />
        <path d="M30.5 25 Q50 30 69.5 25 L69.8 28 Q50 33 30.2 28 Z" fill="#6B3A1C" />
        <circle cx="50" cy="28.8" r="1.8" fill={GOLD} stroke={INK} strokeWidth="0.7" />
      </g>
    ),
  },
  duckHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="acc" d="M26 30 Q24 6 50 5 Q74 6 74 30 Q50 26 26 30 Z" fill="#FFD84A">
          <ellipse cx="38" cy="12" rx="5" ry="2.4" fill={WHITE} opacity="0.6" transform="rotate(-20 38 12)" />
        </Shaded>
        <O d="M40 26 Q50 20 60 26 Q58 34 50 34 Q42 34 40 26 Z" fill="#FF8A2A" />
        <L d="M42 28 Q50 26 58 28" w={0.9} c="#C4570A" />
        <circle cx="38" cy="18" r="3" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
        <circle cx="62" cy="18" r="3" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
        <circle cx="38.6" cy="18.4" r="1.5" fill={INK} />
        <circle cx="62.6" cy="18.4" r="1.5" fill={INK} />
        <O d="M50 5 Q52 0 56 1 Q53 3 52 6 Z" fill="#FFD84A" sw={DETAIL} />
      </g>
    ),
  },
  crown: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-crn`;
      return (
        <g>
          <Grad id={g} stops={[[0, BRAND.goldLight], [0.5, GOLD], [1, GOLD_D]]} />
          <O d="M30 26 L28 8 L38 16 L44 4 L50 14 L56 4 L62 16 L72 8 L70 26 Q50 22 30 26 Z" fill={`url(#${g})`} />
          <circle cx="50" cy="20" r="2.4" fill="#E8303F" stroke={INK} strokeWidth="0.9" />
          <circle cx="38" cy="21" r="1.7" fill={BRAND.cyan} stroke={INK} strokeWidth="0.8" />
          <circle cx="62" cy="21" r="1.7" fill={BRAND.cyan} stroke={INK} strokeWidth="0.8" />
          <Sparkle x={45} y={10} r={2} cls="av-tw" />
        </g>
      );
    },
  },
  tiara: {
    layer: 'front',
    render: () => (
      <g>
        <L d="M28 30 Q50 20 72 30" w={3.4} />
        <L d="M28 30 Q50 20 72 30" w={1.8} c="#E3E8F5" />
        <O d="M42 24 L50 10 L58 24 Q50 22 42 24 Z" fill="#E3E8F5" sw={DETAIL} />
        <path d="M50 13 L54 17 L50 22 L46 17 Z" fill={BRAND.pink} stroke={INK} strokeWidth="0.8" />
        <circle cx="38" cy="25.6" r="1.6" fill={BRAND.cyan} stroke={INK} strokeWidth="0.7" />
        <circle cx="62" cy="25.6" r="1.6" fill={BRAND.cyan} stroke={INK} strokeWidth="0.7" />
        <Sparkle x={57} y={9} r={2.2} cls="av-tw" />
      </g>
    ),
  },
  flowerCrown: {
    layer: 'front',
    render: () => {
      const flowers: [number, number, string][] = [[30, 29, '#FF7AB0'], [39, 24, '#FFE14D'], [50, 22, '#FF7AB0'], [61, 24, '#9B6BFF'], [70, 29, '#FFE14D']];
      return (
        <g>
          <L d="M27 32 Q50 18 73 32" w={2.6} c="#3FA34D" />
          {flowers.map(([x, y, c]) => (
            <g key={x}>
              {[0, 72, 144, 216, 288].map(a => (
                <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * 2.4} cy={y + Math.sin((a * Math.PI) / 180) * 2.4} r="2" fill={c} stroke={INK} strokeWidth="0.7" />
              ))}
              <circle cx={x} cy={y} r="1.4" fill={WHITE} stroke={INK} strokeWidth="0.6" />
            </g>
          ))}
        </g>
      );
    },
  },
  topHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="acc" d="M34 26 L35 2 Q50 0 65 2 L66 26 Z" fill="#232A45">
          <path d="M39 4 L39 24" stroke={WHITE} strokeWidth="1.6" opacity="0.25" />
        </Shaded>
        <rect x="34.6" y="18" width="30.8" height="5" fill={BRAND.pink} stroke={INK} strokeWidth={DETAIL} />
        <O d="M22 27 Q50 22 78 27 Q78 31 72 31 Q50 28 28 31 Q22 31 22 27 Z" fill="#232A45" />
      </g>
    ),
  },
  pirateHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="acc" d="M16 30 Q22 12 36 12 Q44 4 50 4 Q56 4 64 12 Q78 12 84 30 Q50 22 16 30 Z" fill="#232A45" />
        <path d="M18 28 Q50 20 82 28" fill="none" stroke={GOLD} strokeWidth="1.4" />
        <circle cx="50" cy="14" r="4" fill={WHITE} stroke={INK} strokeWidth="0.9" />
        <circle cx="48.6" cy="13.4" r="0.9" fill={INK} />
        <circle cx="51.4" cy="13.4" r="0.9" fill={INK} />
        <path d="M45 20 L55 22 M45 22 L55 20" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
  },
  viking: {
    layer: 'front',
    render: ctx => (
      <g>
        <O d="M28 22 Q18 18 16 6 Q22 12 30 14 Z" fill="#F4EEDC" />
        <O d="M72 22 Q82 18 84 6 Q78 12 70 14 Z" fill="#F4EEDC" />
        <Shaded ctx={ctx} name="acc" d="M26 32 Q25 10 50 9 Q75 10 74 32 Z" fill="#A9B4C8">
          <path d="M50 9 L50 32" stroke="#7A879E" strokeWidth="2.4" />
          <ellipse cx="38" cy="16" rx="5" ry="2.2" fill={WHITE} opacity="0.55" transform="rotate(-25 38 16)" />
        </Shaded>
        <rect x="24.5" y="29" width="51" height="5" rx="1.5" fill="#8E6A3A" stroke={INK} strokeWidth={DETAIL} />
        <g fill={GOLD} stroke={INK} strokeWidth="0.6">
          <circle cx="32" cy="31.5" r="1" /><circle cx="44" cy="31.5" r="1" /><circle cx="56" cy="31.5" r="1" /><circle cx="68" cy="31.5" r="1" />
        </g>
      </g>
    ),
  },
  eyepatch: {
    layer: 'front',
    render: () => (
      <g>
        <L d="M27 38 L73 56" w={2.4} />
        <O d="M53 43 Q61 41 67 44 Q68 52 60 55 Q53 54 53 48 Z" fill="#1D2240" />
        <path d="M56 45 L59 44" stroke={WHITE} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </g>
    ),
  },
  vrHeadset: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-vr`;
      return (
        <g>
          <Grad id={g} stops={[[0, BRAND.pink], [0.5, BRAND.purple], [1, BRAND.cyan]]} x2="1" y2="0" />
          <L d="M26 46 Q24 34 30 32 M74 46 Q76 34 70 32" w={3} />
          <O d="M28 41 Q28 38 32 38 L68 38 Q72 38 72 41 L72 55 Q72 58 68 58 L56 58 Q50 54 44 58 L32 58 Q28 58 28 55 Z" fill="#E9ECF5" />
          <rect x="32" y="41" width="36" height="10" rx="3" fill={`url(#${g})`} stroke={INK} strokeWidth="1" />
          <path d="M34 43.5 L44 43.5" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    },
  },
  // ── epic ──
  frogHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="acc" d="M24 32 Q22 12 50 11 Q78 12 76 32 Q50 27 24 32 Z" fill="#5FCB4E">
          <ellipse cx="40" cy="16" rx="5" ry="2" fill={WHITE} opacity="0.5" transform="rotate(-18 40 16)" />
        </Shaded>
        {[36, 64].map(x => (
          <g key={x}>
            <circle cx={x} cy="11" r="7" fill="#5FCB4E" stroke={INK} strokeWidth={LINE} />
            <circle cx={x} cy="11" r="4.4" fill={WHITE} stroke={INK} strokeWidth="1" />
            <circle cx={x + 0.6} cy="11.6" r="2.4" fill={INK} />
            <circle cx={x - 0.4} cy="10.4" r="0.9" fill={WHITE} />
          </g>
        ))}
        <path d="M40 24 Q50 29 60 24" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="33" cy="25" r="2" fill="#FF8FB8" opacity="0.8" />
        <circle cx="67" cy="25" r="2" fill="#FF8FB8" opacity="0.8" />
        <O d="M44 8 L44.5 1.5 L47.5 4.5 L50 0 L52.5 4.5 L55.5 1.5 L56 8 Q50 7 44 8 Z" fill={GOLD} sw={DETAIL} />
        <Sparkle x={58} y={0} r={2.2} fill={BRAND.goldLight} cls="av-tw" />
      </g>
    ),
  },
  butterflyWings: {
    layer: 'back',
    render: ctx => {
      const g = `${ctx.uid}-bw`;
      const up = 'M42 58 Q30 18 10 16 Q-2 22 4 44 Q10 60 42 64 Z';
      const lo = 'M42 66 Q20 66 10 80 Q12 96 28 92 Q40 84 44 68 Z';
      return (
        <g className="av-float">
          <Grad id={g} stops={[[0, '#FF7AE0'], [0.5, BRAND.purple], [1, BRAND.cyan]]} x2="1" y2="1" />
          {[up, lo, mirror(up), mirror(lo)].map(d => <O key={d} d={d} fill={`url(#${g})`} />)}
          <g fill={WHITE} opacity="0.85">
            <circle cx="14" cy="32" r="2.4" /><circle cx="86" cy="32" r="2.4" /><circle cx="22" cy="44" r="1.6" /><circle cx="78" cy="44" r="1.6" /><circle cx="20" cy="84" r="1.6" /><circle cx="80" cy="84" r="1.6" />
          </g>
          <Sparkle x={10} y={30} r={2.6} cls="av-tw" />
        </g>
      );
    },
  },
  iceCrown: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-ice`;
      return (
        <g>
          <Grad id={g} stops={[[0, '#FFFFFF'], [0.45, '#BDF3FF'], [1, '#4CC3E6']]} />
          <O d="M28 28 L26 12 L34 18 L38 2 L44 16 L50 -2 L56 16 L62 2 L66 18 L74 12 L72 28 Q50 23 28 28 Z" fill={`url(#${g})`} />
          <g stroke={WHITE} strokeWidth="0.9" opacity="0.9">
            <path d="M38 6 L38 18 M50 2 L50 18 M62 6 L62 18" />
          </g>
          <circle cx="50" cy="22" r="2.2" fill="#7FE7FF" stroke={INK} strokeWidth="0.8" />
          <Sparkle x={33} y={8} r={2.4} cls="av-tw" />
          <Sparkle x={70} y={6} r={1.8} cls="av-tw" delay={0.7} />
        </g>
      );
    },
  },
  wizardHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="acc" d="M30 28 Q36 16 44 4 Q52 -6 66 -2 Q58 2 58 10 Q62 20 70 28 Q50 24 30 28 Z" fill="#5A3FD1">
          <g fill={BRAND.gold}>
            <path d="M46 12 L47 14.5 L49.6 14.6 L47.6 16.2 L48.3 18.8 L46 17.3 L43.7 18.8 L44.4 16.2 L42.4 14.6 L45 14.5 Z" />
            <circle cx="56" cy="22" r="1.1" /><circle cx="40" cy="22" r="0.9" />
          </g>
        </Shaded>
        <O d="M18 29 Q50 20 82 29 Q82 34 74 34 Q50 29 26 34 Q18 34 18 29 Z" fill="#4630AE" />
        <Sparkle x={66} y={-2} r={2.4} fill={BRAND.goldLight} cls="av-tw" />
      </g>
    ),
  },
  astronaut: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-ast`;
      return (
        <g>
          <Grad id={g} stops={[[0, '#C8F4FF'], [1, '#6FD8F2']]} />
          <path d="M18 50 Q18 8 50 8 Q82 8 82 50 Q82 80 50 82 Q18 80 18 50 Z M26 50 Q26 76 50 76 Q74 76 74 50 Q74 16 50 16 Q26 16 26 50 Z" fill="#E9ECF5" stroke={INK} strokeWidth="1.9" fillRule="evenodd" />
          <path d="M26 50 Q26 16 50 16 Q74 16 74 50 Q74 76 50 76 Q26 76 26 50 Z" fill={`url(#${g})`} opacity="0.28" />
          <path d="M32 26 Q40 19 50 19" stroke={WHITE} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.9" />
          <rect x="44" y="78" width="12" height="5" rx="1.5" fill={BRAND.pink} stroke={INK} strokeWidth="1" />
          <circle cx="22" cy="50" r="2" fill={BRAND.lime} stroke={INK} strokeWidth="0.8" />
        </g>
      );
    },
  },
  angelWings: {
    layer: 'back',
    render: () => (
      <g className="av-float">
        <Wing d={WING_L} fill="#FFFFFF" feather={WING_L_FEATHER} />
        <Wing d={mirror(WING_L)} fill="#FFFFFF" feather={mirror(WING_L_FEATHER)} />
        <Sparkle x={8} y={28} r={2.4} fill={BRAND.goldLight} cls="av-tw" />
      </g>
    ),
  },
  demonWings: {
    layer: 'back',
    render: () => {
      const d = 'M36 78 Q18 76 6 62 L10 56 Q4 48 6 34 L14 44 Q14 34 20 24 L24 38 Q28 28 36 24 Q34 46 42 66 Z';
      return (
        <g className="av-float">
          <O d={d} fill="#3A1D5C" />
          <O d={mirror(d)} fill="#3A1D5C" />
          <path d="M10 56 Q24 60 36 70 M14 44 Q26 54 38 64 M24 38 Q30 50 40 60" stroke="#8C4BD9" strokeWidth="1" fill="none" />
          <path d={mirror('M10 56 Q24 60 36 70 M14 44 Q26 54 38 64 M24 38 Q30 50 40 60')} stroke="#8C4BD9" strokeWidth="1" fill="none" />
        </g>
      );
    },
  },
  cyberpunkVisor: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-cv`;
      return (
        <g>
          <Grad id={g} stops={[[0, BRAND.cyan], [0.5, BRAND.purple], [1, BRAND.pink]]} x2="1" y2="0" />
          <O d="M25 42 Q50 36 75 42 L73 53 Q50 50 27 53 Z" fill={`url(#${g})`} />
          <path d="M28 45 Q50 40 72 45" stroke={WHITE} strokeWidth="1.2" fill="none" opacity="0.8" className="av-glow" />
          <rect x="54" y="45" width="10" height="1.2" fill={BRAND.lime} className="av-glow" />
          <rect x="22" y="44" width="4" height="8" rx="1" fill="#232A45" stroke={INK} strokeWidth="1" />
          <rect x="74" y="44" width="4" height="8" rx="1" fill="#232A45" stroke={INK} strokeWidth="1" />
        </g>
      );
    },
  },
  samurai: {
    layer: 'front',
    render: ctx => (
      <g>
        <O d="M20 36 Q18 24 28 20 L72 20 Q82 24 80 36 Q74 30 66 30 L34 30 Q26 30 20 36 Z" fill="#B3262E" />
        <Shaded ctx={ctx} name="acc" d="M28 26 Q28 8 50 8 Q72 8 72 26 Z" fill="#232A45">
          <path d="M34 12 L66 12 M31 18 L69 18" stroke="#4A557A" strokeWidth="1" />
        </Shaded>
        <Grad id={`${ctx.uid}-sam`} stops={[[0, BRAND.goldLight], [1, GOLD_D]]} />
        <O d="M50 16 Q42 6 34 0 Q42 2 50 10 Q58 2 66 0 Q58 6 50 16 Z" fill={`url(#${ctx.uid}-sam)`} />
        <Sparkle x={36} y={2} r={2} fill={BRAND.goldLight} cls="av-tw" />
        <circle cx="50" cy="18" r="2.4" fill="#E8303F" stroke={INK} strokeWidth="0.9" />
      </g>
    ),
  },
  flamingHalo: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-fhl`;
      return (
        <g className="av-float">
          <Grad id={g} stops={[[0, '#FFE14D'], [1, '#FF5A1F']]} />
          <g className="av-flicker">
            {[34, 42, 50, 58, 66].map((x, i) => (
              <path key={x} d={`M${x - 3} 8 Q${x - 3} ${2 - (i % 2) * 2} ${x} ${-2 - (i % 2) * 3} Q${x + 3} ${2 - (i % 2) * 2} ${x + 3} 8 Z`} fill={`url(#${g})`} stroke={INK} strokeWidth="0.9" />
            ))}
          </g>
          <ellipse cx="50" cy="9" rx="16" ry="4.6" fill="none" stroke={INK} strokeWidth="5" />
          <ellipse cx="50" cy="9" rx="16" ry="4.6" fill="none" stroke="#FF8A1F" strokeWidth="2.8" />
          <path d="M38 7.4 Q44 5 50 5" stroke="#FFF3A6" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    },
  },
  // ── legendary ──
  phoenixCrown: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-phx`;
      return (
        <g>
          <Grad id={g} stops={[[0, '#FFF3A6'], [0.4, '#FFB020'], [1, '#E8303F']]} />
          <g className="av-flicker">
            <O d="M50 22 Q40 14 30 16 Q34 10 42 10 Q34 4 26 6 Q34 -2 44 2 Q44 -4 50 -6 Q56 -4 56 2 Q66 -2 74 6 Q66 4 58 10 Q66 10 70 16 Q60 14 50 22 Z" fill={`url(#${g})`} />
          </g>
          <O d="M30 28 L32 18 Q50 14 68 18 L70 28 Q50 24 30 28 Z" fill={GOLD} />
          <path d="M50 16 L53 20 L50 25 L47 20 Z" fill="#E8303F" stroke={INK} strokeWidth="0.8" />
          <circle cx="38" cy="22.6" r="1.6" fill={BRAND.pink} stroke={INK} strokeWidth="0.7" />
          <circle cx="62" cy="22.6" r="1.6" fill={BRAND.pink} stroke={INK} strokeWidth="0.7" />
          <Sparkle x={74} y={4} r={3} fill="#FFF3A6" cls="av-tw" />
          <Sparkle x={24} y={10} r={2.2} fill="#FFF3A6" cls="av-tw" delay={0.6} />
        </g>
      );
    },
  },
  crystalCrown: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-cry`;
      return (
        <g>
          <Grad id={g} stops={[[0, '#FFFFFF'], [0.3, '#FFB3F0'], [0.65, BRAND.purple], [1, BRAND.cyan]]} x2="1" y2="1" />
          <circle cx="50" cy="12" r="16" fill={BRAND.pink} opacity="0.22" className="av-glow" />
          <O d="M30 28 L28 14 L36 18 L40 4 L46 16 L50 -4 L54 16 L60 4 L64 18 L72 14 L70 28 Q50 24 30 28 Z" fill={`url(#${g})`} />
          <g stroke={WHITE} strokeWidth="0.8" opacity="0.9">
            <path d="M50 -1 L50 20 M40 7 L42 20 M60 7 L58 20" />
          </g>
          <path d="M44 23 L50 19 L56 23 L50 27 Z" fill={BRAND.cyan} stroke={INK} strokeWidth="0.9" />
          <Sparkle x={50} y={-3} r={3} cls="av-tw" />
          <Sparkle x={74} y={12} r={2.4} fill="#FFD6FF" cls="av-tw" delay={0.5} />
          <Sparkle x={25} y={10} r={2} fill={BRAND.cyan} cls="av-tw" delay={1} />
        </g>
      );
    },
  },
  microphone: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-mic`;
      const note = (x: number, y: number) => (
        <g>
          <path d={`M${x} ${y} L${x} ${y - 7} L${x + 4.6} ${y - 8.6} L${x + 4.6} ${y - 1.6}`} fill="none" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <ellipse cx={x - 1.3} cy={y} rx="2.2" ry="1.7" fill={`url(#${g})`} stroke={INK} strokeWidth="0.9" />
          <ellipse cx={x + 3.3} cy={y - 1.6} rx="2.2" ry="1.7" fill={`url(#${g})`} stroke={INK} strokeWidth="0.9" />
        </g>
      );
      return (
        <g>
          <GoldFoil id={g} />
          {/* the handle stays off the face; the gold head is the prize */}
          <O d="M70.5 79 L74 99 L68.6 100 L66 80 Z" fill="#2A3150" />
          <O d="M65.4 76 Q70.5 74.4 75.4 76 L74.8 80.2 Q70.5 79 66 80.2 Z" fill={`url(#${g})`} sw={DETAIL} />
          <g transform="rotate(-14 70.5 67)">
            <O d="M62 66 Q62 56 70.5 56 Q79 56 79 66 Q79 76 70.5 76 Q62 76 62 66 Z" fill={`url(#${g})`} />
            <g stroke={BRAND.goldDeep} strokeWidth="0.7" opacity="0.8">
              <path d="M64 61 L77 61 M63 64.5 L78 64.5 M63 68 L78 68 M64 71.5 L77 71.5" />
              <path d="M66 57.6 L66 74.4 M70.5 56.4 L70.5 75.6 M75 57.6 L75 74.4" />
            </g>
            <rect x="61.6" y="64.6" width="17.8" height="3" rx="1.4" fill={BRAND.pink} stroke={INK} strokeWidth="0.9" />
            <path d="M64.4 60 Q65.4 57.6 68.4 57" stroke={WHITE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </g>
          <g className="av-float">
            {note(84, 44)}
            {note(13, 36)}
          </g>
          <Sparkle x={82} y={58} r={2.8} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={58} y={79} r={1.8} cls="av-tw" delay={0.8} />
        </g>
      );
    },
  },
  earsOut: {
    layer: 'front',
    render: ctx => {
      const g = `${ctx.uid}-elf`;
      const ear = (
        <g>
          <O d="M29.5 44 Q20 38 11 27 Q13 41 19 50 Q23 56 29.5 56.5 Z" fill={ctx.skin} />
          <path d="M26 46 Q19 41 15.6 34 Q17.6 44 22 50" fill="none" stroke={ctx.skinShade} strokeWidth="1.8" strokeLinecap="round" />
          <O d="M17.6 37.6 Q21.4 38.2 24.4 41.6 L22.6 44 Q19.6 41.2 16.4 40.4 Z" fill={`url(#${g})`} sw={DETAIL} />
          <O d="M24 55.4 L26.6 58.8 L24 63.4 L21.4 58.8 Z" fill={BRAND.cyan} sw={DETAIL} />
          <path d="M24 55.4 L21.4 58.8 L24 58.8 Z" fill={WHITE} opacity="0.6" />
        </g>
      );
      return (
        <g>
          <GoldFoil id={g} />
          {ear}
          <Mirror>{ear}</Mirror>
          <Sparkle x={11} y={24} r={2.6} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={89} y={25} r={1.9} cls="av-tw" delay={0.7} />
        </g>
      );
    },
  },
};

