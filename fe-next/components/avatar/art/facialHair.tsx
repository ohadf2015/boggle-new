/**
 * Facial hair (male only), drawn under the mouth so the smile always reads.
 * Common beards take the hair color; epic beards are materials (magic, fire).
 */
import type { ReactNode } from 'react';
import { BRAND, DETAIL, INK, O, Shaded, Sparkle, WHITE, tint, type ArtCtx } from './kit';

type Part = (ctx: ArtCtx) => ReactNode;

const STACHE = 'M41.5 59.4 Q45.5 55.2 50 57.4 Q54.5 55.2 58.5 59.4 Q55 60.6 50 59 Q45 60.6 41.5 59.4 Z';
const JAW = 'M28.5 50 L31.5 50 Q33 64 42 66.5 Q50 63.5 58 66.5 Q67 64 68.5 50 L71.5 50 Q72.5 73 50 76 Q27.5 73 28.5 50 Z';
const FULL = 'M28 48 L31.5 48 Q33 60 41 64.5 Q50 60.5 59 64.5 Q67 60 68.5 48 L72 48 Q74 70 64 78 Q57 84 50 84 Q43 84 36 78 Q26 70 28 48 Z';

function Stache({ ctx, name }: { ctx: ArtCtx; name: string }) {
  return <Shaded ctx={ctx} name={name} d={STACHE} fill={ctx.hair} shadeColor={ctx.hairShade} dx={0.8} dy={1} sw={DETAIL} />;
}

export const FACIAL_HAIR: Record<string, Part> = {
  none: () => null,
  stubble: ctx => (
    <g>
      <path d="M29 52 Q29 72 50 73.5 Q71 72 71 52 Q67 66 50 67.5 Q33 66 29 52 Z" fill={ctx.hairShade} opacity="0.32" />
      <g fill={ctx.hairShade} opacity="0.7">
        <circle cx="36" cy="64" r="0.5" /><circle cx="40" cy="68" r="0.5" /><circle cx="45" cy="70" r="0.5" />
        <circle cx="55" cy="70" r="0.5" /><circle cx="60" cy="68" r="0.5" /><circle cx="64" cy="64" r="0.5" /><circle cx="50" cy="71" r="0.5" />
      </g>
    </g>
  ),
  mustache: ctx => <Stache ctx={ctx} name="fh" />,
  goatee: ctx => (
    <g>
      <Shaded ctx={ctx} name="fh" d="M44.5 66 Q50 64 55.5 66 Q55.5 73.5 50 76 Q44.5 73.5 44.5 66 Z" fill={ctx.hair} shadeColor={ctx.hairShade} dx={1} dy={1.2} />
      <Stache ctx={ctx} name="fh2" />
    </g>
  ),
  shortBeard: ctx => (
    <g>
      <Shaded ctx={ctx} name="fh" d={JAW} fill={ctx.hair} shadeColor={ctx.hairShade} dx={1.4} dy={1.6} />
      <Stache ctx={ctx} name="fh2" />
    </g>
  ),
  fullBeard: ctx => (
    <g>
      <Shaded ctx={ctx} name="fh" d={FULL} fill={ctx.hair} shadeColor={ctx.hairShade} dx={1.8} dy={2}>
        <path d="M36 70 Q40 76 45 78" stroke={ctx.hairLight} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
      </Shaded>
      <Stache ctx={ctx} name="fh2" />
    </g>
  ),
  chinStrap: ctx => (
    <O d="M28.5 50 L31 50 Q33 69 50 71 Q67 69 69 50 L71.5 50 Q72 74 50 75.5 Q28 74 28.5 50 Z" fill={ctx.hair} sw={DETAIL} />
  ),
  // ── rare ──
  handlebar: ctx => (
    <Shaded
      ctx={ctx}
      name="fh"
      d="M50 57.2 Q55 55 59 58 Q63 60.5 65 57 Q66.5 54 64 53 Q67.5 52.5 67.5 56.5 Q67 62 60 61.2 Q54 60.4 50 59.2 Q46 60.4 40 61.2 Q33 62 32.5 56.5 Q32.5 52.5 36 53 Q33.5 54 35 57 Q37 60.5 41 58 Q45 55 50 57.2 Z"
      fill={ctx.hair}
      shadeColor={ctx.hairShade}
      dx={0.8}
      dy={1}
      sw={DETAIL}
    >
      <path d="M44 57.6 Q47 56.4 49 57.2" stroke={ctx.hairLight} strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </Shaded>
  ),
  vanDyke: ctx => (
    <g>
      <Shaded ctx={ctx} name="fh" d="M44 66.5 Q50 64.5 56 66.5 Q55 76 50 81 Q45 76 44 66.5 Z" fill={ctx.hair} shadeColor={ctx.hairShade} dx={1} dy={1.2}>
        <path d="M47 69 L49 77" stroke={ctx.hairLight} strokeWidth="0.9" strokeLinecap="round" />
      </Shaded>
      <Shaded ctx={ctx} name="fh2" d="M40.5 58.4 Q45 55 50 57.4 Q55 55 59.5 58.4 Q61.5 57 62.5 55 Q62 60 57 60.2 Q53 60.4 50 59 Q47 60.4 43 60.2 Q38 60 37.5 55 Q38.5 57 40.5 58.4 Z" fill={ctx.hair} shadeColor={ctx.hairShade} dx={0.6} dy={0.8} sw={DETAIL} />
    </g>
  ),
  trimmedBeard: ctx => (
    <g>
      <Shaded ctx={ctx} name="fh" d="M28.5 48 L31 48 L33 58 Q36 64.5 42 66 Q50 63.5 58 66 Q64 64.5 67 58 L69 48 L71.5 48 Q72.5 72 50 77.5 Q27.5 72 28.5 48 Z" fill={ctx.hair} shadeColor={ctx.hairShade} dx={1.4} dy={1.6}>
        <path d="M32 58 Q35 68 44 72" stroke={ctx.hairLight} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.8" />
      </Shaded>
      <Stache ctx={ctx} name="fh2" />
    </g>
  ),
  // ── epic ──
  wizardBeard: ctx => {
    const g = `${ctx.uid}-wiz`;
    return (
      <g>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint(ctx.hair, 0.45)} />
            <stop offset="1" stopColor={WHITE} />
          </linearGradient>
        </defs>
        <Shaded ctx={ctx} name="fh" d="M28 48 L31.5 48 Q33 60 41 64 Q50 60 59 64 Q67 60 68.5 48 L72 48 Q76 72 66 86 Q60 96 56 104 L50 96 L44 104 Q40 96 34 86 Q24 72 28 48 Z" fill={`url(#${g})`} shadeColor="#C9D4F2" dx={1.8} dy={2}>
          <path d="M40 72 Q42 84 46 94 M58 72 Q57 84 54 94" stroke="#AFC0EA" strokeWidth="1" fill="none" strokeLinecap="round" />
        </Shaded>
        <Shaded ctx={ctx} name="fh2" d={STACHE} fill={WHITE} shadeColor="#C9D4F2" dx={0.8} dy={1} sw={DETAIL} />
        <Sparkle x={36} y={86} r={2.6} fill={BRAND.cyan} cls="av-tw" />
        <Sparkle x={62} y={92} r={2} fill={BRAND.lime} cls="av-tw" delay={0.8} />
      </g>
    );
  },
  braidedBeard: ctx => (
    <g>
      <Shaded ctx={ctx} name="fh" d={FULL} fill={ctx.hair} shadeColor={ctx.hairShade} dx={1.8} dy={2} />
      {[84, 89.5, 95].map((y, i) => (
        <ellipse key={y} cx="50" cy={y} rx="4.4" ry="3.4" fill={i % 2 ? ctx.hairShade : ctx.hair} stroke={INK} strokeWidth={DETAIL} />
      ))}
      <rect x="45.4" y="86.2" width="9.2" height="2.2" rx="1" fill={BRAND.gold} stroke={INK} strokeWidth="0.8" />
      <rect x="45.4" y="97.4" width="9.2" height="2.2" rx="1" fill={BRAND.gold} stroke={INK} strokeWidth="0.8" />
      <Sparkle x={56} y={86} r={1.8} fill={BRAND.goldLight} cls="av-tw" />
      <Stache ctx={ctx} name="fh2" />
    </g>
  ),
  flameBeard: ctx => {
    const g = `${ctx.uid}-fire`;
    return (
      <g>
        <defs>
          <linearGradient id={g} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFE14D" />
            <stop offset="0.5" stopColor="#FF8A1F" />
            <stop offset="1" stopColor="#E8303F" />
          </linearGradient>
        </defs>
        <g className="av-flicker">
          <O d="M28 48 L31.5 48 Q33 60 41 64 Q50 60 59 64 Q67 60 68.5 48 L72 48 Q75 66 68 76 Q70 84 64 88 Q63 82 59 84 Q58 94 50 98 Q42 94 41 84 Q37 82 36 88 Q30 84 32 76 Q25 66 28 48 Z" fill={`url(#${g})`} />
        </g>
        <path d="M44 74 Q46 82 50 86 Q54 82 56 74 Q52 78 50 72 Q48 78 44 74 Z" fill="#FFF3A6" />
        <O d={STACHE} fill="#FF8A1F" sw={DETAIL} />
      </g>
    );
  },
};
