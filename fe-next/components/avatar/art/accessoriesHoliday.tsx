/**
 * Winter holiday event accessories (Hanukkah "8 Nights", Christmas "12 Gifts").
 * Earned on the event track only (HOLIDAY_PARTS), so like the premium set each
 * has its own material colors instead of the player's accessory tint.
 */
import { BRAND, DETAIL, GoldFoil, INK, L, O, Shaded, Sparkle, WHITE, shade, tint } from './kit';
import type { AccDef } from './accessories';

const BLUE = '#2F6BFF';
const SKY = '#9CC4FF';
const RED = '#E8303F';
const GREEN = '#1FA45A';
const BROWN = '#8A5A2B';
const GOLD = BRAND.gold;

const CANDLE_X = [30, 34.5, 39, 43.5, 48.5, 54.5, 59, 63.5, 68];
const SHAMASH = 4;

function Flame({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y - 4.6} Q${x + 2.2} ${y - 1.6} ${x} ${y} Q${x - 2.2} ${y - 1.6} ${x} ${y - 4.6} Z`} fill="#FF9A1F" stroke={INK} strokeWidth="0.7" />
      <path d={`M${x} ${y - 2.6} Q${x + 0.9} ${y - 1} ${x} ${y - 0.4} Q${x - 0.9} ${y - 1} ${x} ${y - 2.6} Z`} fill="#FFE97A" />
    </g>
  );
}

function StripedScarf({ name, ctx, base, stripe }: { name: string; ctx: Parameters<AccDef['render']>[0]; base: string; stripe: string }) {
  return (
    <g>
      <O d="M55 78 L60 96 L53 97 L50 80 Z" fill={shade(base, 0.12)} />
      <path d="M53.6 84 L58.6 83 M54.8 89 L59.6 88" stroke={stripe} strokeWidth="2" />
      <Shaded ctx={ctx} name={name} d="M37 72 Q50 78 63 72 Q66 76 64 81 Q50 87 36 81 Q34 76 37 72 Z" fill={base}>
        <path d="M41 74 L40 85 M48 76 L47.5 87 M55 76 L55 87 M61 74 L61.5 85" stroke={stripe} strokeWidth="2.6" />
      </Shaded>
    </g>
  );
}

function CandyRim({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={49} r={7} fill={WHITE} fillOpacity={0.2} stroke={INK} strokeWidth={DETAIL + 2} />
      <circle cx={cx} cy={49} r={7} fill="none" stroke={WHITE} strokeWidth={DETAIL + 0.6} />
      <circle cx={cx} cy={49} r={7} fill="none" stroke={RED} strokeWidth={DETAIL + 0.6} strokeDasharray="2.2 2.2" />
      <path d={`M${cx - 3.8} ${48} L${cx - 0.8} ${44.6}`} stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
    </g>
  );
}

export const ACC_HOLIDAY: Record<string, AccDef> = {
  beanieBlue: {
    layer: 'front',
    render: ctx => (
      <g>
        <circle cx="50" cy="7.5" r="4.4" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
        <Shaded ctx={ctx} name="hbb" d="M26 31 Q25 10 50 10 Q75 10 74 31 Z" fill={BLUE}>
          <path d="M25 22 Q50 17 75 22" stroke={WHITE} strokeWidth="2.6" fill="none" />
          <path d="M38 13 L37 30 M50 10 L50 30 M62 13 L63 30" stroke={shade(BLUE, 0.2)} strokeWidth="0.9" />
        </Shaded>
        <O d="M24 29 Q50 25 76 29 L76.5 36 Q50 32 23.5 36 Z" fill={SKY} />
        <path d="M47 14.5 L50 19.6 L53 14.5 Z M47 17.9 L50 12.8 L53 17.9 Z" fill="none" stroke={WHITE} strokeWidth="0.9" />
      </g>
    ),
  },
  scarfBlue: {
    layer: 'neck',
    render: ctx => <StripedScarf name="hsb" ctx={ctx} base={BLUE} stripe={WHITE} />,
  },
  dreidelPin: {
    layer: 'neck',
    render: () => (
      <g>
        <L d="M60 79 L60 81.4" w={1.6} />
        <O d="M56 82 L64 82 L64 89 L60 94 L56 89 Z" fill={BLUE} sw={DETAIL} />
        <path d="M56 85.5 L64 85.5" stroke={tint(BLUE, 0.5)} strokeWidth="0.9" />
        <path d="M58.4 87 L61.6 87 L61.6 89.8 M58.4 87 L58.4 89.8" fill="none" stroke={WHITE} strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="60" cy="79" r="1.4" fill={GOLD} stroke={INK} strokeWidth="0.7" />
      </g>
    ),
  },
  menorahCrown: {
    layer: 'front',
    render: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-hmc`} horizontal />
        <O d="M26 32 Q50 25 74 32 L74 27 Q50 20 26 27 Z" fill={`url(#${ctx.uid}-hmc)`} />
        <path d="M28 28.6 Q50 22.6 72 28.6" fill="none" stroke={BRAND.goldLight} strokeWidth="0.9" />
        {CANDLE_X.map((x, i) => {
          const shamash = i === SHAMASH;
          const y = shamash ? 10 : 15.5;
          const h = (shamash ? 16 : 10.5) - (Math.abs(i - SHAMASH) > 2 ? 0.6 : 0);
          return (
            <g key={x}>
              <rect data-candle={shamash ? 'shamash' : 'light'} x={x - 1.4} y={y} width={2.8} height={h} rx={0.8} fill={shamash ? WHITE : SKY} stroke={INK} strokeWidth="0.8" />
              <Flame x={x} y={y - 0.4} />
            </g>
          );
        })}
        <circle cx="50" cy="28.4" r="1.8" fill={BLUE} stroke={INK} strokeWidth="0.7" />
        <Sparkle x={41} y={6} r={1.8} cls="av-tw" />
        <Sparkle x={62} y={7} r={1.6} cls="av-tw" delay={0.6} />
      </g>
    ),
  },
  santaHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="hsh" d="M27 30 Q28 12 46 8 Q62 5 74 14 Q82 20 84 32 L78 31 Q74 22 68 20 Q72 26 73 30 Z" fill={RED} />
        <circle cx="83" cy="34" r="4.6" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
        <O d="M23.5 28 Q50 23 76.5 28 Q78 33 76.5 36.5 Q50 31.5 23.5 36.5 Q22 33 23.5 28 Z" fill={WHITE} />
        <path d="M30 31 Q31 33 30 34.5 M40 29.5 Q41 31.5 40 33 M60 29.5 Q61 31.5 60 33 M70 31 Q71 33 70 34.5" stroke="#D9DEEA" strokeWidth="1" fill="none" />
      </g>
    ),
  },
  elfHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="heh" d="M27 30 Q36 14 50 4 Q56 0 62 3 Q58 6 60 12 Q68 20 73 30 Z" fill={GREEN}>
          <path d="M33 23 Q50 18 68 23" stroke={shade(GREEN, 0.25)} strokeWidth="1" fill="none" />
        </Shaded>
        <circle cx="62.5" cy="3" r="2.6" fill={GOLD} stroke={INK} strokeWidth="0.9" />
        <O d="M24 28 L30 34 L36 28 L42 34 L50 28 L58 34 L64 28 L70 34 L76 28 L76 36 Q50 32 24 36 Z" fill={RED} />
        <path d="M24 28 L30 34 L36 28 L42 34 L50 28 L58 34 L64 28 L70 34 L76 28" fill="none" stroke={WHITE} strokeWidth="1" />
      </g>
    ),
  },
  antlers: {
    layer: 'front',
    render: () => (
      <g>
        <O d="M34 26 Q30 14 24 8 Q22 12 26 16 Q20 14 16 10 Q16 16 24 19 Q27 22 29 28 Z" fill={BROWN} />
        <O d="M66 26 Q70 14 76 8 Q78 12 74 16 Q80 14 84 10 Q84 16 76 19 Q73 22 71 28 Z" fill={BROWN} />
        <path d="M30 22 Q27 15 24.5 11 M70 22 Q73 15 75.5 11" stroke={tint(BROWN, 0.35)} strokeWidth="1" fill="none" />
        <L d="M27 31 Q50 18 73 31" w={4.4} />
        <L d="M27 31 Q50 18 73 31" w={2.6} c={RED} />
        <circle cx="50" cy="24.4" r="2" fill={GOLD} stroke={INK} strokeWidth="0.7" />
      </g>
    ),
  },
  earmuffs: {
    layer: 'front',
    render: ctx => (
      <g>
        <L d="M25 46 Q22 12 50 11 Q78 12 75 46" w={5.6} />
        <L d="M25 46 Q22 12 50 11 Q78 12 75 46" w={3.2} c={RED} />
        <Shaded ctx={ctx} name="hem1" d="M14 50 Q14 41 22 41 Q30 41 30 50 Q30 59 22 59 Q14 59 14 50 Z" fill={WHITE} shadeColor="#D9DEEA" />
        <Shaded ctx={ctx} name="hem2" d="M70 50 Q70 41 78 41 Q86 41 86 50 Q86 59 78 59 Q70 59 70 50 Z" fill={WHITE} shadeColor="#D9DEEA" />
        <path d="M18 47 Q20 45 22 46 M74 47 Q76 45 78 46" stroke="#C5CCDD" strokeWidth="1" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  scarfXmas: {
    layer: 'neck',
    render: ctx => <StripedScarf name="hsx" ctx={ctx} base={RED} stripe={WHITE} />,
  },
  candyGlasses: {
    layer: 'front',
    render: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-hcg`} horizontal />
        <L d="M33 48 L28 46.5 M67 48 L72 46.5" w={DETAIL + 1.6} />
        <L d="M33 48 L28 46.5 M67 48 L72 46.5" w={DETAIL} c={RED} />
        <L d="M47 48.5 Q50 46.5 53 48.5" w={DETAIL + 1.4} />
        <L d="M47 48.5 Q50 46.5 53 48.5" w={DETAIL} c={`url(#${ctx.uid}-hcg)`} />
        <CandyRim cx={40} />
        <CandyRim cx={60} />
        <circle cx="50" cy="46.6" r="1.4" fill={`url(#${ctx.uid}-hcg)`} stroke={INK} strokeWidth="0.6" />
        <Sparkle x={67} y={41} r={1.8} cls="av-tw" />
        <Sparkle x={33} y={56} r={1.5} cls="av-tw" delay={0.7} />
      </g>
    ),
  },
  goldDreidelPin: {
    layer: 'neck',
    render: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-gdp`} />
        <L d="M60 78.6 L60 81.4" w={1.6} />
        <O d="M55.5 82 L64.5 82 L64.5 89.4 L60 95 L55.5 89.4 Z" fill={`url(#${ctx.uid}-gdp)`} sw={DETAIL} />
        <path d="M55.5 85.6 L64.5 85.6" stroke={BRAND.goldLight} strokeWidth="0.9" />
        <path d="M58.2 87.2 Q61.8 87 61.6 89 Q61.4 90.6 59 90.4 M58.4 87.2 L58.4 88.4" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="60" cy="78.6" r="1.5" fill={WHITE} stroke={INK} strokeWidth="0.7" />
        <Sparkle x={66.5} y={83} r={1.6} cls="av-tw" />
        <Sparkle x={53} y={92} r={1.2} cls="av-tw" delay={0.8} />
      </g>
    ),
  },
  goldOrnament: {
    layer: 'neck',
    render: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-gor`} />
        <L d="M40 76 Q50 84 60 77" w={1} c={GOLD} />
        <rect x="47.6" y="80.4" width="4.8" height="2.8" rx="0.6" fill={GOLD} stroke={INK} strokeWidth="0.7" />
        <circle cx="50" cy="89" r="6.4" fill={`url(#${ctx.uid}-gor)`} stroke={INK} strokeWidth={DETAIL} />
        <path d="M44.2 88 Q50 91.4 55.8 88" fill="none" stroke={RED} strokeWidth="1.3" />
        <path d="M46.4 85.6 Q47.6 84.2 49.4 84" fill="none" stroke={WHITE} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        <Sparkle x={57.5} y={84} r={1.6} cls="av-tw" delay={0.4} />
        <Sparkle x={43} y={94} r={1.2} cls="av-tw" delay={1} />
      </g>
    ),
  },
  goldGeltMedal: {
    layer: 'neck',
    render: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-ggm`} />
        <O d="M40 74 L47 84 L50 82 L53 84 L60 74 L56 74 L50 80 L44 74 Z" fill={BLUE} sw={DETAIL} />
        <circle cx="50" cy="89" r="7" fill={`url(#${ctx.uid}-ggm)`} stroke={INK} strokeWidth={DETAIL} />
        <circle cx="50" cy="89" r="4.6" fill="none" stroke={BRAND.goldLight} strokeWidth="0.9" />
        <path d="M50 86 L52.6 90.5 L47.4 90.5 Z M50 92 L47.4 87.5 L52.6 87.5 Z" fill="none" stroke={BLUE} strokeWidth="0.8" strokeLinejoin="round" />
        <Sparkle x={57.6} y={84.6} r={1.7} cls="av-tw" />
        <Sparkle x={42.4} y={94} r={1.2} cls="av-tw" delay={0.9} />
      </g>
    ),
  },
  goldBell: {
    layer: 'neck',
    render: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-gbl`} />
        <O d="M38 74 Q50 82 62 74 L62 77.4 Q50 85.4 38 77.4 Z" fill={RED} sw={DETAIL} />
        <O d="M45 91.6 Q45 83 50 82.2 Q55 83 55 91.6 L56.6 93 L43.4 93 Z" fill={`url(#${ctx.uid}-gbl)`} sw={DETAIL} />
        <circle cx="50" cy="94.2" r="1.5" fill={GOLD} stroke={INK} strokeWidth="0.7" />
        <path d="M47 86.4 Q47.6 84.6 49 84.2" fill="none" stroke={WHITE} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
        <path d="M45.6 89.6 L54.4 89.6" stroke={GREEN} strokeWidth="1.1" />
        <Sparkle x={58} y={85} r={1.6} cls="av-tw" delay={0.5} />
        <Sparkle x={41.6} y={89} r={1.2} cls="av-tw" delay={1.1} />
      </g>
    ),
  },
};
