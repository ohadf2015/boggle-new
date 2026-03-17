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
      {/* Spikes emerging from cap */}
      <path d="M24 32 L30 4 L36 26 L42 0 L50 22 L58 -2 L64 20 L72 2 L78 32"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 22 L38 10 M50 18 L52 4 M64 20 L66 8" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M38 20 L40 8 M52 16 L54 2 M66 18 L68 8" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
      <path d="M30 28 Q32 20 34 14 M72 28 Q70 20 68 10" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      {/* Main curl volume — top and sides */}
      <circle cx="28" cy="22" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="16" r="15" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="72" cy="22" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Side curls */}
      <circle cx="12" cy="40" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="88" cy="40" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="8" cy="56" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="92" cy="56" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="10" cy="70" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="90" cy="70" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Curl detail arcs */}
      <path d="M24 18 A4 4 0 1 1 32 18 M46 12 A4 4 0 1 1 54 12 M68 18 A4 4 0 1 1 76 18" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <circle cx="32" cy="18" r="4" fill="#fff" opacity="0.12" />
      <circle cx="54" cy="12" r="4" fill="#fff" opacity="0.12" />
      <circle cx="14" cy="36" r="3" fill="#fff" opacity="0.1" />
      <circle cx="86" cy="36" r="3" fill="#fff" opacity="0.1" />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  return (
    <g>
      {/* Tight cap following head shape */}
      <path d="M22 36 Q22 20 50 16 Q78 20 78 36" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M26 34 Q26 22 50 19 Q74 22 74 34" fill="#fff" opacity="0.06" />
      {/* Stubble dots */}
      {[{x:35,y:22},{x:42,y:26},{x:50,y:20},{x:58,y:26},{x:65,y:22},{x:30,y:28},{x:46,y:24},{x:54,y:20},{x:62,y:24},{x:70,y:28},{x:38,y:30},{x:56,y:30},{x:48,y:22}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1} fill="#000" opacity={0.12-(i%3)*0.02} />
      ))}
      <path d="M36 20 Q50 16 64 20" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
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
      {/* Bun on top */}
      <ellipse cx="50" cy="8" rx="12" ry="11" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Tie/wrap */}
      <ellipse cx="50" cy="18" rx="7" ry="3" fill="#000" opacity="0.25" />
      <ellipse cx="47" cy="4" rx="4" ry="3" fill="#fff" opacity="0.12" />
      <path d="M44 6 Q50 2 56 6 M46 10 Q50 7 54 10" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
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
      {/* Hair tie */}
      <circle cx="74" cy="28" r="4.5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="74" cy="28" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="73" cy="27" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
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
      {/* Side wisps */}
      <path d="M18 36 Q18 48 20 54" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M82 36 Q82 48 80 54" fill={fill} stroke="#000" strokeWidth={2} />
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
      {/* Sideburns */}
      <rect x="18" y="36" width="6" height="24" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="76" y="36" width="6" height="24" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M19 40 L19 54 M81 40 L81 54" stroke="#000" strokeWidth={0.5} opacity="0.15" />
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
      <path d="M12 36 Q12 16 50 12 Q88 16 88 36 L88 58 Q86 66 78 62 L78 40 Q50 26 22 40 L22 62 Q14 66 12 58Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 40 Q18 50 20 58 M82 40 Q82 50 80 58" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 38 Q24 48 26 56 M76 38 Q76 48 74 56" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M20 58 Q22 62 26 60 M80 58 Q78 62 74 60" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Afro({ fill }: HairPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="32" rx="44" ry="34" fill={fill} stroke="#000" strokeWidth={S} />
      {[{x:32,y:18},{x:54,y:12},{x:72,y:22},{x:20,y:32},{x:80,y:34},{x:42,y:10},{x:62,y:16},{x:14,y:46},{x:86,y:46},{x:36,y:26},{x:66,y:30},{x:50,y:6},{x:26,y:42},{x:74,y:42}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i<6?2.5:2} fill="#000" opacity={0.1+((i%3)*0.02)} />
      ))}
      <path d="M28 16 Q40 8 50 10 Q60 8 72 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.12" />
      <path d="M16 38 Q20 30 28 24" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
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
      {/* Left pigtail balls */}
      <circle cx="8" cy="42" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="6" cy="58" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="8" cy="72" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Right pigtail balls */}
      <circle cx="92" cy="42" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="58" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="92" cy="72" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Highlights */}
      <circle cx="10" cy="38" r="3" fill="#fff" opacity="0.1" />
      <circle cx="94" cy="38" r="3" fill="#fff" opacity="0.1" />
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
  const dreads = [[8,32,44],[18,30,48],[28,28,46],[38,26,42],[48,25,40],[58,26,44],[68,28,46],[78,30,42],[88,32,38]];
  return (
    <g>
      {/* Cap */}
      <path d="M10 32 Q10 14 50 10 Q90 14 90 32" fill={fill} stroke="#000" strokeWidth={S} />
      {dreads.map(([x,y,h],i) => (
        <g key={i}>
          <rect x={x} y={y} width={7} height={h} rx={3.5} fill={fill} stroke="#000" strokeWidth={1.5} />
          <line x1={x+3.5} y1={y+10} x2={x+3.5} y2={y+h-4} stroke="#000" strokeWidth={0.5} opacity="0.1" />
          {i===2 && <circle cx={x+3.5} cy={y+30} r={2.5} fill={fill} stroke="#000" strokeWidth={1} />}
          {i===5 && <circle cx={x+3.5} cy={y+28} r={2.5} fill={fill} stroke="#000" strokeWidth={1} />}
          {i===7 && <circle cx={x+3.5} cy={y+24} r={2} fill={fill} stroke="#000" strokeWidth={1} />}
          {(i===1||i===4||i===6) && <path d={`M${x+1} ${y+16} L${x+6} ${y+16} M${x+1} ${y+20} L${x+6} ${y+20}`} stroke="#000" strokeWidth={0.5} opacity="0.12" />}
        </g>
      ))}
    </g>
  );
}

function Braids({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap */}
      <path d="M10 34 Q10 12 50 8 Q90 12 90 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Part line */}
      <line x1="50" y1="8" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.2" />
      {[{x:14,d:1},{x:86,d:-1}].map(({x,d},bi) => (
        <g key={bi}>
          <path d={`M${x} 40 L${x-d*4} 50 L${x+d*2} 56 L${x-d*4} 64 L${x+d*2} 70 L${x-d*4} 78 L${x} 86`}
            fill="none" stroke={fill} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${x} 40 L${x-d*4} 50 L${x+d*2} 56 L${x-d*4} 64 L${x+d*2} 70 L${x-d*4} 78 L${x} 86`}
            fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${x-d*1} 44 L${x+d*1} 44 M${x-d*2} 58 L${x+d*2} 58 M${x-d*2} 72 L${x+d*2} 72`}
            stroke="#000" strokeWidth={0.8} opacity="0.15" />
          <path d={`M${x-d*1} 46 L${x+d*1} 46`} stroke="#fff" strokeWidth={0.6} opacity="0.12" />
          {/* Bead at end */}
          <circle cx={x} cy={88} r={4} fill={fill} stroke="#000" strokeWidth={2} />
          <ellipse cx={x-1} cy={87} rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
        </g>
      ))}
    </g>
  );
}

function Bun({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap with inner contour */}
      <path d="M16 34 Q16 16 50 12 Q84 16 84 34 Q76 26 50 24 Q24 26 16 34Z" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun ball */}
      <circle cx="50" cy="4" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M44 0 Q50 6 56 0" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.25" />
      <path d="M42 6 Q50 12 58 6" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <ellipse cx="47" cy="2" rx="4" ry="3" fill="#fff" opacity="0.1" />
      {/* Strands leading up to bun */}
      <path d="M40 26 Q42 16 45 10 M60 26 Q58 16 55 10" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.15" />
      <path d="M36 28 Q34 22 32 26 M64 28 Q66 22 68 26" stroke={fill} strokeWidth={1} opacity="0.5" />
      {/* Hair stick */}
      <line x1="46" y1="-2" x2="40" y2="-10" stroke="#8B6E4E" strokeWidth={1.5} strokeLinecap="round" />
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
      {/* Flame tongues emerging from head */}
      <path d="M16 40 C14 28 20 18 30 8 C26 20 32 12 38 2 C36 18 44 8 50 -4 C56 8 64 18 62 2 C66 12 74 20 70 8 C80 18 86 28 84 40"
        fill="url(#flameHairGrad)" stroke="#000" strokeWidth={S}>
        <animateTransform attributeName="transform" type="translate" values="0,0;0.5,-1;-0.5,0;0,0" dur="0.6s" repeatCount="indefinite" />
      </path>
      {/* Inner flame glow lines */}
      <path d="M28 36 C30 24 36 16 40 8 C38 22 44 14 48 4" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.5;0.8;0.3;0.5" dur="0.7s" repeatCount="indefinite" />
      </path>
      <path d="M72 36 C70 24 64 16 60 8 C62 22 56 14 52 4" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.3;0.7;0.5;0.3" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M38 34 C40 24 46 18 50 10 M62 34 C60 24 54 18 50 10" fill="none" stroke="#FFEB3B" strokeWidth={0.8} opacity="0.3" />
      {/* Ember particles */}
      {[{cx:32,cy:6,r:1.5,c:'#FFD600',d:2},{cx:66,cy:8,r:1.2,c:'#FF9100',d:2.4},{cx:50,cy:-2,r:1.5,c:'#FFEB3B',d:1.8},{cx:42,cy:4,r:0.8,c:'#fff',d:2.6},{cx:58,cy:6,r:0.7,c:'#FFD600',d:2.2}].map((e,i) => (
        <circle key={i} cx={e.cx} cy={e.cy} r={e.r} fill={e.c}>
          <animate attributeName="cy" values={`${e.cy};${e.cy-8};${e.cy-16};${e.cy}`} dur={`${e.d}s`} begin={`${i*0.3}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.3;0;0.7" dur={`${e.d}s`} begin={`${i*0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

function GalaxyHair({ fill }: HairPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="galaxyHairGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D1B3E"><animate attributeName="stopColor" values="#0D1B3E;#1A237E;#0D1B3E" dur="6s" repeatCount="indefinite" /></stop>
          <stop offset="25%" stopColor="#1A237E" />
          <stop offset="50%" stopColor="#4A148C"><animate attributeName="stopColor" values="#4A148C;#880E4F;#4A148C" dur="6s" begin="2s" repeatCount="indefinite" /></stop>
          <stop offset="75%" stopColor="#880E4F" />
          <stop offset="100%" stopColor={fill} />
        </linearGradient>
      </defs>
      {/* Main hair shape — bob-like with galaxy fill */}
      <path d="M14 38 C10 24 24 12 50 10 C76 12 90 24 86 38 L88 60 Q84 72 78 66 L78 44 Q50 24 22 44 L22 66 Q16 72 12 60Z"
        fill="url(#galaxyHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Nebula wisps */}
      <path d="M32 24 Q42 18 50 22 Q58 18 68 24" fill="none" stroke="#E040FB" strokeWidth={1}>
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M26 36 Q38 30 50 34 Q62 30 74 36" fill="none" stroke="#00BCD4" strokeWidth={1}>
        <animate attributeName="opacity" values="0.25;0.45;0.25" dur="4s" begin="1s" repeatCount="indefinite" />
      </path>
      <path d="M20 48 Q30 42 42 46 Q54 42 64 46" fill="none" stroke="#E040FB" strokeWidth={0.8} opacity="0.2" />
      {/* Stars */}
      {[{cx:32,cy:20,r:1.5,d:2.2},{cx:50,cy:14,r:1,d:1.8},{cx:68,cy:20,r:1.5,d:2.5},{cx:26,cy:32,r:0.8,d:3},{cx:74,cy:32,r:0.8,d:2.8},{cx:20,cy:48,r:0.5,d:3},{cx:80,cy:48,r:0.5,d:2.5}].map((s,i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff">
          <animate attributeName="opacity" values={`${0.9-i*0.1};${0.2};${0.9-i*0.1}`} dur={`${s.d}s`} begin={`${i*0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx="42" cy="26" r={0.6} fill="#E040FB"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" begin="1s" repeatCount="indefinite" /></circle>
      <circle cx="58" cy="26" r={0.6} fill="#00BCD4"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.3s" begin="0.7s" repeatCount="indefinite" /></circle>
      {/* Twinkle crosses */}
      <g><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" /><path d="M36 18 L36 22 M34 20 L38 20" stroke="#fff" strokeWidth={0.5} /></g>
      <g><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="1s" repeatCount="indefinite" /><path d="M64 18 L64 22 M62 20 L66 20" stroke="#fff" strokeWidth={0.5} /></g>
      <g><animate attributeName="opacity" values="0;0.8;0" dur="2.5s" begin="0.5s" repeatCount="indefinite" /><path d="M50 10 L50 14 M48 12 L52 12" stroke="#fff" strokeWidth={0.4} /></g>
    </g>
  );
}

function NeonHair({ fill }: HairPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="neonHairGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF00FF"><animate attributeName="stopColor" values="#FF00FF;#00FFFF;#FF00FF" dur="3s" repeatCount="indefinite" /></stop>
          <stop offset="50%" stopColor="#00FFFF"><animate attributeName="stopColor" values="#00FFFF;#FF00FF;#00FFFF" dur="3s" repeatCount="indefinite" /></stop>
          <stop offset="100%" stopColor={fill} />
        </linearGradient>
      </defs>
      {/* Cap */}
      <path d="M20 36 Q20 22 50 18 Q80 22 80 36" fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Neon spikes */}
      <path d="M22 32 L26 4 L34 26 L40 -2 L50 22 L58 -4 L64 20 L72 2 L78 32"
        fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Glow streaks */}
      {[{x1:28,y1:24,x2:28,y2:10,b:0},{x1:50,y1:20,x2:50,y2:6,b:0.4},{x1:70,y1:24,x2:68,y2:8,b:0.8}].map((l,i) => (
        <path key={i} d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`} stroke="#fff" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.2s" begin={`${l.b}s`} repeatCount="indefinite" />
        </path>
      ))}
      <path d="M40 22 L42 8 M60 20 L58 8" stroke="#fff" strokeWidth={0.8} opacity="0.3" />
      {/* Electric sparks */}
      {[{d:'M36 8 L38 4 L34 6',c:'#00FFFF',v:'0.6;1;0;0.8;0;0.6',t:0.8},{d:'M62 6 L60 2 L64 4',c:'#FF00FF',v:'0;0.8;0.6;0;1;0',t:0.9},{d:'M46 2 L48 -2 L44 0',c:'#00FFFF',v:'0;0.7;0;0.5;0',t:1.1},{d:'M56 8 L54 4 L58 6',c:'#FF00FF',v:'0.5;0;0.8;0;0.5',t:1}].map((s,i) => (
        <g key={i}><animate attributeName="opacity" values={s.v} dur={`${s.t}s`} begin={`${i*0.3}s`} repeatCount="indefinite" /><path d={s.d} stroke={s.c} strokeWidth={i<2?1:0.8} fill="none" /></g>
      ))}
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
      {/* Top puff bumps */}
      <circle cx="32" cy="30" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="26" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="68" cy="30" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="36" cy="26" r="2" fill="#fff" opacity="0.1" />
      <circle cx="54" cy="22" r="2" fill="#fff" opacity="0.1" />
      <circle cx="44" cy="24" r="1.5" fill="#000" opacity="0.1" />
      <circle cx="58" cy="22" r="1.5" fill="#000" opacity="0.1" />
    </g>
  );
}

function DreadsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Front-hanging dreads */}
      <rect x="34" y="26" width="7" height="18" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="46" y="24" width="7" height="16" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="58" y="26" width="7" height="17" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M37.5 32 L37.5 40 M49.5 30 L49.5 36 M61.5 32 L61.5 39" stroke="#000" strokeWidth={0.5} opacity="0.1" />
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
      {/* 3 curl bumps along the forehead hairline */}
      <circle cx="30" cy="32" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="28" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="70" cy="32" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="30" r="2.5" fill="#fff" opacity="0.1" />
      <circle cx="58" cy="26" r="2.5" fill="#fff" opacity="0.1" />
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
};
