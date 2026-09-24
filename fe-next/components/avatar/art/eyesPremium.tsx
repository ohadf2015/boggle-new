/**
 * Rare / epic / legendary eyes. Rare = a strong idea in flat color;
 * epic = a material (gloss, gradient, glow) + a little motion;
 * legendary = unmistakable showpiece with its own light.
 */
import { BRAND, DETAIL, GoldFoil, INK, L, O, Sparkle, WHITE, tint, type ArtCtx } from './kit';
import { EYE_L, EYE_R, EYE_Y, EyeHeart, EyeStar, OpenEye, type EyeDef } from './eyes';

const BOTH = [EYE_L, EYE_R] as const;

function GlossyDark({ cx, r = 6.4 }: { cx: number; r?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={EYE_Y} rx={r} ry={r * 1.08} fill={INK} stroke={INK} strokeWidth={DETAIL} />
      <circle cx={cx - r * 0.3} cy={EYE_Y - r * 0.36} r={r * 0.36} fill={WHITE} />
      <circle cx={cx + r * 0.36} cy={EYE_Y + r * 0.4} r={r * 0.17} fill={WHITE} />
    </g>
  );
}

export const EYES_PREMIUM: Record<string, EyeDef> = {
  // ── rare ──
  kawaii: {
    blink: true,
    render: () => (
      <g>
        {BOTH.map(cx => <GlossyDark key={cx} cx={cx} />)}
        <Sparkle x={EYE_L + 2.4} y={EYE_Y + 1.6} r={1.6} />
        <Sparkle x={EYE_R + 2.4} y={EYE_Y + 1.6} r={1.6} />
      </g>
    ),
  },
  animeEye: {
    blink: true,
    render: ctx => (
      <g>
        {BOTH.map(cx => {
          const id = `${ctx.uid}-an${cx}`;
          return (
            <g key={cx}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={INK} />
                  <stop offset="0.45" stopColor={ctx.eye} />
                  <stop offset="1" stopColor={tint(ctx.eye, 0.55)} />
                </linearGradient>
              </defs>
              <ellipse cx={cx} cy={EYE_Y + 0.4} rx="5.4" ry="7" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
              <ellipse cx={cx + 0.3} cy={EYE_Y + 1.2} rx="4.2" ry="5.8" fill={`url(#${id})`} />
              <ellipse cx={cx - 1.2} cy={EYE_Y - 1.6} rx="1.7" ry="2.2" fill={WHITE} />
              <circle cx={cx + 1.6} cy={EYE_Y + 3.4} r="0.9" fill={WHITE} />
              <L d={`M${cx - 6.4} ${EYE_Y - 5} Q${cx} ${EYE_Y - 9} ${cx + 6.4} ${EYE_Y - 5}`} w={2.6} />
            </g>
          );
        })}
      </g>
    ),
  },
  confident: {
    blink: true,
    render: ctx => (
      <g>
        <OpenEye ctx={ctx} cx={EYE_L} lid={0.38} lidTilt={-0.8} look={[1.2, 1]} />
        <OpenEye ctx={ctx} cx={EYE_R} lid={0.38} lidTilt={-0.8} look={[1.2, 1]} />
        <L d={`M${EYE_L - 5.8} ${EYE_Y - 1} L${EYE_L - 8.6} ${EYE_Y - 3.4}`} w={2.2} />
        <L d={`M${EYE_R + 5.8} ${EYE_Y - 1} L${EYE_R + 8.6} ${EYE_Y - 3.4}`} w={2.2} />
      </g>
    ),
  },
  cyclops: {
    blink: true,
    render: ctx => <OpenEye ctx={ctx} cx={50} rx={9} ry={9.4} iris={5.6} look={[0.4, 1]} />,
  },
  monocleEye: {
    blink: false,
    render: ctx => (
      <g>
        <OpenEye ctx={ctx} cx={EYE_L} lid={0.2} />
        <OpenEye ctx={ctx} cx={EYE_R} rx={5.8} ry={6.4} />
        <circle cx={EYE_R} cy={EYE_Y} r="8" fill={WHITE} fillOpacity="0.18" stroke={INK} strokeWidth={DETAIL + 1.8} />
        <circle cx={EYE_R} cy={EYE_Y} r="8" fill="none" stroke={BRAND.gold} strokeWidth={DETAIL} />
        <path d={`M${EYE_R + 5} ${EYE_Y + 6} Q${EYE_R + 9} ${EYE_Y + 16} ${EYE_R + 4} ${EYE_Y + 26}`} fill="none" stroke={BRAND.gold} strokeWidth="1" strokeDasharray="1.4 1" />
        <path d={`M${EYE_R - 4} ${EYE_Y - 3} L${EYE_R - 2} ${EYE_Y - 5}`} stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    ),
  },
  laser: {
    blink: false,
    render: () => (
      <g>
        {BOTH.map(cx => (
          <g key={cx}>
            <ellipse cx={cx} cy={EYE_Y} rx="7.4" ry="6.4" fill="#FF2E4D" opacity="0.35" className="av-glow" />
            <ellipse cx={cx} cy={EYE_Y} rx="5.6" ry="4.8" fill="#FF2E4D" stroke={INK} strokeWidth={DETAIL} />
            <ellipse cx={cx} cy={EYE_Y} rx="3" ry="2" fill="#FFD1D8" />
            <L d={`M${cx - 4} ${EYE_Y} L${cx + 4} ${EYE_Y}`} w={0.9} c={WHITE} />
          </g>
        ))}
      </g>
    ),
  },
  hypno: {
    blink: false,
    render: () => (
      <g>
        {BOTH.map(cx => (
          <g key={cx}>
            <circle cx={cx} cy={EYE_Y} r="6.2" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
            <circle cx={cx} cy={EYE_Y} r="4.6" fill="none" stroke={BRAND.purple} strokeWidth="1.3" />
            <circle cx={cx} cy={EYE_Y} r="2.8" fill="none" stroke={BRAND.pink} strokeWidth="1.3" />
            <circle cx={cx} cy={EYE_Y} r="1.1" fill={INK} />
          </g>
        ))}
      </g>
    ),
  },
  // ── epic ──
  heartEye: {
    blink: false,
    render: ctx => {
      const g = `${ctx.uid}-he`;
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FF9CC8" />
              <stop offset="1" stopColor="#E0105E" />
            </linearGradient>
          </defs>
          {BOTH.map(cx => (
            <g key={cx} className="av-pulse">
              <EyeHeart cx={cx} cy={EYE_Y + 0.4} s={6.2} fill={`url(#${g})`} />
              <ellipse cx={cx - 2.6} cy={EYE_Y - 2.2} rx="1.8" ry="1.1" fill={WHITE} transform={`rotate(-30 ${cx - 2.6} ${EYE_Y - 2.2})`} />
            </g>
          ))}
          <EyeHeart cx={71} cy={38} s={2} fill="#FF7AB0" />
          <EyeHeart cx={29} cy={40} s={1.5} fill="#FF7AB0" />
        </g>
      );
    },
  },
  starEye: {
    blink: false,
    render: ctx => {
      const g = `${ctx.uid}-se`;
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF6A8" />
              <stop offset="1" stopColor="#FFA400" />
            </linearGradient>
          </defs>
          {BOTH.map(cx => (
            <g key={cx}>
              <circle cx={cx} cy={EYE_Y} r="6.4" fill={INK} stroke={INK} strokeWidth={DETAIL} />
              <EyeStar cx={cx} cy={EYE_Y + 0.3} r={5.6} fill={`url(#${g})`} />
              <circle cx={cx - 1.4} cy={EYE_Y - 1.4} r="0.9" fill={WHITE} />
            </g>
          ))}
          <Sparkle x={69} y={40} r={2.2} fill="#FFF6A8" cls="av-tw" />
          <Sparkle x={31} y={57} r={1.6} fill="#FFF6A8" cls="av-tw" delay={0.6} />
        </g>
      );
    },
  },
  flame: {
    blink: false,
    render: ctx => {
      const g = `${ctx.uid}-fl`;
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#FFE14D" />
              <stop offset="0.55" stopColor="#FF8A1F" />
              <stop offset="1" stopColor="#E8303F" />
            </linearGradient>
          </defs>
          {BOTH.map(cx => (
            <g key={cx}>
              <g className="av-flicker">
                <O d={`M${cx - 5.6} ${EYE_Y + 2} Q${cx - 7} ${EYE_Y - 6} ${cx - 2} ${EYE_Y - 11} Q${cx - 1.6} ${EYE_Y - 6} ${cx + 1} ${EYE_Y - 8} Q${cx + 2} ${EYE_Y - 12} ${cx + 5} ${EYE_Y - 13} Q${cx + 3.6} ${EYE_Y - 7} ${cx + 5.8} ${EYE_Y + 2} Z`} fill={`url(#${g})`} sw={DETAIL} />
              </g>
              <ellipse cx={cx} cy={EYE_Y + 1} rx="5.2" ry="5" fill={WHITE} stroke={INK} strokeWidth={DETAIL} />
              <circle cx={cx + 0.4} cy={EYE_Y + 1.6} r="3.3" fill="#FF6A00" />
              <circle cx={cx + 0.4} cy={EYE_Y + 1.6} r="1.7" fill={INK} />
              <circle cx={cx - 0.8} cy={EYE_Y + 0.4} r="1" fill={WHITE} />
            </g>
          ))}
        </g>
      );
    },
  },
  galaxy: {
    blink: true,
    render: ctx => {
      const g = `${ctx.uid}-gx`;
      return (
        <g>
          <defs>
            <radialGradient id={g} cx="40%" cy="40%" r="70%">
              <stop offset="0" stopColor="#FF7AE0" />
              <stop offset="0.45" stopColor="#6B3BFF" />
              <stop offset="1" stopColor="#140B3A" />
            </radialGradient>
          </defs>
          {BOTH.map(cx => (
            <g key={cx}>
              <ellipse cx={cx} cy={EYE_Y} rx="6" ry="6.6" fill={`url(#${g})`} stroke={INK} strokeWidth={DETAIL + 0.2} />
              <circle cx={cx + 1.6} cy={EYE_Y + 1.8} r="0.6" fill={WHITE} />
              <circle cx={cx - 2.4} cy={EYE_Y + 2.6} r="0.45" fill={WHITE} />
              <circle cx={cx + 2.6} cy={EYE_Y - 2.4} r="0.45" fill="#AFFFFF" />
              <Sparkle x={cx - 1.8} y={EYE_Y - 2} r={2} cls="av-tw" delay={cx / 40} />
            </g>
          ))}
        </g>
      );
    },
  },
  robot: {
    blink: false,
    render: () => (
      <g>
        <O d="M31 43 L69 43 Q71 43 71 45 L71 54 Q71 56 69 56 L31 56 Q29 56 29 54 L29 45 Q29 43 31 43 Z" fill="#141A33" />
        <g className="av-glow">
          <rect x="35" y="46.4" width="10" height="6" rx="1.6" fill={BRAND.cyan} />
          <rect x="55" y="46.4" width="10" height="6" rx="1.6" fill={BRAND.cyan} />
        </g>
        <rect x="36.4" y="47.4" width="3" height="1.4" fill={WHITE} />
        <rect x="56.4" y="47.4" width="3" height="1.4" fill={WHITE} />
        <g stroke="#0E7FA0" strokeWidth="0.5">
          <path d="M35 50.6 L45 50.6 M55 50.6 L65 50.6" />
        </g>
      </g>
    ),
  },
  void: {
    blink: false,
    render: () => (
      <g>
        {BOTH.map(cx => (
          <g key={cx}>
            <ellipse cx={cx} cy={EYE_Y} rx="7.6" ry="8" fill={BRAND.purple} opacity="0.35" className="av-glow" />
            <ellipse cx={cx} cy={EYE_Y} rx="5.8" ry="6.4" fill="#05030F" stroke={BRAND.purple} strokeWidth="1.4" />
            <circle cx={cx} cy={EYE_Y + 0.4} r="1.3" fill={WHITE} />
          </g>
        ))}
      </g>
    ),
  },
  // ── legendary ──
  infinity: {
    blink: false,
    render: ctx => {
      const g = `${ctx.uid}-inf`;
      const loop = (cx: number) =>
        `M${cx} ${EYE_Y} C${cx - 2} ${EYE_Y - 4} ${cx - 7} ${EYE_Y - 4} ${cx - 7} ${EYE_Y} C${cx - 7} ${EYE_Y + 4} ${cx - 2} ${EYE_Y + 4} ${cx} ${EYE_Y} C${cx + 2} ${EYE_Y - 4} ${cx + 7} ${EYE_Y - 4} ${cx + 7} ${EYE_Y} C${cx + 7} ${EYE_Y + 4} ${cx + 2} ${EYE_Y + 4} ${cx} ${EYE_Y} Z`;
      return (
        <g>
          <defs>
            <linearGradient id={g} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={BRAND.cyan} />
              <stop offset="0.5" stopColor={BRAND.gold} />
              <stop offset="1" stopColor={BRAND.pink} />
            </linearGradient>
          </defs>
          {BOTH.map(cx => (
            <g key={cx}>
              <ellipse cx={cx} cy={EYE_Y} rx="8.6" ry="6" fill={BRAND.gold} opacity="0.3" className="av-glow" />
              <path d={loop(cx)} fill="none" stroke={INK} strokeWidth="4.4" strokeLinejoin="round" />
              <path d={loop(cx)} fill="none" stroke={`url(#${g})`} strokeWidth="2.6" strokeLinejoin="round" />
            </g>
          ))}
          <Sparkle x={70} y={41} r={2.6} fill={BRAND.goldLight} cls="av-tw" />
          <Sparkle x={29} y={57} r={1.8} cls="av-tw" delay={0.8} />
        </g>
      );
    },
  },
  thirdEye: {
    blink: true,
    render: ctx => (
      <g>
        <OpenEye ctx={ctx} cx={EYE_L} lid={0.2} />
        <OpenEye ctx={ctx} cx={EYE_R} lid={0.2} />
      </g>
    ),
    over: ctx => (
      <g>
        <GoldFoil id={`${ctx.uid}-3e`} />
        <circle cx="50" cy="32" r="7.4" fill={BRAND.gold} opacity="0.35" className="av-glow" />
        <O d="M50 24.6 L56.4 32 L50 39.4 L43.6 32 Z" fill={`url(#${ctx.uid}-3e)`} />
        <ellipse cx="50" cy="32" rx="3.6" ry="4" fill={WHITE} stroke={INK} strokeWidth="1" />
        <circle cx="50" cy="32.4" r="2.4" fill={BRAND.purple} />
        <circle cx="50" cy="32.4" r="1.1" fill={INK} />
        <circle cx="49.2" cy="31.4" r="0.7" fill={WHITE} />
        <Sparkle x={59} y={25} r={2} fill={BRAND.goldLight} cls="av-tw" />
        <Sparkle x={40.5} y={27} r={1.5} cls="av-tw" delay={0.9} />
      </g>
    ),
  },
};
