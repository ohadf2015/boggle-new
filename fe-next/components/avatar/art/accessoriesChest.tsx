/**
 * 2026-11 chest drop — accessories (rare). These parts come out of reward chests
 * (lib/avatar/chestDrops.ts); same kit, same outline and light rules as the
 * rest of the art (see kit.tsx header).
 *
 * Rare = one strong idea, flat color plus one gloss. Where a part is "yours"
 * (mask, headset plates, hoop gems) it takes the accessory color via accFill.
 */
import { BRAND, DETAIL, INK, L, LINE, Mirror, O, Shaded, WHITE, shade, shadeFor, tint, type ArtCtx } from './kit';
import { accFill, type AccDef } from './accessories';
import { headFor } from './heads';

const GOLD = BRAND.gold;
const GOLD_D = BRAND.goldDeep;

/** Gentle pendulum swing (SMIL, so it needs no shared CSS); static frame = rest pose. */
function Swing({ ctx, x, y, deg = 9, dur = 2.6 }: { ctx: ArtCtx; x: number; y: number; deg?: number; dur?: number }) {
  if (!ctx.animated) return null;
  return (
    <animateTransform
      attributeName="transform"
      type="rotate"
      values={`${-deg} ${x} ${y};${deg} ${x} ${y};${-deg} ${x} ${y}`}
      dur={`${dur}s`}
      repeatCount="indefinite"
      calcMode="spline"
      keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
    />
  );
}

// ── devil horns: chubby, curled, glossy, on a thin headband ──
const HORN = 'M31 28 Q24 20.5 26.6 12.6 Q28.2 8 32.4 6.4 Q31.4 12.4 35.4 16.8 Q38.8 20.4 43 22.8 Q37 24.2 31 28 Z';

function devilHorn(ctx: ArtCtx, side: string) {
  const red = '#F2384F';
  return (
    <g>
      <Shaded ctx={ctx} name={`dh${side}`} d={HORN} fill={red} shadeColor="#B81F3E" dx={1.4} dy={1.6}>
        <path d="M26.4 18.6 Q32.6 18.4 38.4 21.4" stroke="#B81F3E" strokeWidth="1" fill="none" strokeLinecap="round" />
      </Shaded>
      <path d="M28.6 13.4 Q29.2 10 31.2 8.2" stroke={WHITE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="16" r="0.8" fill={WHITE} />
    </g>
  );
}

// ── domino mask: eye holes cut out (evenodd) so the eyes stay visible ──
const MASK =
  'M25 45.5 Q26.5 39.6 36 40 Q44.5 40.4 50 44.4 Q55.5 40.4 64 40 Q73.5 39.6 75 45.5 Q75.6 53.8 67 56.4 Q58.6 58.2 53.4 53 Q50 50.6 46.6 53 Q41.4 58.2 33 56.4 Q24.4 53.8 25 45.5 Z ' +
  'M33.4 48.6 A6.6 5.6 0 1 0 46.6 48.6 A6.6 5.6 0 1 0 33.4 48.6 Z ' +
  'M53.4 48.6 A6.6 5.6 0 1 0 66.6 48.6 A6.6 5.6 0 1 0 53.4 48.6 Z';

// ── tinfoil hat: a crumpled cone with faceted crinkles ──
const FOIL = 'M27.5 31 L29.5 26.5 L33 24 L35.5 17.5 L39.5 14.5 L41 8 L45.5 4.5 L48.5 -1.5 L52 2 L56.5 3.5 L57.8 9.5 L62 12.5 L63.2 18 L67.5 21.5 L69.5 26 L72.5 31 L67 29.4 L62 31.4 L56 29.2 L50 31.6 L44 29.2 L38 31.4 L33 29.4 Z';

export const ACC_CHEST: Record<string, AccDef> = {
  devilHorns: {
    layer: 'front',
    render: ctx => (
      <g>
        <L d="M26.5 31 Q50 15 73.5 31" w={3.6} />
        <L d="M26.5 31 Q50 15 73.5 31" w={1.8} c="#2A3150" />
        {devilHorn(ctx, 'l')}
        <Mirror>{devilHorn(ctx, 'r')}</Mirror>
      </g>
    ),
  },

  monocle: {
    layer: 'front',
    render: () => (
      <g>
        {/* chain: from the rim's loop down past the cheek to the collar */}
        <path d="M66.6 54.6 Q73.5 64 70 78.5" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M66.6 54.6 Q73.5 64 70 78.5" fill="none" stroke={GOLD} strokeWidth="1.1" strokeLinecap="round" strokeDasharray="0.1 2" />
        <circle cx="70" cy="79" r="1.6" fill={GOLD} stroke={INK} strokeWidth="0.9" />
        {/* glass */}
        <circle cx="60" cy="49" r="7.6" fill="#DDF4FF" fillOpacity="0.28" />
        <path d="M54.6 47.4 Q55.6 43.8 59 43" stroke={WHITE} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.9" />
        {/* rim */}
        <circle cx="60" cy="49" r="7.6" fill="none" stroke={INK} strokeWidth="3.6" />
        <circle cx="60" cy="49" r="7.6" fill="none" stroke={GOLD} strokeWidth="1.7" />
        <path d="M53.6 45.2 A7.6 7.6 0 0 1 57.4 41.8" fill="none" stroke={BRAND.goldLight} strokeWidth="1" strokeLinecap="round" />
        <path d="M66.6 52.6 A7.6 7.6 0 0 1 63.2 55.9" fill="none" stroke={GOLD_D} strokeWidth="1" strokeLinecap="round" />
        <circle cx="66.4" cy="54.4" r="1.5" fill={GOLD} stroke={INK} strokeWidth="0.9" />
      </g>
    ),
  },

  mask: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      const clip = `${ctx.uid}-dmask`;
      return (
        <g>
          {/* knot tails behind the head line */}
          <O d="M74.4 45 L82 41.4 Q83 45 80.4 47.6 Z" fill={shade(c, 0.12)} sw={DETAIL + 0.2} />
          <O d="M74.6 47.4 L81.6 51.8 Q79 54.6 75.6 52 Z" fill={shade(c, 0.22)} sw={DETAIL + 0.2} />
          <clipPath id={clip}>
            <path d={MASK} clipRule="evenodd" />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            <path d={MASK} fill={shadeFor(c)} fillRule="evenodd" />
            <path d={MASK} fill={c} fillRule="evenodd" transform="translate(-1.4 -1.6)" />
            <path d="M28.4 44.6 Q30 41.6 35 41.6" stroke={WHITE} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.75" />
          </g>
          <path d={MASK} fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" fillRule="evenodd" />
        </g>
      );
    },
  },

  sombrero: {
    layer: 'front',
    render: ctx => {
      const straw = '#EAC36A';
      const strawD = '#C99A3E';
      const poms: [number, number, string][] = [[9.5, 33, BRAND.pink], [17.5, 37.4, BRAND.cyan], [82.5, 37.4, BRAND.lime], [90.5, 33, BRAND.pink]];
      return (
        <g>
          {/* brim: wide, edges curled up */}
          <O d="M5 27 Q6 21 13 23.5 Q29 30 50 30 Q71 30 87 23.5 Q94 21 95 27 Q92 37 74 36.4 Q50 40 26 36.4 Q8 37 5 27 Z" fill={straw} />
          <path d="M9 28 Q24 34.6 50 35 Q76 34.6 91 28" fill="none" stroke={strawD} strokeWidth="1" strokeDasharray="2.2 1.6" />
          <path d="M8.5 25.4 Q10 23.4 13 24.4" stroke={WHITE} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
          {/* crown */}
          <Shaded ctx={ctx} name="sbr" d="M33.5 30 Q32 9 41 4.6 Q50 0.6 59 4.6 Q68 9 66.5 30 Q50 33.4 33.5 30 Z" fill={straw} shadeColor={strawD}>
            <path d="M36 12 Q50 9 64 12 M34.6 18 Q50 15 65.4 18" stroke={strawD} strokeWidth="0.9" fill="none" strokeDasharray="2 1.4" />
            <ellipse cx="41" cy="9" rx="3.6" ry="1.6" fill={WHITE} opacity="0.55" transform="rotate(-28 41 9)" />
          </Shaded>
          {/* woven band */}
          <path d="M33.6 22.2 Q50 25.4 66.4 22.2 L66.6 28.6 Q50 31.8 33.4 28.6 Z" fill={BRAND.pink} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
          <path d="M34 25.6 L37 23.4 L40 26 L43 23.8 L46 26.4 L49 24.2 L52 26.4 L55 24 L58 26.2 L61 23.6 L64 25.8 L66.4 23.8" fill="none" stroke={BRAND.lime} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M34 28 Q50 31 66 28" fill="none" stroke={BRAND.cyan} strokeWidth="1" />
          {/* pom-poms hanging off the brim edge */}
          {poms.map(([x, y, col]) => (
            <g key={x}>
              <L d={`M${x} ${y - 3.2} L${x} ${y - 1}`} w={0.9} />
              <circle cx={x} cy={y} r="2.1" fill={col} stroke={INK} strokeWidth="0.9" />
              <circle cx={x - 0.6} cy={y - 0.7} r="0.6" fill={WHITE} opacity="0.85" />
            </g>
          ))}
        </g>
      );
    },
  },

  gamerHeadset: {
    layer: 'front',
    render: ctx => {
      const c = accFill(ctx);
      const shell = '#2E3756';
      const rgb = [BRAND.cyan, BRAND.purple, BRAND.pink, BRAND.lime];
      const cup = 'M16.5 42 L19.5 37.5 L28.5 37.5 L29.5 42 L29.5 57 L27.5 61.5 L19.5 61.5 L16.5 57 Z';
      return (
        <g>
          {/* padded band */}
          <path d="M23 40 Q21 11.5 50 10.5 Q79 11.5 77 40" fill="none" stroke={INK} strokeWidth="7.6" strokeLinecap="round" />
          <path d="M23 40 Q21 11.5 50 10.5 Q79 11.5 77 40" fill="none" stroke={shell} strokeWidth="4.8" strokeLinecap="round" />
          <path d="M30.5 20 Q38 13.6 50 13.2 Q62 13.6 69.5 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          {/* angular cups with an RGB strip */}
          {[false, true].map(flip => {
            const body = (
              <g>
                <O d={cup} fill={shell} />
                <O d="M18.6 43 L21 40 L26.6 40 L27.4 43 L27.4 55.6 L25.8 59 L21 59 L18.6 55.6 Z" fill={c} sw={DETAIL} />
                <g className="av-glow">
                  {rgb.map((col, i) => (
                    <rect key={col} x="15.1" y={42 + i * 4} width="2.2" height="4" fill={col} />
                  ))}
                </g>
                <path d="M15.1 42 L15.1 58" stroke={INK} strokeWidth="0.8" />
                <path d="M20.6 42.6 L22.4 41" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
              </g>
            );
            return flip ? <Mirror key="r">{body}</Mirror> : <g key="l">{body}</g>;
          })}
          {/* mic boom from the left cup to the mouth */}
          <path d="M24 60.5 Q27 68.5 38.5 64.6" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M24 60.5 Q27 68.5 38.5 64.6" fill="none" stroke={shell} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="37.4" y="62" width="5.6" height="4.4" rx="2.2" fill="#3A4466" stroke={INK} strokeWidth={DETAIL} transform="rotate(-16 40.2 64.2)" />
          <circle cx="41.6" cy="63.4" r="0.8" fill={BRAND.lime} className="av-glow" />
        </g>
      );
    },
  },

  graduationCap: {
    layer: 'front',
    render: ctx => {
      const navy = '#232A45';
      return (
        <g>
          {/* skull cap */}
          <Shaded ctx={ctx} name="grad" d="M31 20 L31 30.5 Q50 26 69 30.5 L69 20 Z" fill={navy}>
            <path d="M34 22 L34 29" stroke={WHITE} strokeWidth="1.4" opacity="0.22" />
          </Shaded>
          {/* board, seen slightly from above */}
          <O d="M15 17.5 L50 7 L85 17.5 L50 27 Z" fill="#2E3756" />
          <path d="M50 27 L85 17.5 L85 19.6 L50 29.2 L15 19.6 L15 17.5 Z" fill={navy} stroke={INK} strokeWidth={DETAIL} strokeLinejoin="round" />
          <path d="M23 17.4 L48 10" stroke={WHITE} strokeWidth="1.3" strokeLinecap="round" opacity="0.4" />
          {/* tassel: cord to the corner, then a swinging tuft */}
          <L d="M50 17.2 Q66 16 79.4 18.6" w={2.6} />
          <L d="M50 17.2 Q66 16 79.4 18.6" w={1.1} c={GOLD} />
          <g>
            <Swing ctx={ctx} x={79.4} y={18.6} />
            <L d="M79.4 18.6 L79.6 28" w={2.6} />
            <L d="M79.4 18.6 L79.6 28" w={1.1} c={GOLD} />
            <O d="M77.6 27.4 L81.6 27.4 L83 36.4 Q79.6 38 76.2 36.4 Z" fill={GOLD} sw={DETAIL} />
            <path d="M78.4 30 L78 35.6 M80.6 30 L81.2 35.6" stroke={GOLD_D} strokeWidth="0.8" strokeLinecap="round" />
            <rect x="77.2" y="26.4" width="4.8" height="2.2" rx="1" fill={GOLD_D} stroke={INK} strokeWidth="0.9" />
          </g>
          <circle cx="50" cy="17.2" r="2" fill={GOLD} stroke={INK} strokeWidth="0.9" />
        </g>
      );
    },
  },

  tinfoilHat: {
    layer: 'front',
    render: ctx => (
      <g>
        <Shaded ctx={ctx} name="foil" d={FOIL} fill="#D5DCE8" shadeColor="#97A3B8" dx={2} dy={1.6}>
          {/* facets: darker planes and bright planes */}
          <path d="M41 8 L47 16 L39.5 14.5 Z M57.8 9.5 L52 17 L62 12.5 Z M35.5 17.5 L42 24 L33 24 Z M63.2 18 L57 24.6 L67.5 21.5 Z M47 16 L50 26 L44 24.6 Z" fill="#AEB8CA" />
          <path d="M48.5 -1.5 L47 16 L52 17 L52 2 Z M42 24 L47 16 L44 24.6 Z M57 24.6 L52 17 L56 25.2 Z" fill="#F1F4F9" />
        </Shaded>
        {/* crinkle highlights */}
        <path d="M37.4 21 L39.6 18.6 L41.4 20.2 L43.4 17.6" fill="none" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44.6 10.6 L46.2 8.4 L47.6 9.6" fill="none" stroke={WHITE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M58.6 20.4 L60.2 22.6 L62 21.2" fill="none" stroke={WHITE} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        <path d="M47 16 L50 26 M52 17 L56 25.2 M42 24 L47 16 L52 17 L57 24.6" fill="none" stroke="#7C889E" strokeWidth="0.7" strokeLinejoin="round" />
        {/* crumpled rim */}
        <path d="M28.6 29.4 L33 27.4 L38 29.6 L44 27.4 L50 29.8 L56 27.4 L62 29.6 L67 27.4 L71.4 29.4" fill="none" stroke="#97A3B8" strokeWidth="1" strokeLinejoin="round" />
        <circle cx="48.6" cy="-1" r="0.9" fill={WHITE} />
      </g>
    ),
  },

  earrings: {
    layer: 'neck',
    render: ctx => {
      const ex = headFor(ctx.base).earX ?? 27;
      const gem = accFill(ctx);
      const hoop = (
        <g>
          {/* hangs from the lobe: the top of the hoop hides behind the ear */}
          <circle cx={ex - 2} cy="61.4" r="5.4" fill="none" stroke={INK} strokeWidth="3.4" />
          <circle cx={ex - 2} cy="61.4" r="5.4" fill="none" stroke={GOLD} strokeWidth="1.8" />
          <path d={`M${ex - 6.6} 59 A5.4 5.4 0 0 1 ${ex - 4.6} 56.6`} fill="none" stroke={BRAND.goldLight} strokeWidth="0.9" strokeLinecap="round" />
          <path d={`M${ex - 2} 64.6 L${ex + 0.6} 67.4 L${ex - 2} 70.6 L${ex - 4.6} 67.4 Z`} fill={gem} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M${ex - 2} 64.6 L${ex - 4.6} 67.4 L${ex - 2} 67.4 Z`} fill={tint(gem, 0.6)} />
        </g>
      );
      return (
        <g>
          {hoop}
          <Mirror>{hoop}</Mirror>
        </g>
      );
    },
  },
};
