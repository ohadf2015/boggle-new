/**
 * 2026-11 chest drop — heads (base). These parts come out of reward chests
 * (lib/avatar/chestDrops.ts); same kit, same outline and light rules as the
 * rest of the art (see kit.tsx header).
 *
 * All three are epic costume heads: a fixed signature material (steel, star
 * gold, moonstone) so they read the same on every player. The face area
 * (eyes y 49 at x 40/60, mouth y 61.5) always stays inside the shape.
 */
import { BRAND, INK, Sparkle, WHITE, type ArtCtx } from './kit';
import type { HeadDef } from './heads';

/* ── shield: heraldic knight's shield in polished steel, gold rim + rivets ── */
const SHIELD = 'M27 24 Q38.5 19.5 50 23 Q61.5 19.5 73 24 L73 49 Q73 64 50 76 Q27 64 27 49 Z';
const STEEL = '#C3CEDF';

/* ── star: a chubby five-point star, inner radius wide enough for the face ── */
function roundedStar(cx: number, cy: number, R: number, r: number, round: number): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const rad = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  const f = (n: number) => n.toFixed(1);
  const lerp = (p: [number, number], q: [number, number], t: number): [number, number] => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  let d = '';
  pts.forEach((p, i) => {
    const prev = pts[(i + 9) % 10];
    const next = pts[(i + 1) % 10];
    const t = i % 2 === 0 ? round : round * 0.45;
    const a = lerp(p, prev, t);
    const b = lerp(p, next, t);
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])} Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])} `;
  });
  return `${d}Z`;
}
const STAR = roundedStar(50, 50, 33.5, 22, 0.28);
const STAR_GOLD = '#FFD23F';

/* ── moon: a round full moon in pale silver-blue ── */
const MOON = 'M25 47 A25 25 0 1 0 75 47 A25 25 0 1 0 25 47 Z';
const MOON_SILVER = '#DCE5F6';

function Crater({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#A9B8DC" />
      <ellipse cx={cx + rx * 0.18} cy={cy + ry * 0.2} rx={rx * 0.78} ry={ry * 0.72} fill="#BCC9E6" />
      <path d={`M${cx - rx * 0.8} ${cy - ry * 0.35} Q${cx} ${cy - ry * 1.15} ${cx + rx * 0.8} ${cy - ry * 0.35}`} fill="none" stroke="#9FAED3" strokeWidth="0.8" strokeLinecap="round" />
    </g>
  );
}

const gid = (ctx: ArtCtx, name: string) => `${ctx.uid}-${name}`;

export const HEADS_CHEST: Record<string, HeadDef> = {
  // ── epic ──
  shield: {
    d: SHIELD,
    earX: null,
    costume: STEEL,
    noBlush: true,
    hairScale: 1.02,
    inner: ctx => (
      <g>
        <defs>
          <linearGradient id={gid(ctx, 'shs')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F4F8FF" />
            <stop offset="0.45" stopColor={STEEL} />
            <stop offset="0.62" stopColor="#E9EFFA" />
            <stop offset="1" stopColor="#8E9CB6" />
          </linearGradient>
        </defs>
        <path d={SHIELD} fill={`url(#${gid(ctx, 'shs')})`} opacity="0.75" />
        {/* polished-steel glint band */}
        <path d="M27 40 L44 23 L52 23 L27 48 Z" fill={WHITE} opacity="0.35" />
        {/* gold rim (inner half of a fat stroke; the head clip trims the rest) */}
        <path d={SHIELD} fill="none" stroke={INK} strokeWidth="8.6" />
        <path d={SHIELD} fill="none" stroke={BRAND.gold} strokeWidth="6.6" />
        <path d={SHIELD} fill="none" stroke={BRAND.goldLight} strokeWidth="2.6" opacity="0.9" />
        <path d="M29 28 Q38 24.5 47 26" fill="none" stroke={WHITE} strokeWidth="1" strokeLinecap="round" />
        <g fill={BRAND.goldLight} stroke={INK} strokeWidth="0.8">
          {[[31.6, 28], [68.4, 28], [31.4, 40], [68.6, 40], [31.4, 52], [68.6, 52], [37, 64], [63, 64], [50, 71.2]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />
          ))}
        </g>
        <Sparkle x={36} y={33} r={2.6} cls="av-tw" />
      </g>
    ),
  },
  starBase: {
    d: STAR,
    earX: null,
    costume: STAR_GOLD,
    hairScale: 0.94,
    behind: ctx => (
      <g>
        <defs>
          <radialGradient id={gid(ctx, 'stg')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF6A8" stopOpacity="0.9" />
            <stop offset="0.6" stopColor={BRAND.gold} stopOpacity="0.35" />
            <stop offset="1" stopColor={BRAND.gold} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="49" r="44" fill={`url(#${gid(ctx, 'stg')})`} className="av-glow" />
      </g>
    ),
    inner: ctx => (
      <g>
        <defs>
          <radialGradient id={gid(ctx, 'sti')} cx="0.38" cy="0.32" r="0.7">
            <stop offset="0" stopColor="#FFF8C4" />
            <stop offset="0.55" stopColor={STAR_GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={STAR} fill={`url(#${gid(ctx, 'sti')})`} />
        {/* bevel lines from the centre toward each point */}
        <g stroke="#E8A800" strokeWidth="0.9" opacity="0.55" strokeLinecap="round">
          <path d="M50 36 L50 22 M61 45 L77 40.5 M57.5 60.5 L67 73 M42.5 60.5 L33 73 M39 45 L23 40.5" />
        </g>
        <path d="M33 37 Q41 35 46 25" fill="none" stroke={WHITE} strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
        <Sparkle x={57} y={27} r={2.4} cls="av-tw" />
      </g>
    ),
    top: () => (
      <g>
        <Sparkle x={83} y={30} r={2.8} fill="#FFF6A8" cls="av-tw" delay={0.5} />
        <Sparkle x={17} y={66} r={2} cls="av-tw" delay={1.1} />
      </g>
    ),
  },
  moonBase: {
    d: MOON,
    earX: null,
    costume: MOON_SILVER,
    hairScale: 1.12,
    behind: ctx => (
      <g>
        <defs>
          <radialGradient id={gid(ctx, 'mng')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.55" stopColor="#E9F0FF" stopOpacity="0.75" />
            <stop offset="0.8" stopColor="#A9BCFF" stopOpacity="0.3" />
            <stop offset="1" stopColor="#A9BCFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="47" r="40" fill={`url(#${gid(ctx, 'mng')})`} className="av-glow" />
        <circle cx="50" cy="47" r="30.5" fill="none" stroke="#E9F0FF" strokeWidth="1.2" opacity="0.7" />
      </g>
    ),
    inner: ctx => (
      <g>
        <defs>
          <linearGradient id={gid(ctx, 'mns')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="0.5" stopColor={MOON_SILVER} stopOpacity="0" />
            <stop offset="1" stopColor="#9DB0DA" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <path d={MOON} fill={`url(#${gid(ctx, 'mns')})`} />
        <Crater cx={33} cy={36} rx={4.2} ry={3.6} />
        <Crater cx={64} cy={30} rx={3.2} ry={2.7} />
        <Crater cx={69} cy={45} rx={2} ry={1.8} />
        <Crater cx={36} cy={66} rx={2.6} ry={2.1} />
        <Crater cx={60} cy={68.5} rx={1.8} ry={1.4} />
        <Sparkle x={45} y={27} r={2.2} cls="av-tw" />
      </g>
    ),
    top: () => (
      <g>
        <Sparkle x={84} y={22} r={2.6} fill="#E9F0FF" cls="av-tw" delay={0.6} />
        <Sparkle x={15} y={70} r={1.8} fill="#C9D6FF" cls="av-tw" delay={1.2} />
      </g>
    ),
  },
};
