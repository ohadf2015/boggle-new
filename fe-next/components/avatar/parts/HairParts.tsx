/** Avatar Hair Parts — viewBox 0 0 100 100. Face: cx=50 cy=52 r=30. */
import { type FC } from 'react';

import { STROKE_OUTER } from './avatarDesignConstants';

const S = STROKE_OUTER;

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
      <path d="M20 30 Q20 16 50 14 Q80 16 80 30" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M22 28 L28 2 L34 22 L40 -2 L48 18 L56 -4 L62 16 L70 0 L78 28"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M34 20 L36 8 M48 16 L50 2 M62 14 L64 4" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M36 18 L38 6 M50 14 L52 0 M64 16 L66 6" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
      <path d="M28 26 Q30 18 32 12 M70 24 Q68 16 66 8" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      <circle cx="26" cy="18" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="12" r="15" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="74" cy="18" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="10" cy="36" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="90" cy="36" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="6" cy="54" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="54" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="8" cy="70" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="92" cy="70" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M22 14 A4 4 0 1 1 30 14 M46 8 A4 4 0 1 1 54 8 M70 14 A4 4 0 1 1 78 14" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <circle cx="30" cy="14" r="4" fill="#fff" opacity="0.12" />
      <circle cx="54" cy="8" r="4" fill="#fff" opacity="0.12" />
      <circle cx="12" cy="32" r="3" fill="#fff" opacity="0.1" />
      <circle cx="88" cy="32" r="3" fill="#fff" opacity="0.1" />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 30 Q20 12 50 10 Q80 12 80 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M24 28 Q24 16 50 13 Q76 16 76 28" fill="#fff" opacity="0.06" />
      {[{x:35,y:18},{x:42,y:22},{x:50,y:15},{x:58,y:22},{x:65,y:18},{x:30,y:24},{x:46,y:20},{x:54,y:14},{x:62,y:20},{x:70,y:24},{x:38,y:26},{x:56,y:26},{x:48,y:18}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1} fill="#000" opacity={0.12-(i%3)*0.02} />
      ))}
      <path d="M34 16 Q50 11 66 16" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
    </g>
  );
}

function Mohawk({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 30 Q20 20 34 18" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M80 30 Q80 20 66 18" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:24,y:26},{x:28,y:23},{x:32,y:20},{x:72,y:23},{x:76,y:26},{x:68,y:20}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25} />
      ))}
      <path d="M36 26 L36 -2 Q50 -10 64 -2 L64 26" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M42 22 L42 4 M50 20 L50 0 M58 22 L58 4" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M48 20 L48 2 M52 18 L52 0" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Topknot({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M24 28 Q24 16 50 14 Q76 16 76 28" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="4" rx="12" ry="11" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="14" rx="7" ry="3" fill="#000" opacity="0.25" />
      <ellipse cx="47" cy="0" rx="4" ry="3" fill="#fff" opacity="0.12" />
      <path d="M44 2 Q50 -2 56 2 M46 6 Q50 3 54 6" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
    </g>
  );
}

function Ponytail({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 30 Q18 10 50 6 Q82 10 82 30" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M18 30 Q20 24 30 26" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M72 24 Q94 16 98 38 Q100 60 90 76 Q86 82 80 72 Q88 54 84 36 Q82 28 76 26"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 34 Q90 46 88 60" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M80 38 Q86 48 84 58 M86 42 Q90 50 88 56" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <circle cx="74" cy="24" r="4.5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="74" cy="24" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="73" cy="23" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
    </g>
  );
}

function Combover({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M24 30 Q24 22 38 20 Q50 16 62 20 Q76 22 76 30" fill={fill} stroke="#000" strokeWidth={S} opacity="0.35" />
      <path d="M16 32 Q14 18 26 12 Q38 6 52 10 Q60 14 66 24 Q58 16 46 14 Q32 12 22 24 Q18 30 20 36"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M16 30 Q16 44 18 50" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M84 30 Q84 44 82 50" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M24 18 Q28 14 34 12" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M22 22 Q32 12 44 10" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function Elvis({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 30 Q18 10 50 6 Q82 10 82 30" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M26 26 Q24 4 38 -4 Q50 -8 58 0 Q62 10 54 20 Q46 28 36 30"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M34 6 Q42 -4 50 2" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.2" />
      <path d="M32 14 Q40 6 48 10" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
      <path d="M36 10 Q42 2 48 6 M34 16 Q40 10 46 14" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      <rect x="16" y="30" width="6" height="26" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="78" y="30" width="6" height="26" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M17 34 L17 50 M83 34 L83 50" stroke="#000" strokeWidth={0.5} opacity="0.15" />
    </g>
  );
}

function Ramen({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 24 Q18 34 50 36 Q82 34 82 24" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M18 24 Q50 16 82 24" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M22 24 Q50 18 78 24 Q78 30 50 32 Q22 30 22 24Z" fill="#F5DEB3" stroke="none" />
      <path d="M26 26 Q30 22 34 26 Q38 30 42 26 Q46 22 50 26 Q54 30 58 26 Q62 22 66 26 Q70 30 74 26 Q78 22 80 26" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" />
      <path d="M30 28 Q34 24 38 28 Q42 32 46 28 Q50 24 54 28 Q58 32 62 28 Q66 24 70 28" fill="none" stroke={fill} strokeWidth={1.2} opacity="0.4" strokeLinecap="round" />
      <ellipse cx="62" cy="24" rx="5" ry="4" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="62" cy="24" r="2" fill="#FFD700" />
      <ellipse cx="61" cy="23" rx="0.8" ry="0.5" fill="#fff" opacity="0.4" />
      <line x1="40" y1="22" x2="34" y2="0" stroke="#8B6E4E" strokeWidth={2.2} strokeLinecap="round" />
      <line x1="44" y1="22" x2="42" y2="0" stroke="#8B6E4E" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M33 2 L35 0 M41 2 L43 0" stroke="#fff" strokeWidth={0.8} opacity="0.3" />
      <path d="M30 16 Q28 10 31 4" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.35" />
      <path d="M50 14 Q48 8 51 2" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.35" />
      <path d="M40 12 Q38 6 40 0" fill="none" stroke="#ddd" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Long({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M10 32 Q10 8 50 4 Q90 8 90 32 L92 68 Q90 84 82 90 Q78 94 75 84 L74 42 Q50 26 26 42 L25 84 Q22 94 18 90 Q10 84 8 68Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 40 Q18 60 20 76 M82 40 Q82 60 80 76" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 36 Q24 56 24 72 M76 36 Q76 56 76 72" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M30 16 Q40 10 50 8 Q60 10 70 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M10 32 Q10 10 50 8 Q90 10 90 32 L90 58 Q88 66 80 62 L80 36 Q50 22 20 36 L20 62 Q12 66 10 58Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M16 36 Q16 48 18 56 M84 36 Q84 48 82 56" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M22 34 Q22 46 24 54 M78 34 Q78 46 76 54" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M18 56 Q20 60 24 58 M82 56 Q80 60 76 58" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Afro({ fill }: HairPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="28" rx="46" ry="36" fill={fill} stroke="#000" strokeWidth={S} />
      {[{x:32,y:14},{x:54,y:8},{x:72,y:18},{x:20,y:28},{x:80,y:30},{x:42,y:6},{x:62,y:12},{x:14,y:42},{x:86,y:42},{x:36,y:22},{x:66,y:26},{x:50,y:2},{x:26,y:38},{x:74,y:38}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i<6?2.5:2} fill="#000" opacity={0.1+((i%3)*0.02)} />
      ))}
      <path d="M28 12 Q40 4 50 6 Q60 4 72 12" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.12" />
      <path d="M16 34 Q20 26 28 20" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function Wavy({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M10 34 Q10 10 50 6 Q90 10 90 34 L92 52 Q90 62 82 56 Q78 50 80 62 Q78 74 70 68 L70 38 Q50 22 30 38 L30 68 Q22 74 20 62 Q22 50 18 56 Q10 62 8 52Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 38 Q20 48 18 54 M82 38 Q80 48 82 54" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 36 Q26 46 24 56 M76 36 Q74 46 76 56" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M30 14 Q40 8 50 10 Q60 8 70 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Pigtails({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M16 30 Q16 8 50 6 Q84 8 84 30" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="6" x2="50" y2="24" stroke="#000" strokeWidth={1} opacity="0.25" />
      <circle cx="6" cy="38" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="4" cy="56" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="6" cy="72" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="38" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="96" cy="56" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="72" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="8" cy="34" r="3" fill="#fff" opacity="0.1" />
      <circle cx="96" cy="34" r="3" fill="#fff" opacity="0.1" />
      <circle cx="16" cy="30" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="16" cy="30" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="15" cy="29" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
      <circle cx="84" cy="30" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="84" cy="30" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="83" cy="29" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 34 Q18 22 28 18" fill="none" stroke={fill} strokeWidth={1} opacity="0.35" />
      {[{x:20,y:28},{x:23,y:24},{x:27,y:21},{x:22,y:32},{x:26,y:28}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={fill} opacity={0.3} />
      ))}
      <path d="M32 16 Q60 4 92 26 L94 62 Q92 72 86 68 L86 36 Q66 12 36 20Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M60 14 Q72 12 82 20" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  const dreads = [[6,28,46],[16,26,50],[26,24,48],[36,22,44],[46,21,42],[56,22,46],[66,24,48],[76,26,44],[86,28,40]];
  return (
    <g>
      <path d="M8 28 Q8 8 50 6 Q92 8 92 28" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M8 30 Q8 6 50 4 Q92 6 92 30" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="4" x2="50" y2="24" stroke="#000" strokeWidth={1} opacity="0.2" />
      {[{x:14,d:1},{x:86,d:-1}].map(({x,d},bi) => (
        <g key={bi}>
          <path d={`M${x} 36 L${x-d*4} 48 L${x+d*2} 54 L${x-d*4} 62 L${x+d*2} 68 L${x-d*4} 78 L${x} 86`}
            fill="none" stroke={fill} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${x} 36 L${x-d*4} 48 L${x+d*2} 54 L${x-d*4} 62 L${x+d*2} 68 L${x-d*4} 78 L${x} 86`}
            fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${x-d*1} 42 L${x+d*1} 42 M${x-d*2} 56 L${x+d*2} 56 M${x-d*2} 70 L${x+d*2} 70`}
            stroke="#000" strokeWidth={0.8} opacity="0.15" />
          <path d={`M${x-d*1} 44 L${x+d*1} 44`} stroke="#fff" strokeWidth={0.6} opacity="0.12" />
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
      <path d="M14 30 Q14 10 50 6 Q86 10 86 30 Q78 20 50 18 Q22 20 14 30Z" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="0" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M44 -4 Q50 2 56 -4" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.25" />
      <path d="M42 2 Q50 8 58 2" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <ellipse cx="47" cy="-2" rx="4" ry="3" fill="#fff" opacity="0.1" />
      <path d="M38 22 Q40 12 43 6 M62 22 Q60 12 57 6" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.15" />
      <path d="M34 24 Q32 18 30 22 M66 24 Q68 18 70 22" stroke={fill} strokeWidth={1} opacity="0.5" />
      <line x1="46" y1="-6" x2="40" y2="-14" stroke="#8B6E4E" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function Bangs({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M8 28 Q8 6 50 2 Q92 6 92 28 L92 60 Q90 68 82 64 L82 36 Q50 18 18 36 L18 64 Q10 68 8 60Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M16 36 Q16 50 16 58 M84 36 Q84 50 84 58" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M22 34 Q22 46 22 54 M78 34 Q78 46 78 54" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M30 12 Q40 6 50 6 Q60 6 70 12" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Twintails({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M12 30 Q12 6 50 4 Q88 6 88 30" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="4" x2="50" y2="22" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M14 34 Q4 42 2 58 Q0 78 6 90 Q12 98 18 86 Q10 70 14 54 Q16 44 22 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M86 34 Q96 42 98 58 Q100 78 94 90 Q88 98 82 86 Q90 70 86 54 Q84 44 78 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M8 50 Q6 62 8 74 M92 50 Q94 62 92 74" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <circle cx="16" cy="30" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="16" cy="30" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="15" cy="29" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
      <circle cx="84" cy="30" r="5" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="84" cy="30" r="2.5" fill="#fff" opacity="0.2" />
      <ellipse cx="83" cy="29" rx="1.5" ry="1" fill="#fff" opacity="0.25" />
    </g>
  );
}

function Mullet({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M16 30 Q16 10 50 8 Q84 10 84 30" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M82 32 Q94 36 96 58 Q98 80 90 92 Q84 96 80 84 Q88 66 84 46" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 32 Q6 36 4 58 Q2 80 10 92 Q16 96 20 84 Q12 66 16 46" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M86 42 Q90 56 88 72 M14 42 Q10 56 12 72" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M30 14 Q50 8 70 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
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
      <path d="M14 38 C12 24 18 14 28 4 C24 16 30 8 36 -2 C34 14 42 4 50 -8 C58 4 66 14 64 -2 C68 8 76 16 72 4 C82 14 88 24 86 38"
        fill="url(#flameHairGrad)" stroke="#000" strokeWidth={S}>
        <animateTransform attributeName="transform" type="translate" values="0,0;0.5,-1;-0.5,0;0,0" dur="0.6s" repeatCount="indefinite" />
      </path>
      <path d="M26 34 C28 22 34 12 38 4 C36 18 42 10 46 0" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.5;0.8;0.3;0.5" dur="0.7s" repeatCount="indefinite" />
      </path>
      <path d="M74 34 C72 22 66 12 62 4 C64 18 58 10 54 0" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.3;0.7;0.5;0.3" dur="0.8s" repeatCount="indefinite" />
      </path>
      <path d="M36 30 C38 20 44 14 48 6 M64 30 C62 20 56 14 52 6" fill="none" stroke="#FFEB3B" strokeWidth={0.8} opacity="0.3" />
      {[{cx:30,cy:2,r:1.5,c:'#FFD600',d:2},{cx:68,cy:4,r:1.2,c:'#FF9100',d:2.4},{cx:50,cy:-6,r:1.5,c:'#FFEB3B',d:1.8},{cx:40,cy:0,r:0.8,c:'#fff',d:2.6},{cx:60,cy:2,r:0.7,c:'#FFD600',d:2.2}].map((e,i) => (
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
      <path d="M12 36 C8 22 22 8 50 6 C78 8 92 22 88 36 L90 60 Q86 72 80 66 L80 42 Q50 20 20 42 L20 66 Q14 72 10 60Z"
        fill="url(#galaxyHairGrad)" stroke="#000" strokeWidth={S} />
      <path d="M30 20 Q40 14 50 18 Q60 14 70 20" fill="none" stroke="#E040FB" strokeWidth={1}>
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M24 32 Q36 26 50 30 Q64 26 76 32" fill="none" stroke="#00BCD4" strokeWidth={1}>
        <animate attributeName="opacity" values="0.25;0.45;0.25" dur="4s" begin="1s" repeatCount="indefinite" />
      </path>
      <path d="M18 44 Q28 38 40 42 Q52 38 62 42" fill="none" stroke="#E040FB" strokeWidth={0.8} opacity="0.2" />
      {[{cx:30,cy:16,r:1.5,d:2.2},{cx:50,cy:10,r:1,d:1.8},{cx:70,cy:16,r:1.5,d:2.5},{cx:24,cy:28,r:0.8,d:3},{cx:76,cy:28,r:0.8,d:2.8},{cx:18,cy:44,r:0.5,d:3},{cx:82,cy:44,r:0.5,d:2.5}].map((s,i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff">
          <animate attributeName="opacity" values={`${0.9-i*0.1};${0.2};${0.9-i*0.1}`} dur={`${s.d}s`} begin={`${i*0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx="40" cy="22" r={0.6} fill="#E040FB"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" begin="1s" repeatCount="indefinite" /></circle>
      <circle cx="60" cy="22" r={0.6} fill="#00BCD4"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="2.3s" begin="0.7s" repeatCount="indefinite" /></circle>
      <g><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" /><path d="M34 14 L34 18 M32 16 L36 16" stroke="#fff" strokeWidth={0.5} /></g>
      <g><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin="1s" repeatCount="indefinite" /><path d="M66 14 L66 18 M64 16 L68 16" stroke="#fff" strokeWidth={0.5} /></g>
      <g><animate attributeName="opacity" values="0;0.8;0" dur="2.5s" begin="0.5s" repeatCount="indefinite" /><path d="M50 6 L50 10 M48 8 L52 8" stroke="#fff" strokeWidth={0.4} /></g>
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
      <path d="M20 30 Q20 16 50 14 Q80 16 80 30" fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} />
      <path d="M20 28 L24 0 L32 22 L38 -4 L48 18 L56 -6 L62 16 L70 -2 L78 28"
        fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {[{x1:26,y1:20,x2:28,y2:6,b:0},{x1:48,y1:16,x2:50,y2:2,b:0.4},{x1:70,y1:20,x2:68,y2:6,b:0.8}].map((l,i) => (
        <path key={i} d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`} stroke="#fff" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.2s" begin={`${l.b}s`} repeatCount="indefinite" />
        </path>
      ))}
      <path d="M38 18 L40 4 M60 16 L58 4" stroke="#fff" strokeWidth={0.8} opacity="0.3" />
      {[{d:'M34 4 L36 0 L32 2',c:'#00FFFF',v:'0.6;1;0;0.8;0;0.6',t:0.8},{d:'M64 2 L62 -2 L66 0',c:'#FF00FF',v:'0;0.8;0.6;0;1;0',t:0.9},{d:'M44 -2 L46 -6 L42 -4',c:'#00FFFF',v:'0;0.7;0;0.5;0',t:1.1},{d:'M56 4 L54 0 L58 2',c:'#FF00FF',v:'0.5;0;0.8;0;0.5',t:1}].map((s,i) => (
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
      <path d="M16 30 Q16 8 50 4 Q84 8 84 30 L78 38 L70 34 L62 40 L50 34 L38 40 L30 34 L22 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 18 L30 30 M42 14 L40 32 M58 14 L60 32 M70 18 L70 30" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M36 12 Q44 6 54 6 Q64 6 70 12" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
    </g>
  );
}

function LongFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M12 28 Q10 24 12 36 L14 56 Q12 62 10 56 L8 36 Q8 24 12 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M88 28 Q90 24 88 36 L86 56 Q88 62 90 56 L92 36 Q92 24 88 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M11 32 L11 48 M89 32 L89 48" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      <path d="M42 26 Q50 20 58 26" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M44 24 Q50 20 56 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BobFront({ fill }: HairPartProps) {
  return (<g>
    <path d="M10 28 L12 52 Q14 58 18 54 L16 34 Q14 26 10 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M90 28 L88 52 Q86 58 82 54 L84 34 Q86 26 90 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M11 32 L12 46 M89 32 L88 46" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    <path d="M14 50 Q16 54 20 52 M86 50 Q84 54 80 52" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" />
  </g>);
}

function WavyFront({ fill }: HairPartProps) {
  return (<g>
    <path d="M10 30 Q8 38 10 48 Q12 56 14 50 Q12 40 12 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M90 30 Q92 38 90 48 Q88 56 86 50 Q88 40 88 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M11 34 Q10 42 11 48 M89 34 Q90 42 89 48" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function SideshaveFront({ fill }: HairPartProps) {
  return (<g>
    <path d="M88 26 Q90 32 90 46 Q88 52 86 46 L86 30Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M50 22 Q66 18 80 26" fill={fill} stroke="#000" strokeWidth={2} opacity="0.6" />
    <path d="M87 30 L87 42" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function AfroFront({ fill }: HairPartProps) {
  return (
    <g>
      <circle cx="30" cy="28" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="24" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="70" cy="28" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="34" cy="24" r="2" fill="#fff" opacity="0.1" />
      <circle cx="54" cy="20" r="2" fill="#fff" opacity="0.1" />
      <circle cx="42" cy="22" r="1.5" fill="#000" opacity="0.1" />
      <circle cx="58" cy="20" r="1.5" fill="#000" opacity="0.1" />
    </g>
  );
}

function DreadsFront({ fill }: HairPartProps) {
  return (
    <g>
      <rect x="32" y="22" width="7" height="20" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="44" y="20" width="7" height="18" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="58" y="22" width="7" height="19" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M35.5 28 L35.5 38 M47.5 26 L47.5 34 M61.5 28 L61.5 37" stroke="#000" strokeWidth={0.5} opacity="0.1" />
    </g>
  );
}

function PigtailsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 30 Q28 22 40 24 Q50 18 60 24 Q72 22 78 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="18" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M34 24 Q38 20 42 24 M58 24 Q62 20 66 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BraidsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 30 Q26 20 40 22 Q50 16 60 22 Q74 20 80 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="16" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.25" />
      <path d="M34 22 Q38 18 42 22 M58 22 Q62 18 66 22" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BunFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 32 Q22 22 38 22 Q50 18 62 22 Q78 22 82 32" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 24 Q36 20 42 22 M58 22 Q64 20 68 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function TwintailsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 30 Q24 18 38 20 Q50 14 62 20 Q76 18 82 30 L76 36 L68 32 L60 38 L50 32 L40 38 L32 32 L24 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M34 20 L34 30 M66 20 L66 30" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M42 18 Q50 14 58 18" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function MulletFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 30 Q26 22 40 22 Q50 18 60 22 Q74 22 80 30 L74 34 L66 30 L58 34 L50 30 L42 34 L34 30 L26 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 22 Q44 18 50 18 Q56 18 64 22" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function CurlyFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* 3 curl bumps along the forehead hairline */}
      <circle cx="28" cy="28" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="24" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="72" cy="28" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="36" cy="26" r="2.5" fill="#fff" opacity="0.1" />
      <circle cx="58" cy="22" r="2.5" fill="#fff" opacity="0.1" />
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
