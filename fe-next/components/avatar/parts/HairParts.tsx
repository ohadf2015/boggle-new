/** Avatar Hair Parts — viewBox 0 0 100 100. Face: cx=50 cy=52 r=30. */
import { type FC } from 'react';

import { STROKE_OUTER } from './avatarDesignConstants';

const S = STROKE_OUTER;

/**
 * Geometry reference:
 *   Face circle: cx=50, cy=52, r=30
 *   Face top: y=22, Face sides: x=20/80
 *   Hair cap should overlap face top by ~4px → peak around y=18
 *   Cap sides join face at roughly x=20/80, y=32-36
 *   "Hairline" (where forehead meets hair) sits at ~y=28-32
 */

interface HairPartProps {
  fill: string;
  /** Secondary color for bows/ties/beads — defaults to fill if not provided */
  accentColor?: string;
}

function None() {
  return null;
}

function Spiky({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap hugging the head */}
      <path d="M20 36 Q20 22 50 18 Q80 22 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Spikes — taller, more dramatic, wilder angles */}
      <path d="M22 34 L26 -2 L34 24 L40 -8 L50 18 L60 -10 L66 16 L74 -4 L80 34"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Inner spike detail lines */}
      <path d="M34 20 L36 4 M50 14 L52 -2 M66 14 L68 2" stroke="#000" strokeWidth={1} opacity="0.18" />
      <path d="M36 18 L38 2 M52 12 L54 -4 M68 12 L70 0" stroke="#fff" strokeWidth={1.5} opacity="0.2" />
      <path d="M28 26 Q30 16 32 8 M74 26 Q72 16 70 6" stroke="#000" strokeWidth={0.8} opacity="0.14" />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      {/* Main curly volume — organic cloud shape with bumpy edges */}
      <path d="M10 40 C6 32 10 20 22 14 C28 10 36 8 42 10 C46 6 54 6 58 10 C64 8 72 10 78 14 C90 20 94 32 90 40 C94 48 92 58 86 64 C90 72 88 80 82 78 C84 72 82 64 78 58 Q50 32 22 58 C18 64 16 72 18 78 C12 80 10 72 14 64 C8 58 6 48 10 40Z"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Curl texture — bolder S-curves, more of them */}
      <path d="M24 16 C29 11 35 16 32 22 C29 28 23 22 24 16Z" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      <path d="M44 10 C50 5 56 10 53 16 C50 22 44 17 44 10Z" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      <path d="M64 16 C70 11 76 16 73 22 C70 28 64 22 64 16Z" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      {/* Side curl texture — visible bouncy loops */}
      <path d="M12 42 C17 37 21 42 18 48 C15 54 11 48 12 42Z" fill="none" stroke="#000" strokeWidth={1} opacity="0.16" />
      <path d="M88 42 C83 37 79 42 82 48 C85 54 89 48 88 42Z" fill="none" stroke="#000" strokeWidth={1} opacity="0.16" />
      <path d="M14 56 C19 51 23 56 20 62 M86 56 C81 51 77 56 80 62" fill="none" stroke="#000" strokeWidth={1} opacity="0.14" />
      {/* Extra curl loops at crown */}
      <path d="M34 12 C37 8 41 12 39 15 M60 12 C63 8 67 12 65 15" fill="none" stroke="#000" strokeWidth={0.9} opacity="0.15" />
      {/* Highlights */}
      <path d="M28 12 Q40 6 50 8 Q60 6 72 12" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" />
      <path d="M12 36 Q15 30 22 26" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M88 36 Q85 30 78 26" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  return (
    <g>
      {/* Tight cap following head shape */}
      <path d="M22 36 Q22 20 50 16 Q78 20 78 36" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M26 34 Q26 22 50 19 Q74 22 74 34" fill="#fff" opacity="0.06" />
      {/* Dense stubble dots — more dots, varied sizes for realistic texture */}
      {[
        {x:30,y:24},{x:35,y:21},{x:40,y:24},{x:45,y:20},{x:50,y:18},{x:55,y:20},{x:60,y:24},{x:65,y:21},{x:70,y:24},
        {x:28,y:28},{x:33,y:26},{x:38,y:28},{x:43,y:23},{x:48,y:22},{x:53,y:22},{x:58,y:23},{x:63,y:26},{x:68,y:28},{x:72,y:28},
        {x:32,y:31},{x:37,y:30},{x:42,y:27},{x:47,y:25},{x:53,y:25},{x:58,y:27},{x:63,y:30},{x:68,y:31},
        {x:35,y:33},{x:44,y:30},{x:50,y:24},{x:56,y:30},{x:65,y:33},
      ].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2 - (i%4)*0.15} fill="#000" opacity={0.14-(i%3)*0.02} />
      ))}
      <path d="M34 20 Q50 15 66 20" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.14" />
    </g>
  );
}

function Mohawk({ fill }: HairPartProps) {
  return (
    <g>
      {/* Shaved side hints */}
      <path d="M22 36 Q22 26 34 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M78 36 Q78 26 66 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:24,y:32},{x:28,y:28},{x:32,y:26},{x:72,y:28},{x:76,y:32},{x:68,y:26}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25} />
      ))}
      {/* Mohawk strip */}
      <path d="M38 30 L38 0 Q50 -8 62 0 L62 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M44 26 L44 6 M50 24 L50 2 M56 26 L56 6" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M48 24 L48 4 M52 22 L52 2" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Topknot({ fill }: HairPartProps) {
  return (
    <g>
      {/* Thin cap */}
      <path d="M26 34 Q26 22 50 18 Q74 22 74 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun on top — kept inside viewBox */}
      <ellipse cx="50" cy="12" rx="11" ry="10" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Tie/wrap */}
      <ellipse cx="50" cy="20" rx="7" ry="3" fill="#000" opacity="0.25" />
      <ellipse cx="47" cy="8" rx="4" ry="3" fill="#fff" opacity="0.12" />
      <path d="M44 10 Q50 6 56 10 M46 14 Q50 11 54 14" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
    </g>
  );
}

function Ponytail({ fill }: HairPartProps) {
  return (
    <g>
      {/* Hair cap */}
      <path d="M20 36 Q20 18 50 14 Q80 18 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Left side tuck */}
      <path d="M20 36 Q22 30 30 32" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Ponytail flowing right */}
      <path d="M72 28 Q92 20 96 40 Q98 60 88 76 Q84 82 78 72 Q86 54 82 38 Q80 30 76 30"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 36 Q88 48 86 60" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M80 40 Q84 50 82 58 M84 44 Q88 50 86 56" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      {/* Hair tie — wrapped elastic band */}
      <ellipse cx="74" cy="28" rx="5" ry="3" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M71 27 Q74 25 77 27" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.25" />
      <path d="M72 29 Q74 27.5 76 29" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.15" />
    </g>
  );
}

function Combover({ fill }: HairPartProps) {
  return (
    <g>
      {/* Thin see-through base */}
      <path d="M26 36 Q26 28 40 26 Q50 22 60 26 Q74 28 74 36" fill={fill} stroke="#000" strokeWidth={S} opacity="0.35" />
      {/* Swooping combover */}
      <path d="M18 38 Q16 24 28 18 Q40 12 54 16 Q62 20 68 30 Q60 22 48 20 Q34 18 24 30 Q20 36 22 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Side wisps — stroke only to avoid fill artifact on open path */}
      <path d="M18 36 Q18 48 20 54" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M82 36 Q82 48 80 54" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M18 36 Q18 48 20 54 M82 36 Q82 48 80 54" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M26 24 Q30 20 36 18" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M24 28 Q34 18 46 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function Elvis({ fill }: HairPartProps) {
  return (
    <g>
      {/* Full cap */}
      <path d="M20 36 Q20 18 50 14 Q80 18 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Signature pompadour swoop */}
      <path d="M28 32 Q26 10 40 0 Q52 -4 60 6 Q64 16 56 26 Q48 34 38 36"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 10 Q44 0 52 6" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.2" />
      <path d="M34 18 Q42 10 50 14" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
      <path d="M38 14 Q44 6 50 10 M36 20 Q42 14 48 18" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      {/* Sideburns — organic tapered shapes */}
      <path d="M20 36 Q18 36 17 40 Q16 50 18 58 Q20 62 22 58 Q24 50 23 40 Q22 36 20 36Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M80 36 Q82 36 83 40 Q84 50 82 58 Q80 62 78 58 Q76 50 77 40 Q78 36 80 36Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M19 42 Q18 48 19 54 M81 42 Q82 48 81 54" stroke="#000" strokeWidth={0.5} opacity="0.15" />
    </g>
  );
}

function Ramen({ fill }: HairPartProps) {
  return (
    <g>
      {/* Bowl (bottom half) */}
      <path d="M20 28 Q20 38 50 40 Q80 38 80 28" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Bowl (top half) */}
      <path d="M20 28 Q50 22 80 28" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Broth fill */}
      <path d="M24 28 Q50 24 76 28 Q76 34 50 36 Q24 34 24 28Z" fill="#F5DEB3" stroke="none" />
      {/* Noodle waves */}
      <path d="M28 30 Q32 26 36 30 Q40 34 44 30 Q48 26 52 30 Q56 34 60 30 Q64 26 68 30 Q72 34 76 30" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" />
      <path d="M32 32 Q36 28 40 32 Q44 36 48 32 Q52 28 56 32 Q60 36 64 32 Q68 28 72 32" fill="none" stroke={fill} strokeWidth={1.2} opacity="0.4" strokeLinecap="round" />
      {/* Egg */}
      <ellipse cx="64" cy="28" rx="5" ry="4" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="64" cy="28" r="2" fill="#FFD700" />
      <ellipse cx="63" cy="27" rx="0.8" ry="0.5" fill="#fff" opacity="0.4" />
      {/* Chopsticks */}
      <line x1="42" y1="26" x2="36" y2="4" stroke="#8B6E4E" strokeWidth={2.2} strokeLinecap="round" />
      <line x1="46" y1="26" x2="44" y2="4" stroke="#8B6E4E" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M35 6 L37 4 M43 6 L45 4" stroke="#fff" strokeWidth={0.8} opacity="0.3" />
      {/* Steam */}
      <path d="M32 20 Q30 14 33 8" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.35" />
      <path d="M52 18 Q50 12 53 6" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.35" />
      <path d="M42 16 Q40 10 42 4" fill="none" stroke="#ddd" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Long({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M12 36 Q12 14 50 10 Q88 14 88 36 L90 68 Q88 84 80 88 Q76 92 73 82 L72 44 Q50 30 28 44 L27 82 Q24 92 20 88 Q12 84 10 68Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M20 44 Q20 60 22 76 M80 44 Q80 60 78 76" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M26 40 Q26 56 26 72 M74 40 Q74 56 74 72" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 20 Q42 14 50 12 Q58 14 68 20" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  return (
    <g>
      {/* Fuller bob — more volume, rounder sides, visible curl at tips */}
      <path d="M10 36 Q10 14 50 10 Q90 14 90 36 L90 60 Q88 68 80 64 Q78 58 78 42 Q50 24 22 42 Q22 58 20 64 Q12 68 10 60Z"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Volume strand lines */}
      <path d="M16 42 Q16 52 18 60 M84 42 Q84 52 82 60" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      <path d="M22 40 Q22 50 24 58 M78 40 Q78 50 76 58" stroke="#fff" strokeWidth={1.2} opacity="0.14" />
      {/* Curl tips at the ends */}
      <path d="M18 60 Q20 66 26 62 M82 60 Q80 66 74 62" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      {/* Subtle inner volume line */}
      <path d="M30 18 Q50 12 70 18" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.15" />
    </g>
  );
}

function Afro({ fill }: HairPartProps) {
  return (
    <g>
      {/* Main volume — bumpy organic silhouette instead of plain ellipse */}
      <path d="M8 50 C4 42 4 30 12 20 C16 14 24 8 32 6 C38 4 44 2 50 2 C56 2 62 4 68 6 C76 8 84 14 88 20 C96 30 96 42 92 50 C96 58 94 66 88 68 C92 62 90 54 88 48 Q50 20 12 48 C10 54 8 62 12 68 C6 66 4 58 8 50Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Curl texture — small S-curves scattered across the volume */}
      {[
        {x:24,y:14,s:3}, {x:38,y:8,s:2.5}, {x:50,y:6,s:3}, {x:62,y:8,s:2.5}, {x:76,y:14,s:3},
        {x:14,y:30,s:2.5}, {x:86,y:30,s:2.5}, {x:12,y:46,s:2}, {x:88,y:46,s:2},
        {x:30,y:12,s:2}, {x:70,y:12,s:2}, {x:18,y:22,s:2.5}, {x:82,y:22,s:2.5},
      ].map((c,i) => (
        <path key={i}
          d={`M${c.x-c.s} ${c.y} C${c.x-c.s} ${c.y-c.s} ${c.x+c.s} ${c.y-c.s} ${c.x+c.s} ${c.y} C${c.x+c.s} ${c.y+c.s} ${c.x-c.s} ${c.y+c.s} ${c.x-c.s} ${c.y}`}
          fill="none" stroke="#000" strokeWidth={0.6} opacity={0.1+(i%3)*0.03} />
      ))}
      {/* Volume highlights */}
      <path d="M28 10 Q40 4 50 4 Q60 4 72 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M16 28 Q20 20 28 14" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      <path d="M84 28 Q80 20 72 14" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      <ellipse cx="36" cy="10" rx="6" ry="4" fill="#fff" opacity="0.06" />
    </g>
  );
}

function Wavy({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M12 38 Q12 16 50 12 Q88 16 88 38 L90 54 Q88 64 80 58 Q76 52 78 62 Q76 74 68 68 L68 42 Q50 26 32 42 L32 68 Q24 74 22 62 Q24 52 20 58 Q12 64 10 54Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M20 42 Q22 50 20 56 M80 42 Q78 50 80 56" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M26 40 Q28 48 26 58 M74 40 Q72 48 74 58" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 18 Q42 12 50 14 Q58 12 68 18" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Pigtails({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap */}
      <path d="M18 34 Q18 14 50 10 Q82 14 82 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Part line */}
      <line x1="50" y1="10" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Left pigtail — flowing tapered shape */}
      <path d="M18 34 C4 36 0 44 2 54 C4 64 6 72 10 78 C14 84 18 80 16 74 C14 66 10 58 8 50 C6 42 10 36 18 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right pigtail — flowing tapered shape */}
      <path d="M82 34 C96 36 100 44 98 54 C96 64 94 72 90 78 C86 84 82 80 84 74 C86 66 90 58 92 50 C94 42 90 36 82 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Strand details */}
      <path d="M8 42 Q6 52 8 62 M12 44 Q10 54 12 68" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M92 42 Q94 52 92 62 M88 44 Q90 54 88 68" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Highlights */}
      <path d="M10 40 Q8 50 10 60" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M90 40 Q92 50 90 60" stroke="#fff" strokeWidth={1} opacity="0.12" />
      {/* Hair ties — wrapped band look */}
      <ellipse cx="18" cy="34" rx="5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M15 33 Q18 31 21 33" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.25" />
      <ellipse cx="82" cy="34" rx="5" ry="3.5" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M79 33 Q82 31 85 33" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.25" />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  return (
    <g>
      {/* Shaved side hints */}
      <path d="M20 38 Q20 28 30 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.35" />
      {[{x:22,y:32},{x:25,y:28},{x:29,y:25},{x:24,y:36},{x:28,y:32}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={fill} opacity={0.3} />
      ))}
      {/* Swept-over volume */}
      <path d="M34 22 Q60 10 90 30 L92 62 Q90 72 84 68 L84 40 Q66 16 38 26Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M60 18 Q72 16 82 24" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  /* Each dread: [startX, startY, endX, endY, midBulge, width] — varied organically */
  const dreads: [number,number,number,number,number,number][] = [
    [10,32, 6,76, -4, 8],
    [20,30, 16,74, -2, 7],
    [30,28, 28,72, 2, 6],
    [40,26, 36,68, -1, 7],
    [50,25, 50,66, 0, 6],
    [60,26, 62,70, 2, 7],
    [70,28, 74,72, -2, 6],
    [80,30, 84,74, 2, 7],
    [90,32, 92,70, 4, 8],
  ];
  return (
    <g>
      {/* Cap */}
      <path d="M10 32 Q10 14 50 10 Q90 14 90 32" fill={fill} stroke="#000" strokeWidth={S} />
      {dreads.map(([sx,sy,ex,ey,bulge,w],i) => {
        const mx = (sx+ex)/2 + bulge;
        const my = (sy+ey)/2;
        /* Tapered dread shape — wider at root, narrower at tip */
        const hw = w/2;
        const tw = hw * 0.6; /* tip half-width */
        return (
          <g key={i}>
            <path d={`M${sx-hw} ${sy} C${mx-hw-1} ${my-4} ${ex-tw-1} ${ey-8} ${ex-tw} ${ey} Q${ex} ${ey+3} ${ex+tw} ${ey} C${ex+tw+1} ${ey-8} ${mx+hw+1} ${my-4} ${sx+hw} ${sy}Z`}
              fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
            {/* Segment wraps — the horizontal bands that define dread texture */}
            {[0.25, 0.45, 0.65, 0.8].map((t, j) => {
              const px = sx + (ex-sx)*t + bulge*(t < 0.5 ? t*2 : 1);
              const py = sy + (ey-sy)*t;
              const rw = hw - (hw-tw)*t;
              return <path key={j} d={`M${px-rw+0.5} ${py} L${px+rw-0.5} ${py}`} stroke="#000" strokeWidth={0.7} opacity={0.12+j*0.02} />;
            })}
            {/* Bead on select dreads */}
            {(i===2||i===5||i===7) && (
              <>
                <ellipse cx={ex} cy={ey-4} rx={tw+1.5} ry={2.5} fill={fill} stroke="#000" strokeWidth={1.2} />
                <ellipse cx={ex-0.5} cy={ey-4.5} rx={1} ry={0.7} fill="#fff" opacity="0.2" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function Braids({ fill }: HairPartProps) {
  /* Woven braid segments — alternating left/right overlapping ellipses */
  const braidSegments = (cx: number, startY: number, dir: number) => {
    const segs = [];
    for (let i = 0; i < 7; i++) {
      const y = startY + i * 7;
      const xOff = (i % 2 === 0 ? -1 : 1) * dir * 2.5;
      segs.push(
        <ellipse key={i} cx={cx + xOff} cy={y} rx={5} ry={4} fill={fill} stroke="#000" strokeWidth={1.2}
          strokeLinejoin="round" />
      );
    }
    return segs;
  };
  return (
    <g>
      {/* Cap */}
      <path d="M10 34 Q10 12 50 8 Q90 12 90 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Part line */}
      <line x1="50" y1="8" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Left braid — woven overlapping segments */}
      <g>{braidSegments(14, 40, 1)}</g>
      {/* Left braid center line */}
      <path d="M14 40 Q12 54 14 68 Q12 78 14 86" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M16 44 Q14 56 16 70" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Right braid — woven overlapping segments */}
      <g>{braidSegments(86, 40, -1)}</g>
      {/* Right braid center line */}
      <path d="M86 40 Q88 54 86 68 Q88 78 86 86" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M84 44 Q86 56 84 70" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Beads at ends */}
      <ellipse cx="14" cy="88" rx={4} ry={3.5} fill={fill} stroke="#000" strokeWidth={1.8} />
      <ellipse cx="13" cy="87" rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
      <ellipse cx="86" cy="88" rx={4} ry={3.5} fill={fill} stroke="#000" strokeWidth={1.8} />
      <ellipse cx="85" cy="87" rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
    </g>
  );
}

function Bun({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap with inner contour */}
      <path d="M16 34 Q16 16 50 12 Q84 16 84 34 Q76 26 50 24 Q24 26 16 34Z" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun ball — kept inside viewBox */}
      <circle cx="50" cy="14" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun swirl detail — visible wrapped texture */}
      <path d="M45 10 Q50 16 55 10" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.25" />
      <path d="M43 14 Q50 20 57 14" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M47 7 Q50 11 53 7" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <ellipse cx="47" cy="10" rx="4" ry="3" fill="#fff" opacity="0.1" />
      {/* Strands leading up to bun */}
      <path d="M40 26 Q42 20 46 16 M60 26 Q58 20 54 16" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.15" />
      <path d="M36 28 Q34 22 32 26 M64 28 Q66 22 68 26" stroke={fill} strokeWidth={1} opacity="0.5" />
      {/* Hair stick — angled, stays within viewBox */}
      <line x1="46" y1="8" x2="38" y2="4" stroke="#8B6E4E" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="38" cy="4" r="1.5" fill="#D4A574" stroke="#8B6E4E" strokeWidth={0.8} />
    </g>
  );
}

function Bangs({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M10 34 Q10 12 50 8 Q90 12 90 34 L90 60 Q88 68 80 64 L80 40 Q50 24 20 40 L20 64 Q12 68 10 60Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 40 Q18 52 18 60 M82 40 Q82 52 82 60" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 38 Q24 48 24 56 M76 38 Q76 48 76 56" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 16 Q42 10 50 10 Q58 10 68 16" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Twintails({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap */}
      <path d="M14 34 Q14 12 50 8 Q86 12 86 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Part */}
      <line x1="50" y1="8" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.3" />
      {/* Left tail */}
      <path d="M16 38 Q6 46 4 60 Q2 78 8 90 Q14 98 20 86 Q12 70 16 56 Q18 48 24 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right tail */}
      <path d="M84 38 Q94 46 96 60 Q98 78 92 90 Q86 98 80 86 Q88 70 84 56 Q82 48 76 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M10 52 Q8 64 10 74 M90 52 Q92 64 90 74" stroke="#fff" strokeWidth={1} opacity="0.12" />
      {/* Hair ties */}
      <circle cx="18" cy="34" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="18" cy="34" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="17" cy="33" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
      <circle cx="82" cy="34" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="82" cy="34" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="81" cy="33" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
    </g>
  );
}

function Mullet({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap — business in front */}
      <path d="M18 34 Q18 16 50 12 Q82 16 82 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Party in back — right */}
      <path d="M80 36 Q92 40 94 58 Q96 78 88 90 Q82 94 78 84 Q86 66 82 48" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Party in back — left */}
      <path d="M20 36 Q8 40 6 58 Q4 78 12 90 Q18 94 22 84 Q14 66 18 48" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M84 44 Q88 56 86 72 M16 44 Q12 56 14 72" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 18 Q50 12 68 18" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
    </g>
  );
}

function FlameHair({ fill }: HairPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="flameHairGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="30%" stopColor="#FF6D00" />
          <stop offset="60%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
      </defs>
      {/* Flame tongues emerging from head — static shape, no jitter */}
      <path d="M16 40 C14 28 20 18 30 8 C26 20 32 12 38 2 C36 18 44 8 50 -4 C56 8 64 18 62 2 C66 12 74 20 70 8 C80 18 86 28 84 40"
        fill="url(#flameHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Inner flame glow lines — slow gentle pulse */}
      <path d="M28 36 C30 24 36 16 40 8 C38 22 44 14 48 4" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M72 36 C70 24 64 16 60 8 C62 22 56 14 52 4" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" repeatCount="indefinite" />
      </path>
      <path d="M38 34 C40 24 46 18 50 10 M62 34 C60 24 54 18 50 10" fill="none" stroke="#FFEB3B" strokeWidth={0.8} opacity="0.25" />
      {/* Ember particles — slow gentle float */}
      {[{cx:32,cy:6,r:1.5,c:'#FFD600',d:4},{cx:66,cy:8,r:1.2,c:'#FF9100',d:5},{cx:50,cy:-2,r:1.5,c:'#FFEB3B',d:4.5}].map((e,i) => (
        <circle key={i} cx={e.cx} cy={e.cy} r={e.r} fill={e.c}>
          <animate attributeName="cy" values={`${e.cy};${e.cy-6};${e.cy-12};${e.cy}`} dur={`${e.d}s`} begin={`${i*0.8}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.25;0;0.6" dur={`${e.d}s`} begin={`${i*0.8}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function GalaxyHair(_props: HairPartProps) {
  return (
    <g>
      <defs>
        {/* Static rich nebula gradient — no color cycling */}
        <linearGradient id="galaxyHairGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D1B3E" />
          <stop offset="25%" stopColor="#1A237E" />
          <stop offset="50%" stopColor="#4A148C" />
          <stop offset="75%" stopColor="#880E4F" />
          <stop offset="100%" stopColor="#1A237E" />
        </linearGradient>
      </defs>
      {/* Main hair shape — bob-like with galaxy fill */}
      <path d="M14 38 C10 24 24 12 50 10 C76 12 90 24 86 38 L88 60 Q84 72 78 66 L78 44 Q50 24 22 44 L22 66 Q16 72 12 60Z"
        fill="url(#galaxyHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Nebula wisps — soft slow breathing */}
      <path d="M32 24 Q42 18 50 22 Q58 18 68 24" fill="none" stroke="#E040FB" strokeWidth={1}>
        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="6s" repeatCount="indefinite" />
      </path>
      <path d="M26 36 Q38 30 50 34 Q62 30 74 36" fill="none" stroke="#00BCD4" strokeWidth={1}>
        <animate attributeName="opacity" values="0.15;0.35;0.15" dur="7s" begin="2s" repeatCount="indefinite" />
      </path>
      <path d="M20 48 Q30 42 42 46 Q54 42 64 46" fill="none" stroke="#E040FB" strokeWidth={0.8} opacity="0.15" />
      {/* Stars — slow gentle twinkle */}
      {[{cx:32,cy:20,r:1.5,d:4},{cx:50,cy:14,r:1,d:3.5},{cx:68,cy:20,r:1.5,d:5},{cx:26,cy:32,r:0.8,d:6},{cx:74,cy:32,r:0.8,d:5.5}].map((s,i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff">
          <animate attributeName="opacity" values={`${0.8-i*0.1};0.15;${0.8-i*0.1}`} dur={`${s.d}s`} begin={`${i*0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Twinkle crosses — slow, elegant */}
      <g><animate attributeName="opacity" values="0.4;0.8;0.4" dur="4s" repeatCount="indefinite" /><path d="M36 18 L36 22 M34 20 L38 20" stroke="#fff" strokeWidth={0.5} /></g>
      <g><animate attributeName="opacity" values="0.4;0.8;0.4" dur="4.5s" begin="2s" repeatCount="indefinite" /><path d="M64 18 L64 22 M62 20 L66 20" stroke="#fff" strokeWidth={0.5} /></g>
    </g>
  );
}

function NeonHair(_props: HairPartProps) {
  return (
    <g>
      <defs>
        {/* Static neon gradient — magenta to cyan, no color swapping */}
        <linearGradient id="neonHairGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF00FF" />
          <stop offset="40%" stopColor="#CC00FF" />
          <stop offset="70%" stopColor="#00DDFF" />
          <stop offset="100%" stopColor="#00FFFF" />
        </linearGradient>
      </defs>
      {/* Cap */}
      <path d="M20 36 Q20 22 50 18 Q80 22 80 36" fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Neon spikes */}
      <path d="M22 32 L26 4 L34 26 L40 -2 L50 22 L58 -4 L64 20 L72 2 L78 32"
        fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Glow streaks — slow soft pulse */}
      {[{x1:28,y1:24,x2:28,y2:10,b:0},{x1:50,y1:20,x2:50,y2:6,b:1.5},{x1:70,y1:24,x2:68,y2:8,b:3}].map((l,i) => (
        <path key={i} d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`} stroke="#fff" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" begin={`${l.b}s`} repeatCount="indefinite" />
        </path>
      ))}
      <path d="M40 22 L42 8 M60 20 L58 8" stroke="#fff" strokeWidth={0.8} opacity="0.25" />
      {/* Electric sparks — slower, less frantic */}
      {[{d:'M36 8 L38 4 L34 6',c:'#00FFFF',b:0},{d:'M62 6 L60 2 L64 4',c:'#FF00FF',b:1.5},{d:'M46 2 L48 -2 L44 0',c:'#00FFFF',b:3},{d:'M56 8 L54 4 L58 6',c:'#FF00FF',b:4.5}].map((s,i) => (
        <g key={i}><animate attributeName="opacity" values="0;0.7;0.7;0" dur="4s" begin={`${s.b}s`} repeatCount="indefinite" /><path d={s.d} stroke={s.c} strokeWidth={i<2?1:0.8} fill="none" /></g>
      ))}
    </g>
  );
}

function Pixie({ fill }: HairPartProps) {
  return (
    <g>
      {/* Short cap hugging head — feminine pixie shape */}
      <path d="M20 36 Q20 20 50 16 Q80 20 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Slightly longer top with side-swept fringe */}
      <path d="M22 34 Q24 14 50 10 Q62 12 72 20 Q68 14 56 10 Q42 8 30 14 Q20 22 22 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Side-swept fringe — closed path to avoid fill artifact */}
      <path d="M28 28 Q36 16 52 14 Q62 14 70 20 L66 26 Q58 18 48 18 Q38 20 28 28Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Short wisps around ears */}
      <path d="M20 36 Q16 40 18 46 Q20 42 22 38" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M80 36 Q84 38 82 42 Q80 38 78 36" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Detail lines */}
      <path d="M34 16 Q42 10 52 12" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M36 20 Q44 14 56 16" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      <path d="M30 24 Q38 18 48 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function Undercut({ fill }: HairPartProps) {
  return (
    <g>
      {/* Shaved sides — dot pattern like buzz */}
      <path d="M22 36 Q22 26 34 22" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M78 36 Q78 26 66 22" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:24,y:32},{x:27,y:28},{x:30,y:25},{x:26,y:36},{x:33,y:28},{x:70,y:25},{x:73,y:28},{x:76,y:32},{x:74,y:36},{x:67,y:28}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25-(i%3)*0.04} />
      ))}
      {/* Longer slicked-back top volume — single shape to avoid double stroke */}
      <path d="M34 24 Q36 8 50 4 Q64 8 66 24 Q60 12 50 10 Q40 12 34 24Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Slick-back detail lines */}
      <path d="M42 20 Q46 12 50 8 M58 20 Q54 12 50 8" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M44 18 Q48 10 50 6" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      <path d="M56 18 Q52 10 50 6" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function SpaceBuns({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap underneath */}
      <path d="M20 36 Q20 18 50 14 Q80 18 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Left space bun — kept inside viewBox */}
      <circle cx="30" cy="12" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Right space bun */}
      <circle cx="70" cy="12" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun spiral details */}
      <path d="M26 10 A3 3 0 1 1 32 10 M28 14 A2 2 0 1 0 32 14" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <path d="M66 10 A3 3 0 1 1 72 10 M68 14 A2 2 0 1 0 72 14" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      {/* Highlights */}
      <ellipse cx="27" cy="9" rx="3" ry="2.5" fill="#fff" opacity="0.12" />
      <ellipse cx="67" cy="9" rx="3" ry="2.5" fill="#fff" opacity="0.12" />
      {/* Strands leading to buns */}
      <path d="M36 22 Q34 18 30 16 M64 22 Q66 18 70 16" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.12" />
      {/* Part line */}
      <line x1="50" y1="14" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Straight({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap */}
      <path d="M12 36 Q12 14 50 10 Q88 14 88 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Left curtain — wide, flowing straight hair */}
      <path d="M12 36 L8 82 Q8 88 14 86 L20 86 Q28 88 28 82 L28 44 Q22 32 12 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right curtain — wide, flowing straight hair */}
      <path d="M88 36 L92 82 Q92 88 86 86 L80 86 Q72 88 72 82 L72 44 Q78 32 88 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Vertical strand lines — emphasize straightness */}
      <path d="M14 42 L12 78 M20 40 L20 80 M24 42 L24 78" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M86 42 L88 78 M80 40 L80 80 M76 42 L76 78" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      {/* Highlights */}
      <path d="M16 44 L14 76 M82 44 L84 76" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M22 42 L22 74 M78 42 L78 74" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      <path d="M32 18 Q50 12 68 18" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      {/* Subtle blunt-cut bottom edge */}
      <path d="M10 82 Q14 84 20 84 Q26 84 28 82 M72 82 Q74 84 80 84 Q86 84 90 82" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
    </g>
  );
}

function Fade({ fill }: HairPartProps) {
  return (
    <g>
      {/* Fade gradient on sides — almost skin at bottom, denser up */}
      <path d="M22 36 Q22 30 28 26" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.15" />
      <path d="M78 36 Q78 30 72 26" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.15" />
      {/* Very faint dots at bottom of sides */}
      {[{x:24,y:34},{x:27,y:32},{x:76,y:34},{x:73,y:32}].map((p,i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.8} fill={fill} opacity={0.15} />
      ))}
      {/* Medium density mid-side */}
      {[{x:26,y:30},{x:29,y:28},{x:32,y:26},{x:74,y:30},{x:71,y:28},{x:68,y:26}].map((p,i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1} fill={fill} opacity={0.3} />
      ))}
      {/* Styled top — full volume */}
      <path d="M32 26 Q34 10 50 6 Q66 10 68 26 Q60 14 50 12 Q40 14 32 26Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Top volume shape */}
      <path d="M34 24 Q38 8 50 4 Q62 8 66 24"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Detail lines on top */}
      <path d="M42 18 Q46 10 50 6 M58 18 Q54 10 50 6" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M44 16 Q48 8 50 6" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      {/* Fade line demarcation */}
      <path d="M30 26 Q40 22 50 20 Q60 22 70 26" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
    </g>
  );
}

function Cornrows({ fill }: HairPartProps) {
  return (
    <g>
      {/* Base cap */}
      <path d="M20 36 Q20 18 50 14 Q80 18 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Cornrow raised ridges — the visible braided rows */}
      {[
        'M24 34 Q28 24 34 18 Q42 12 50 14',
        'M30 34 Q34 24 40 18 Q46 14 50 14',
        'M38 32 Q42 22 46 18 Q48 14 50 14',
        'M50 14 Q52 14 54 18 Q58 22 62 32',
        'M50 14 Q54 14 60 18 Q66 24 70 34',
        'M50 14 Q58 12 66 18 Q72 24 76 34',
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#000" strokeWidth={1.8} opacity={0.3} strokeLinecap="round" />
      ))}
      {/* Highlight on each ridge */}
      {[
        'M26 32 Q30 22 36 18 Q44 12 50 14',
        'M32 32 Q36 22 42 18 Q48 14 50 14',
        'M40 30 Q44 22 48 18',
        'M52 18 Q56 22 60 30',
        'M52 14 Q56 14 62 18 Q68 22 68 32',
        'M52 14 Q60 12 68 18 Q74 24 74 32',
      ].map((d, i) => (
        <path key={`h${i}`} d={d} fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.18} strokeLinecap="round" />
      ))}
      {/* Scalp part lines between rows — darker for contrast */}
      {[27, 34, 44, 56, 66, 73].map((x, i) => (
        <path key={`s${i}`}
          d={`M${x} ${34-i*0.5} Q${x+(i<3?1:-1)} ${26} ${50} ${16}`}
          fill="none" stroke="#000" strokeWidth={0.6} opacity={0.15} />
      ))}
      {/* Top highlight */}
      <path d="M36 18 Q44 12 50 14 Q56 12 64 18" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function WolfCut({ fill }: HairPartProps) {
  return (
    <g>
      {/* Base cap */}
      <path d="M14 36 Q14 14 50 10 Q86 14 86 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Shorter messy top layers — choppy jagged edges */}
      <path d="M18 34 Q16 20 28 14 L34 20 L38 12 L46 18 L50 10 L54 18 L62 12 L66 20 L72 14 Q84 20 82 34"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Longer shaggy bottom layers — falls past ears */}
      <path d="M14 36 Q10 48 12 62 Q14 72 20 68 Q16 56 18 44"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M86 36 Q90 48 88 62 Q86 72 80 68 Q84 56 82 44"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Extra shaggy wisps at bottom */}
      <path d="M20 64 Q18 70 22 72 Q24 68 22 62" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M80 64 Q82 70 78 72 Q76 68 78 62" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Messy layer detail lines */}
      <path d="M28 18 L32 14 M42 14 L44 10 M56 14 L58 10 M68 18 L70 14" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M16 44 Q16 52 16 60 M84 44 Q84 52 84 60" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Highlights */}
      <path d="M36 14 Q44 8 50 10 Q56 8 64 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      <path d="M18 42 L18 56 M82 42 L82 56" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function CurtainBangs({ fill }: HairPartProps) {
  return (
    <g>
      {/* Long flowing hair with curtain bangs parted in center */}
      <path d="M10 38 C6 30 10 18 22 12 C30 8 40 6 50 8 C60 6 70 8 78 12 C90 18 94 30 90 38 L90 80 Q88 86 82 82 L80 60 Q78 42 76 38 Q50 28 24 38 Q22 42 20 60 L18 82 Q12 86 10 80Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Center part line */}
      <line x1="50" y1="8" x2="50" y2="32" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      {/* Strand texture */}
      <path d="M30 14 L22 50 M38 10 L34 48 M62 10 L66 48 M70 14 L78 50" stroke="#000" strokeWidth={0.6} opacity="0.08" />
      {/* Highlights */}
      <path d="M30 12 Q40 6 50 8 Q60 6 70 12" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M14 36 L16 56 M86 36 L84 56" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function HalfUp({ fill }: HairPartProps) {
  return (
    <g>
      {/* Lower half flowing down */}
      <path d="M14 36 C10 30 14 20 24 14 C32 10 42 8 50 10 C58 8 68 10 76 14 C86 20 90 30 86 36 L88 70 Q86 76 80 72 L80 50 Q78 38 76 36 Q50 28 24 36 Q22 38 20 50 L20 72 Q14 76 12 70Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Top bun/knot — kept inside viewBox */}
      <ellipse cx="50" cy="10" rx="13" ry="9" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Elastic/scrunchie at base of bun */}
      <ellipse cx="50" cy="17" rx="10" ry="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Bun texture */}
      <path d="M44 8 Q50 2 56 8" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M46 10 Q50 6 54 10" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
      {/* Strand texture */}
      <path d="M16 40 L18 64 M84 40 L82 64" stroke="#000" strokeWidth={0.6} opacity="0.08" />
    </g>
  );
}

function Himecut({ fill }: HairPartProps) {
  return (
    <g>
      {/* Classic Japanese hime cut — straight bangs + long side locks + back length */}
      {/* Back length */}
      <path d="M12 34 C8 28 12 18 24 12 C34 8 44 6 50 8 C56 6 66 8 76 12 C88 18 92 28 88 34 L90 78 Q88 82 84 80 L84 42 Q82 34 78 32 Q50 26 22 32 Q18 34 16 42 L16 80 Q12 82 10 78Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Straight-across bangs — sharp cut at eyebrow level */}
      <path d="M18 34 Q18 14 50 10 Q82 14 82 34 L82 36 L18 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Bang cut line */}
      <line x1="18" y1="36" x2="82" y2="36" stroke="#000" strokeWidth={1.5} opacity="0.3" />
      {/* Side locks — sharp straight cuts at chin level, wider than face */}
      <rect x="8" y="32" width="12" height="34" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="80" y="32" width="12" height="34" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Side lock cut lines */}
      <line x1="8" y1="66" x2="20" y2="66" stroke="#000" strokeWidth={1} opacity="0.25" />
      <line x1="80" y1="66" x2="92" y2="66" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Strand details */}
      <path d="M30 14 L30 34 M42 12 L42 34 M58 12 L58 34 M70 14 L70 34" stroke="#000" strokeWidth={0.5} opacity="0.06" />
      <path d="M36 12 Q46 8 50 10 Q54 8 64 12" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M12 38 L12 60 M88 38 L88 60" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
    </g>
  );
}

function FrenchBob({ fill }: HairPartProps) {
  return (
    <g>
      {/* Short blunt bob — chin-length with heavy straight-across bangs */}
      <path d="M14 36 Q14 14 50 10 Q86 14 86 36 L86 52 Q84 58 78 54 L78 40 Q50 26 22 40 L22 54 Q16 58 14 52Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Heavy blunt bangs — thick fringe across forehead */}
      <path d="M18 36 Q18 14 50 10 Q82 14 82 36 L82 40 L18 40Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Bang cut line */}
      <line x1="18" y1="40" x2="82" y2="40" stroke="#000" strokeWidth={1.2} opacity="0.25" />
      {/* Strand details */}
      <path d="M32 14 L32 38 M44 12 L44 38 M56 12 L56 38 M68 14 L68 38" stroke="#000" strokeWidth={0.4} opacity="0.06" />
      {/* Highlights */}
      <path d="M34 14 Q46 8 50 10 Q54 8 66 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M18 42 Q18 48 20 52 M82 42 Q82 48 80 52" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      {/* Blunt bottom edge */}
      <path d="M16 52 Q20 54 24 52 M76 52 Q80 54 84 52" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
    </g>
  );
}

function Shag({ fill }: HairPartProps) {
  return (
    <g>
      {/* Base cap */}
      <path d="M12 36 Q12 14 50 10 Q88 14 88 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Messy layered top — choppy jagged fringe */}
      <path d="M16 36 Q14 22 26 14 L30 22 L36 12 L42 20 L50 10 L58 20 L64 12 L70 22 L74 14 Q86 22 84 36"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Mid-length shaggy layers flowing past ears */}
      <path d="M12 36 Q8 50 10 66 Q12 76 18 72 Q14 58 16 46"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M88 36 Q92 50 90 66 Q88 76 82 72 Q86 58 84 46"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Wispy feathered ends */}
      <path d="M18 68 Q16 74 20 76 M82 68 Q84 74 80 76" fill={fill} stroke="#000" strokeWidth={1.2} />
      <path d="M24 64 Q22 70 26 72 M76 64 Q78 70 74 72" fill={fill} stroke="#000" strokeWidth={1.2} />
      {/* Messy texture lines */}
      <path d="M14 44 Q14 54 16 64 M86 44 Q86 54 84 64" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M30 16 L34 12 M56 16 L58 12 M66 18 L68 14" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      {/* Highlights */}
      <path d="M36 12 Q46 8 50 10 Q54 8 64 12" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      <path d="M16 42 L16 58 M84 42 L84 58" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function FlatTop({ fill }: HairPartProps) {
  return (
    <g>
      {/* Flat horizontal top — perfectly level */}
      <rect x="24" y="6" width="52" height="30" rx="3" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Slightly tapered sides */}
      <path d="M24 36 Q22 34 22 30 L22 16 Q22 12 24 10"
        fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M76 36 Q78 34 78 30 L78 16 Q78 12 76 10"
        fill={fill} stroke="#000" strokeWidth={S} />
      {/* Flat top edge — emphasis */}
      <line x1="24" y1="6" x2="76" y2="6" stroke="#000" strokeWidth={1.5} opacity="0.3" />
      {/* Vertical texture lines — tight, uniform hair */}
      {[30,36,42,48,54,60,66,72].map((x, i) => (
        <line key={i} x1={x} y1="8" x2={x} y2="32" stroke="#000" strokeWidth={0.5} opacity={0.08+i*0.005} />
      ))}
      {/* Highlights */}
      <path d="M30 8 Q50 6 70 8" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M26 14 L26 28 M74 14 L74 28" stroke="#fff" strokeWidth={0.6} opacity="0.08" />
    </g>
  );
}

function Lob({ fill }: HairPartProps) {
  return (
    <g>
      {/* Long bob — between bob and long, rests on shoulders */}
      <path d="M12 36 Q12 14 50 10 Q88 14 88 36 L90 72 Q88 78 82 74 L80 50 Q78 38 76 36 Q50 26 24 36 Q22 38 20 50 L18 74 Q12 78 10 72Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Subtle inward curve at ends — the "lob" flip */}
      <path d="M12 68 Q14 74 20 72 Q24 70 24 66" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      <path d="M88 68 Q86 74 80 72 Q76 70 76 66" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      {/* Strand texture */}
      <path d="M16 42 L16 66 M22 40 L22 68 M78 40 L78 68 M84 42 L84 66" stroke="#000" strokeWidth={0.5} opacity="0.08" />
      {/* Highlights */}
      <path d="M32 16 Q46 10 50 12 Q54 10 68 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M18 44 L18 62 M82 44 L82 62" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function FingerWaves({ fill }: HairPartProps) {
  return (
    <g>
      {/* Sleek cap — 1920s finger wave base */}
      <path d="M20 36 Q20 18 50 14 Q80 18 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Sculpted S-wave ridges across the cap */}
      <path d="M24 34 Q30 28 40 30 Q50 32 60 28 Q70 24 76 30" fill="none" stroke="#000" strokeWidth={1.8} opacity="0.2" />
      <path d="M22 30 Q32 24 42 26 Q52 28 62 24 Q72 20 78 26" fill="none" stroke="#000" strokeWidth={1.8} opacity="0.2" />
      <path d="M24 26 Q34 20 44 22 Q54 24 64 20 Q74 16 78 22" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.15" />
      {/* Glossy highlight ridges */}
      <path d="M28 32 Q36 26 46 28 Q56 30 66 26 Q72 24 76 28" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.18" />
      <path d="M26 28 Q36 22 46 24 Q56 26 66 22 Q74 18 78 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Short tucked sides */}
      <path d="M20 36 Q18 42 20 48 Q22 44 22 38" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M80 36 Q82 42 80 48 Q78 44 78 38" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Top highlight */}
      <path d="M36 18 Q46 14 50 14 Q54 14 64 18" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function CurlyBangs({ fill }: HairPartProps) {
  return (
    <g>
      {/* Full curly volume */}
      <path d="M8 42 C4 34 6 22 16 14 C24 8 36 4 50 4 C64 4 76 8 84 14 C94 22 96 34 92 42 C96 50 94 60 88 62 C92 56 90 48 88 44 Q50 18 12 44 C10 48 8 56 12 62 C6 60 4 50 8 42Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Curly bangs — bouncy coils framing forehead */}
      <path d="M22 34 C18 28 22 22 28 24 C30 18 36 20 34 26 C38 22 42 24 40 30"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M78 34 C82 28 78 22 72 24 C70 18 64 20 66 26 C62 22 58 24 60 30"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M40 28 C42 22 46 24 44 30 M56 28 C58 22 54 24 56 30"
        fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Curl texture */}
      <path d="M20 18 C24 14 28 18 26 22Z M46 8 C50 4 54 8 52 12Z M72 18 C76 14 80 18 78 22Z"
        fill="none" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      {/* Highlights */}
      <path d="M28 10 Q40 4 50 6 Q60 4 72 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M14 36 Q16 30 22 24" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
      <path d="M86 36 Q84 30 78 24" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function Quiff({ fill }: HairPartProps) {
  return (
    <g>
      {/* Shorter sides — tapered */}
      <path d="M22 36 Q22 28 30 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M78 36 Q78 28 70 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:24,y:32},{x:27,y:28},{x:30,y:26},{x:74,y:26},{x:73,y:28},{x:76,y:32}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25} />
      ))}
      {/* Big volume at front — the signature quiff */}
      <path d="M30 26 Q28 8 42 0 Q50 -2 58 0 Q72 8 70 26 Q62 14 50 12 Q38 14 30 26Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Back taper */}
      <path d="M34 24 Q36 16 50 12 Q64 16 66 24"
        fill={fill} stroke="#000" strokeWidth={S} />
      {/* Volume highlight on the quiff */}
      <path d="M40 6 Q48 0 56 4" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
      <path d="M44 12 Q50 8 56 12" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
      {/* Swept-back lines */}
      <path d="M36 20 Q42 10 50 6 M64 20 Q58 10 50 6" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.12" />
    </g>
  );
}

/** Curly crop fade — anchored at y=28 like other short styles, curly texture on top */
function FadeCurly({ fill }: HairPartProps) {
  return (
    <g>
      {/* Fade dots on sides — skin visible at bottom, denser up */}
      <path d="M22 36 Q22 30 28 26" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.15" />
      <path d="M78 36 Q78 30 72 26" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.15" />
      {[{x:24,y:34},{x:27,y:32},{x:76,y:34},{x:73,y:32}].map((p,i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.8} fill={fill} opacity={0.15} />
      ))}
      {[{x:26,y:30},{x:29,y:28},{x:32,y:26},{x:74,y:30},{x:71,y:28},{x:68,y:26}].map((p,i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1} fill={fill} opacity={0.3} />
      ))}
      {/* Main dome — solid filled cap anchored at y=28, no inner cutout */}
      <path d="M30 28 Q32 8 42 2 Q46 0 50 0 Q54 0 58 2 Q68 8 70 28Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Extra fill to ensure no gaps with face */}
      <path d="M32 26 Q34 10 50 4 Q66 10 68 26Z"
        fill={fill} stroke="none" />
      {/* Curly texture bumps on crown — row 1 (top) */}
      <path d="M36 6 Q38 2 42 1 Q44 0 46 2" fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M45 1 Q48 0 50 0 Q52 0 55 1" fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M54 1 Q56 0 58 1 Q62 3 64 6" fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Curly bumps row 2 */}
      <path d="M34 14 Q36 8 40 6 Q42 5 44 7" fill={fill} stroke="#000" strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M44 6 Q47 3 50 4 Q53 3 55 6" fill={fill} stroke="#000" strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M55 6 Q58 4 60 6 Q63 7 65 12" fill={fill} stroke="#000" strokeWidth={1.3} strokeLinejoin="round" />
      {/* Curly bumps row 3 — lower detail */}
      <path d="M34 20 Q37 14 40 12 Q43 11 45 14" fill={fill} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <path d="M45 13 Q48 10 51 11 Q54 10 56 13" fill={fill} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <path d="M56 13 Q58 10 61 12 Q63 14 65 18" fill={fill} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      {/* Fade demarcation */}
      <path d="M30 26 Q40 22 50 20 Q60 22 70 26" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      {/* Highlights */}
      <path d="M44 1 Q48 0 52 1" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" />
      <path d="M38 7 Q42 4 46 6" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" />
    </g>
  );
}

function SideSwept({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap base */}
      <path d="M16 36 Q16 16 50 12 Q84 16 84 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Side-swept volume — sweeps from right to left */}
      <path d="M16 36 Q14 24 24 16 Q36 8 50 10 Q64 8 76 16 Q86 24 84 36 Q80 28 68 22 Q56 18 42 20 Q28 24 20 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Elegant sweep emphasis — hair flowing left */}
      <path d="M80 30 Q68 20 50 16 Q34 14 20 22 Q12 28 10 38 Q8 48 12 56 Q14 50 14 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right side shorter/tucked */}
      <path d="M84 36 Q86 42 84 48 Q82 44 82 38" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Sweep strand lines */}
      <path d="M72 22 Q56 18 38 22 M68 26 Q52 22 34 26" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      {/* Highlights */}
      <path d="M36 12 Q50 8 64 12" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M24 24 Q36 16 48 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
      <path d="M14 38 Q14 44 14 50" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
    </g>
  );
}

export const HAIR_PARTS = {
  none: None,
  spiky: Spiky,
  curly: Curly,
  long: Long,
  buzz: Buzz,
  mohawk: Mohawk,
  bob: Bob,
  ponytail: Ponytail,
  afro: Afro,
  wavy: Wavy,
  pigtails: Pigtails,
  topknot: Topknot,
  sideshave: Sideshave,
  dreads: Dreads,
  braids: Braids,
  bun: Bun,
  bangs: Bangs,
  twintails: Twintails,
  mullet: Mullet,
  combover: Combover,
  elvis: Elvis,
  ramen: Ramen,
  flame: FlameHair,
  galaxy: GalaxyHair,
  neon: NeonHair,
  pixie: Pixie,
  undercut: Undercut,
  spaceBuns: SpaceBuns,
  straight: Straight,
  fade: Fade,
  cornrows: Cornrows,
  wolfCut: WolfCut,
  curtainBangs: CurtainBangs,
  halfUp: HalfUp,
  himecut: Himecut,
  frenchBob: FrenchBob,
  shag: Shag,
  flatTop: FlatTop,
  lob: Lob,
  fingerWaves: FingerWaves,
  curlyBangs: CurlyBangs,
  quiff: Quiff,
  sideSwept: SideSwept,
  fadeCurly: FadeCurly,
} as const;

export type HairPart = keyof typeof HAIR_PARTS;

function BangsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Chunky bangs with zigzag bottom */}
      <path d="M18 34 Q18 14 50 8 Q82 14 82 34 L76 40 L68 36 L60 42 L50 36 L40 42 L32 36 L24 40Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 22 L32 34 M44 18 L42 36 M56 18 L58 36 M68 22 L68 34" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M38 16 Q46 10 56 10 Q66 10 72 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
    </g>
  );
}

function LongFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Side strands framing face */}
      <path d="M14 32 Q12 28 14 40 L16 58 Q14 64 12 58 L10 40 Q10 28 14 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M86 32 Q88 28 86 40 L84 58 Q86 64 88 58 L90 40 Q90 28 86 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M13 36 L13 52 M87 36 L87 52" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Top parting hint */}
      <path d="M44 28 Q50 24 56 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M46 26 Q50 22 54 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BobFront({ fill }: HairPartProps) {
  return (<g>
    {/* Side curtains */}
    <path d="M12 32 L14 54 Q16 60 20 56 L18 38 Q16 30 12 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M88 32 L86 54 Q84 60 80 56 L82 38 Q84 30 88 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M13 36 L14 50 M87 36 L86 50" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    <path d="M16 52 Q18 56 22 54 M84 52 Q82 56 78 54" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" />
  </g>);
}

function WavyFront({ fill }: HairPartProps) {
  return (<g>
    {/* Wavy side strands */}
    <path d="M12 34 Q10 42 12 50 Q14 58 16 52 Q14 44 14 36Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M88 34 Q90 42 88 50 Q86 58 84 52 Q86 44 86 36Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M13 38 Q12 44 13 50 M87 38 Q88 44 87 50" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function SideshaveFront({ fill }: HairPartProps) {
  return (<g>
    {/* Right side volume falling over */}
    <path d="M86 30 Q88 36 88 48 Q86 54 84 48 L84 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M52 26 Q66 22 80 30" fill={fill} stroke="#000" strokeWidth={2} opacity="0.6" />
    <path d="M85 34 L85 44" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function AfroFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Organic forehead fringe — bumpy hairline matching afro volume */}
      <path d="M14 40 C12 34 18 28 26 30 C30 26 36 24 42 28 C46 24 54 22 58 26 C62 24 70 26 74 30 C82 28 88 34 86 40 L80 42 Q72 36 62 38 Q50 32 38 38 Q28 36 20 42Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Curl hints on fringe */}
      <path d="M30 30 C32 28 36 28 38 30 M54 26 C56 24 60 24 62 26" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M40 28 Q46 24 52 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function DreadsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Front-hanging dreads — tapered, organic shapes */}
      <path d="M34 26 C33 30 32 38 34 44 Q37.5 46 41 44 C43 38 42 30 41 26 Q37.5 24 34 26Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M46 24 C45 28 44 34 46 40 Q49.5 42 53 40 C55 34 54 28 53 24 Q49.5 22 46 24Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M58 26 C57 30 56 37 58 43 Q61.5 45 65 43 C67 37 66 30 65 26 Q61.5 24 58 26Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Segment wraps */}
      <path d="M35 32 L40 32 M36 36 L39 36 M47 30 L52 30 M48 34 L51 34 M59 32 L64 32 M60 36 L63 36" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function PigtailsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M24 34 Q30 26 42 28 Q50 22 58 28 Q70 26 76 34" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="22" x2="50" y2="32" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M36 28 Q40 24 44 28 M56 28 Q60 24 64 28" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BraidsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 34 Q28 24 42 26 Q50 20 58 26 Q72 24 78 34" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="20" x2="50" y2="30" stroke="#000" strokeWidth={1} opacity="0.25" />
      <path d="M36 26 Q40 22 44 26 M56 26 Q60 22 64 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BunFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 36 Q24 26 40 26 Q50 22 60 26 Q76 26 80 36" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M34 28 Q38 24 44 26 M56 26 Q62 24 66 28" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function TwintailsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 34 Q26 22 40 24 Q50 18 60 24 Q74 22 80 34 L74 38 L66 34 L58 40 L50 34 L42 40 L34 34 L26 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 24 L36 32 M64 24 L64 32" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M44 22 Q50 18 56 22" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function MulletFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 34 Q28 26 42 26 Q50 22 58 26 Q72 26 78 34 L72 38 L64 34 L56 38 L50 34 L44 38 L36 34 L28 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M38 26 Q46 22 50 22 Q54 22 62 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function CurlyFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Curly fringe — bumpy organic hairline with curl texture */}
      <path d="M20 36 C18 30 22 24 30 26 C34 22 40 22 44 26 C48 22 54 20 58 24 C62 20 68 22 72 26 C78 24 82 30 80 36 L74 38 Q68 32 60 34 Q50 30 40 34 Q32 32 26 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 26 C34 24 38 24 40 26 M56 24 C58 22 62 22 64 24" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M38 26 Q44 22 50 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function PixieFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Side-swept fringe overlay across forehead */}
      <path d="M26 30 Q34 22 48 24 Q56 22 64 28 L58 34 L50 30 L42 34 L34 30 L28 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 26 Q42 22 50 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function StraightFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Wide side curtain strands framing face */}
      <path d="M12 34 L8 58 Q8 62 14 60 L20 60 Q28 62 28 58 L28 40 Q22 30 12 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M88 34 L92 58 Q92 62 86 60 L80 60 Q72 62 72 58 L72 40 Q78 30 88 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M14 38 L12 54 M22 40 L22 54 M78 40 L78 54 M86 38 L88 54" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function SpaceBunsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Hairline fringe between buns */}
      <path d="M24 34 Q30 26 42 28 Q50 22 58 28 Q70 26 76 34"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="22" x2="50" y2="30" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M38 28 Q44 24 50 24 Q56 24 62 28" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function WolfCutFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Choppy front fringe layers */}
      <path d="M22 34 Q26 24 36 22 L40 28 L46 22 L50 26 L54 22 L60 28 L64 22 Q74 24 78 34 L72 38 L64 34 L56 38 L50 34 L44 38 L36 34 L28 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M38 24 L40 22 M48 22 L50 20 M60 24 L62 22" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M42 24 Q48 20 54 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function CornrowsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Front hairline with visible row starts */}
      <path d="M24 34 Q30 26 42 26 Q50 22 58 26 Q70 26 76 34"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Row start lines visible on forehead */}
      {[32, 38, 44, 50, 56, 62, 68].map((x, i) => (
        <line key={i} x1={x} y1={32} x2={x} y2={28} stroke="#000" strokeWidth={0.8} opacity="0.15" />
      ))}
      <path d="M40 26 Q46 22 50 22 Q54 22 60 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function CurtainBangsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Curtain bangs parting — two swooping sections framing face */}
      <path d="M22 32 Q30 24 44 28 Q48 26 50 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M78 32 Q70 24 56 28 Q52 26 50 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Center part */}
      <line x1="50" y1="16" x2="50" y2="30" stroke="#000" strokeWidth={1} opacity="0.15" />
      <path d="M34 28 Q40 24 46 28 M54 28 Q60 24 66 28" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function HalfUpFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Loose strands framing face from the lower portion */}
      <path d="M14 34 Q12 40 14 52 L16 58 Q14 62 12 56 L10 44 Q12 32 14 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M86 34 Q88 40 86 52 L84 58 Q86 62 88 56 L90 44 Q88 32 86 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Wispy strands at temples */}
      <path d="M24 30 Q28 26 36 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.5" />
      <path d="M76 30 Q72 26 64 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.5" />
    </g>
  );
}

function HimecutFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Sharp straight bangs overlay — the iconic blunt fringe */}
      <path d="M20 34 Q20 16 50 12 Q80 16 80 34 L80 38 L20 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Sharp cut line at bottom */}
      <line x1="20" y1="38" x2="80" y2="38" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      {/* Strand lines for sleek look */}
      <path d="M32 18 L32 36 M42 14 L42 36 M50 12 L50 36 M58 14 L58 36 M68 18 L68 36" stroke="#000" strokeWidth={0.4} opacity="0.06" />
      <path d="M36 16 Q44 12 50 12 Q56 12 64 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

/** Front-layer hair parts — rendered ON TOP of face */
export const HAIR_FRONT_PARTS: Partial<Record<keyof typeof HAIR_PARTS, FC<HairPartProps>>> = {
  curly: CurlyFront,
  bangs: BangsFront,
  long: LongFront,
  bob: BobFront,
  wavy: WavyFront,
  sideshave: SideshaveFront,
  afro: AfroFront,
  dreads: DreadsFront,
  pigtails: PigtailsFront,
  braids: BraidsFront,
  bun: BunFront,
  twintails: TwintailsFront,
  mullet: MulletFront,
  pixie: PixieFront,
  spaceBuns: SpaceBunsFront,
  straight: StraightFront,
  wolfCut: WolfCutFront,
  cornrows: CornrowsFront,
  curtainBangs: CurtainBangsFront,
  halfUp: HalfUpFront,
  himecut: HimecutFront,
};
