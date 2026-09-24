/**
 * Mouths, centred at (50, 61.5). Common mouths are flat ink shapes with a
 * tongue/teeth fill; rare+ add materials (gold, neon, glitch).
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, INK, L, O, Sparkle, WHITE, type ArtCtx } from './kit';

type Part = (ctx: ArtCtx) => ReactNode;

const TONGUE = '#FF6F8E';
const MOUTH_DARK = '#5B1830';
const LIP = '#E0245E';

/** Open "D" mouth with teeth band + tongue. */
function OpenMouth({ w = 7, h = 6.5, teeth = true, id }: { w?: number; h?: number; teeth?: boolean; id: string }) {
  const d = `M${50 - w} 59.5 Q50 61 ${50 + w} 59.5 Q${50 + w * 0.9} ${59.5 + h} 50 ${59.5 + h} Q${50 - w * 0.9} ${59.5 + h} ${50 - w} 59.5 Z`;
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={MOUTH_DARK} />
      <g clipPath={`url(#${id})`}>
        {teeth && <rect x={50 - w} y="58" width={w * 2} height="3.6" fill={WHITE} />}
        <ellipse cx="50" cy={59.5 + h} rx={w * 0.6} ry={h * 0.45} fill={TONGUE} />
      </g>
      <path d={d} fill="none" stroke={INK} strokeWidth={DETAIL + 0.3} strokeLinejoin="round" />
    </g>
  );
}

export const MOUTHS: Record<string, Part> = {
  smile: () => <L d="M44 60 Q50 65.5 56 60" w={2.1} />,
  grin: ctx => <OpenMouth id={`${ctx.uid}-m`} />,
  smirk: () => <L d="M44.5 61.5 Q51 63.5 56.5 58.6" w={2.1} />,
  oh: () => (
    <g>
      <ellipse cx="50" cy="62" rx="3" ry="3.6" fill={MOUTH_DARK} stroke={INK} strokeWidth={DETAIL + 0.3} />
      <ellipse cx="50" cy="63.8" rx="1.8" ry="1.2" fill={TONGUE} />
    </g>
  ),
  flat: () => <L d="M45 61.5 L55 61.5" w={2.1} />,
  frown: () => <L d="M44.5 63.5 Q50 58.5 55.5 63.5" w={2.1} />,
  pout: () => (
    <g>
      <O d="M46.5 61 Q48.3 59 50 60.4 Q51.7 59 53.5 61 Q52 64 50 63.4 Q48 64 46.5 61 Z" fill={TONGUE} sw={DETAIL} />
    </g>
  ),
  tongue: () => (
    <g>
      <O d="M48 61.6 L52.8 61.6 L52.8 64.4 Q50.4 67.6 48 64.4 Z" fill={TONGUE} sw={DETAIL} />
      <L d="M50.4 62.2 L50.4 64.6" w={0.7} c="#D94A6C" />
      <L d="M44 60 Q50 64.4 56 60" w={2.1} />
    </g>
  ),
  kiss: () => (
    <g>
      <O d="M47.6 59.6 Q50 58 51.2 60.2 Q53 60.8 51.4 61.8 Q53 63.2 50.8 64.2 Q49.2 64.2 48.6 62.6 Q47 62.2 47.6 59.6 Z" fill={LIP} sw={DETAIL} />
    </g>
  ),
  teeth: ctx => (
    <g>
      <OpenMouth id={`${ctx.uid}-m`} w={8} h={5.2} />
      <g stroke={INK} strokeWidth="0.55">
        <path d="M46.5 59.9 L46.5 63.3 M50 60.2 L50 63.6 M53.5 59.9 L53.5 63.3" />
      </g>
    </g>
  ),
  cat: () => <L d="M44.5 60 Q47.25 63.8 50 60.6 Q52.75 63.8 55.5 60" w={2} />,
  braces: ctx => (
    <g>
      <OpenMouth id={`${ctx.uid}-m`} w={7.6} h={5.6} />
      <L d="M43.4 60.8 L56.6 60.8" w={1.1} c="#9AA7BD" />
      <g fill="#C9D3E3" stroke={INK} strokeWidth="0.4">
        <rect x="45" y="60" width="1.6" height="1.6" />
        <rect x="49.2" y="60" width="1.6" height="1.6" />
        <rect x="53.4" y="60" width="1.6" height="1.6" />
      </g>
    </g>
  ),
  bubbleGum: () => (
    <g>
      <L d="M44 60.4 Q47 62.6 49 61.8" w={2} />
      <circle cx="53.5" cy="62.5" r="5.2" fill="#FF8FC8" stroke={INK} strokeWidth={DETAIL} />
      <ellipse cx="51.8" cy="60.6" rx="1.6" ry="1" fill={WHITE} opacity="0.8" />
    </g>
  ),
  lipstick: () => (
    <g>
      <O d="M44.5 61 Q47 58.4 50 59.8 Q53 58.4 55.5 61 Q50 66.5 44.5 61 Z" fill={LIP} sw={DETAIL} />
      <L d="M45.4 61.2 Q50 62.6 54.6 61.2" w={0.8} c="#8C0F3A" />
      <ellipse cx="47.6" cy="62.8" rx="1.3" ry="0.6" fill={WHITE} opacity="0.6" />
    </g>
  ),
  // ── rare ──
  fangs: () => (
    <g>
      <L d="M43.6 60 Q50 65.2 56.4 60" w={2.1} />
      <O d="M46 61.6 L47.6 62.4 L46.6 65.2 Z" fill={WHITE} sw={0.9} />
      <O d="M54 61.6 L52.4 62.4 L53.4 65.2 Z" fill={WHITE} sw={0.9} />
    </g>
  ),
  vampire: () => (
    <g>
      <O d="M44 60.4 Q47 58.6 50 59.8 Q53 58.6 56 60.4 Q50 64.6 44 60.4 Z" fill="#7A0F2E" sw={DETAIL} />
      <O d="M46.2 61.4 L47.8 62 L46.8 65.6 Z" fill={WHITE} sw={0.9} />
      <O d="M53.8 61.4 L52.2 62 L53.2 65.6 Z" fill={WHITE} sw={0.9} />
    </g>
  ),
  goldTooth: ctx => (
    <g>
      <OpenMouth id={`${ctx.uid}-m`} w={7.4} h={5.8} />
      <O d="M51 59.9 L54 59.8 L54 62.6 L51 62.6 Z" fill={BRAND.gold} sw={0.6} />
      <Sparkle x={55.6} y={58} r={1.8} fill={BRAND.goldLight} />
    </g>
  ),
  zipper: () => (
    <g>
      <L d="M43.5 61.5 L56.5 61.5" w={2.2} />
      <g stroke="#C9D3E3" strokeWidth="1.1">
        <path d="M45 60.2 L45 62.8 M47.4 60.2 L47.4 62.8 M49.8 60.2 L49.8 62.8 M52.2 60.2 L52.2 62.8" />
      </g>
      <O d="M54 61.2 L57.2 61.2 L57.2 65.6 L54 65.6 Z" fill="#C9D3E3" sw={0.8} />
    </g>
  ),
  blowfish: ctx => (
    <g>
      <circle cx="38" cy="60" r="5" fill={ctx.skinShade} opacity="0.55" />
      <circle cx="62" cy="60" r="5" fill={ctx.skinShade} opacity="0.55" />
      <ellipse cx="50" cy="62" rx="2.2" ry="2" fill={MOUTH_DARK} stroke={INK} strokeWidth={DETAIL} />
    </g>
  ),
  robotMouth: () => (
    <g>
      <O d="M43 58.6 L57 58.6 L57 65 L43 65 Z" fill="#20283F" sw={DETAIL} />
      <g fill={BRAND.lime}>
        <rect x="44.6" y="61" width="1.6" height="2.4" />
        <rect x="47.4" y="60" width="1.6" height="4.4" />
        <rect x="50.2" y="60.6" width="1.6" height="3.2" />
        <rect x="53" y="59.8" width="1.6" height="4.8" />
      </g>
    </g>
  ),
  // ── epic ──
  neonSmile: () => (
    <g className="av-glow">
      <path d="M42.6 59.4 Q50 67.4 57.4 59.4" fill="none" stroke={BRAND.pink} strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <path d="M42.6 59.4 Q50 67.4 57.4 59.4" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M42.6 59.4 Q50 67.4 57.4 59.4" fill="none" stroke={BRAND.pink} strokeWidth="2" strokeLinecap="round" />
      <path d="M44.6 60.6 Q50 65 55.4 60.6" fill="none" stroke={WHITE} strokeWidth="0.7" strokeLinecap="round" />
    </g>
  ),
  dragon: ctx => (
    <g>
      <OpenMouth id={`${ctx.uid}-m`} w={7.4} h={6.4} teeth={false} />
      <O d="M44.6 59.8 L46.6 59.8 L45.6 62.6 Z" fill={WHITE} sw={0.7} />
      <O d="M55.4 59.8 L53.4 59.8 L54.4 62.6 Z" fill={WHITE} sw={0.7} />
      <path d="M57 62 Q63 58 66 62 Q62 61 63 64 Q60 62 57 62 Z" fill="#FF8A2A" stroke={INK} strokeWidth="0.8" className="av-flicker" />
      <path d="M58.5 62 Q61.5 60.4 63 61.8 Q61 62 58.5 62 Z" fill="#FFE14D" />
    </g>
  ),
  glitch: () => (
    <g>
      <path d="M44 60 Q50 65.5 56 60" fill="none" stroke={BRAND.cyan} strokeWidth="2.2" strokeLinecap="round" transform="translate(-1.2 0)" />
      <path d="M44 60 Q50 65.5 56 60" fill="none" stroke={BRAND.pink} strokeWidth="2.2" strokeLinecap="round" transform="translate(1.2 0.4)" />
      <path d="M44 60 Q50 65.5 56 60" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="46" y="62.6" width="4" height="1" fill={BRAND.lime} className="av-flicker" />
    </g>
  ),
  grillz: ctx => (
    <g>
      <OpenMouth id={`${ctx.uid}-m`} w={8} h={5.8} />
      <rect x="42.4" y="59.4" width="15.2" height="3" rx="0.6" fill={BRAND.gold} stroke={INK} strokeWidth="0.6" />
      <g fill={WHITE}>
        <path d="M45.4 60.2 L46.2 61 L45.4 61.8 L44.6 61 Z" />
        <path d="M50 60.2 L50.8 61 L50 61.8 L49.2 61 Z" fill="#7FF0FF" />
        <path d="M54.6 60.2 L55.4 61 L54.6 61.8 L53.8 61 Z" />
      </g>
      <Sparkle x={57.6} y={57.6} r={2} cls="av-tw" />
    </g>
  ),
};
