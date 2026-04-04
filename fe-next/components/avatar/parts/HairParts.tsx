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
      <path d="M20 36 Q20 24 50 20 Q80 24 80 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Spikes — moderate, upward-pointing tufts */}
      <path d="M24 32 L28 12 L36 26 L42 8 L50 22 L58 6 L64 24 L72 10 L78 32"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Inner spike texture */}
      <path d="M36 22 L38 12 M50 18 L51 10 M64 20 L66 12" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      <path d="M40 16 Q46 10 52 8" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      {/* Main curly volume — bumpy cloud following head shape */}
      <path d="M12 42 C8 34 10 22 20 14 C28 8 38 6 50 6 C62 6 72 8 80 14 C90 22 92 34 88 42 C92 50 90 60 84 64 Q86 56 86 48 Q84 36 78 30 Q50 18 22 30 Q16 36 14 48 Q14 56 16 64 C10 60 8 50 12 42Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Curl texture — small spiral hints */}
      <path d="M26 14 C30 10 34 14 32 18" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      <path d="M46 8 C50 4 54 8 52 12" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      <path d="M66 14 C70 10 74 14 72 18" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      {/* Side curl bumps */}
      <path d="M14 44 C18 40 20 44 18 48" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      <path d="M86 44 C82 40 80 44 82 48" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      {/* Highlights */}
      <path d="M30 10 Q42 4 50 6 Q58 4 70 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.16" />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  return (
    <g>
      {/* Thin cap closely following head — buzz cut feel */}
      <path d="M20 34 Q20 18 50 12 Q80 18 80 34" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Stubble texture dots */}
      {[
        {x:30,y:20},{x:38,y:16},{x:46,y:14},{x:54,y:14},{x:62,y:16},{x:70,y:20},
        {x:26,y:26},{x:34,y:22},{x:42,y:18},{x:50,y:16},{x:58,y:18},{x:66,y:22},{x:74,y:26},
        {x:30,y:30},{x:40,y:24},{x:50,y:20},{x:60,y:24},{x:70,y:30},
      ].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.2} fill="#000" opacity={0.1} />
      ))}
      <path d="M34 16 Q50 10 66 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.14" />
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
      {/* Mohawk strip — clamped within viewBox */}
      <path d="M38 30 L38 4 Q50 0 62 4 L62 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
      {/* Hair cap — sleek, pulled back */}
      <path d="M20 34 Q20 16 50 12 Q80 16 80 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Pulled-back texture */}
      <path d="M32 26 Q42 18 50 14 Q58 18 68 26" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      <path d="M36 24 Q44 16 50 12 Q56 16 64 24" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      {/* Ponytail swooping behind to the right */}
      <path d="M72 24 Q82 18 86 28 Q92 44 86 62 Q82 70 78 64 Q84 50 82 36 Q80 26 74 24"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Ponytail highlight */}
      <path d="M80 30 Q84 42 82 54" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      {/* Hair tie */}
      <ellipse cx="73" cy="24" rx="5" ry="3" fill={fill} stroke="#000" strokeWidth={2} />
      {/* Baby hairs at temples */}
      <path d="M22 34 Q20 38 22 42" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function Combover({ fill }: HairPartProps) {
  return (
    <g>
      {/* Thin base cap — receding look */}
      <path d="M24 34 Q24 26 38 24 Q50 20 62 24 Q76 26 76 34" fill={fill} stroke="#000" strokeWidth={S} opacity="0.35" />
      {/* Bold swooping combover — dramatic sweep from left to right */}
      <path d="M16 36 Q12 20 26 12 Q40 4 58 8 Q70 14 76 26 Q66 16 52 12 Q36 10 24 22 Q18 30 20 40Z"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Clear part line on left */}
      <path d="M20 32 Q18 22 26 14" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      {/* Comb lines showing sweep direction */}
      <path d="M24 26 Q36 14 52 12 M22 30 Q34 18 50 14" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      <path d="M26 22 Q38 12 54 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      {/* Side wisps at temples */}
      <path d="M16 36 Q14 44 16 52" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M84 34 Q86 42 84 50" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M16 36 Q14 44 16 52 M84 34 Q86 42 84 50" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
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
      {/* Sideburns — connected to cap, tapered downward */}
      <path d="M20 34 L18 40 Q16 50 18 58 Q20 62 22 58 Q24 50 22 40 L20 34Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M80 34 L82 40 Q84 50 82 58 Q80 62 78 58 Q76 50 78 40 L80 34Z"
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
      {/* Full long hair — cap + flowing sides tucked closer to head */}
      <path d="M14 36 Q14 14 50 10 Q86 14 86 36 Q86 50 82 68 Q80 80 76 84 Q72 86 72 76 Q74 58 74 44 Q50 28 26 44 Q26 58 28 76 Q28 86 24 84 Q20 80 18 68 Q14 50 14 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M20 44 Q20 58 22 72 M80 44 Q80 58 78 72" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M26 42 Q26 56 28 70 M74 42 Q74 56 72 70" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 18 Q42 12 50 12 Q58 12 68 18" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  return (
    <g>
      {/* Bob — rounded volume, chin-length, sides hug face */}
      <path d="M14 36 Q14 14 50 10 Q86 14 86 36 Q86 52 80 58 Q76 54 76 42 Q50 24 24 42 Q24 54 20 58 Q14 52 14 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Strand lines */}
      <path d="M18 42 Q18 48 20 54 M82 42 Q82 48 80 54" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 40 Q24 48 26 54 M76 40 Q76 48 74 54" stroke="#fff" strokeWidth={1} opacity="0.12" />
      {/* Curl tips */}
      <path d="M20 56 Q22 60 26 58 M80 56 Q78 60 74 58" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      <path d="M32 16 Q50 10 68 16" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
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
      {/* Wavy hair — cap with flowing S-curve sides */}
      <path d="M14 36 Q14 14 50 10 Q86 14 86 36 Q88 48 84 56 Q80 62 76 56 Q78 50 78 44 Q50 26 22 44 Q22 50 24 56 Q20 62 16 56 Q12 48 14 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Wave texture on sides */}
      <path d="M18 42 Q20 48 18 54 M82 42 Q80 48 82 54" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 40 Q26 46 24 52 M76 40 Q74 46 76 52" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 16 Q42 10 50 12 Q58 10 68 16" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
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
      {/* Left pigtail — within viewBox */}
      <path d="M18 34 C8 36 4 44 6 54 C8 64 10 72 14 76 C18 80 20 76 18 70 C16 62 12 54 10 48 C8 42 12 36 18 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right pigtail — within viewBox */}
      <path d="M82 34 C92 36 96 44 94 54 C92 64 90 72 86 76 C82 80 80 76 82 70 C84 62 88 54 90 48 C92 42 88 36 82 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Strand details */}
      <path d="M10 42 Q8 52 10 62 M14 44 Q12 54 14 66" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M90 42 Q92 52 90 62 M86 44 Q88 54 86 66" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Highlights */}
      <path d="M12 40 Q10 50 12 58" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M88 40 Q90 50 88 58" stroke="#fff" strokeWidth={1} opacity="0.12" />
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
      {/* Shaved left side — visible buzzed stubble pattern */}
      <path d="M20 36 Q20 24 32 22" fill="none" stroke={fill} strokeWidth={1.5} opacity="0.3" />
      {[{x:22,y:34},{x:25,y:30},{x:28,y:27},{x:24,y:37},{x:27,y:33},{x:30,y:29},{x:22,y:28},{x:26,y:24}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.3} fill={fill} opacity={0.25-(i%3)*0.04} />
      ))}
      {/* Shave demarcation line */}
      <path d="M34 22 Q36 28 34 34" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      {/* Cap on right side + swept-over volume */}
      <path d="M34 22 Q50 10 82 18 Q86 22 86 36 L86 58 Q84 66 78 62 L78 38 Q66 20 38 28Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M56 14 Q68 14 78 22" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M40 24 Q50 16 62 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  /* Each dread: [startX, startY, endX, endY, midBulge, width] — within viewBox */
  const dreads: [number,number,number,number,number,number][] = [
    [16,32, 14,72, -2, 7],
    [24,30, 20,70, -2, 6],
    [32,28, 30,68, 2, 6],
    [40,26, 38,66, -1, 6],
    [50,25, 50,64, 0, 6],
    [60,26, 62,66, 2, 6],
    [68,28, 70,68, -2, 6],
    [76,30, 80,70, 2, 6],
    [84,32, 86,72, 2, 7],
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
      {/* Left braid — pulled inward */}
      <g>{braidSegments(18, 40, 1)}</g>
      {/* Left braid center line */}
      <path d="M18 40 Q16 54 18 68 Q16 76 18 82" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M20 44 Q18 56 20 68" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Right braid — pulled inward */}
      <g>{braidSegments(82, 40, -1)}</g>
      {/* Right braid center line */}
      <path d="M82 40 Q84 54 82 68 Q84 76 82 82" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M80 44 Q82 56 80 68" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      {/* Beads at ends — within viewBox */}
      <ellipse cx="18" cy="84" rx={4} ry={3.5} fill={fill} stroke="#000" strokeWidth={1.8} />
      <ellipse cx="17" cy="83" rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
      <ellipse cx="82" cy="84" rx={4} ry={3.5} fill={fill} stroke="#000" strokeWidth={1.8} />
      <ellipse cx="81" cy="83" rx={1.2} ry={0.8} fill="#fff" opacity="0.25" />
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
      {/* Hair with bangs — cap + shoulder-length sides */}
      <path d="M14 36 Q14 12 50 8 Q86 12 86 36 Q86 50 82 58 Q78 54 78 42 Q50 24 22 42 Q22 54 18 58 Q14 50 14 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 42 Q18 48 20 54 M82 42 Q82 48 80 54" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M24 40 Q24 48 26 54 M76 40 Q76 48 74 54" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 14 Q42 8 50 10 Q58 8 68 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
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
      {/* Left tail — within viewBox */}
      <path d="M16 38 Q8 46 6 58 Q4 72 10 82 Q16 90 20 80 Q14 66 16 54 Q18 48 24 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right tail — within viewBox */}
      <path d="M84 38 Q92 46 94 58 Q96 72 90 82 Q84 90 80 80 Q86 66 84 54 Q82 48 76 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M10 52 Q8 62 10 70 M90 52 Q92 62 90 70" stroke="#fff" strokeWidth={1} opacity="0.12" />
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
      {/* Flame tongues emerging from head — within viewBox */}
      <path d="M16 40 C14 28 20 18 30 8 C26 20 32 12 38 2 C36 18 44 8 50 0 C56 8 64 18 62 2 C66 12 74 20 70 8 C80 18 86 28 84 40"
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
      {/* Neon spikes — within viewBox */}
      <path d="M22 32 L26 6 L34 26 L40 2 L50 22 L58 0 L64 20 L72 4 L78 32"
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
      {/* Base cap — shorter, sits higher on head */}
      <path d="M20 34 Q20 16 50 10 Q80 16 80 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Choppy textured top — taller with more volume */}
      <path d="M18 32 Q16 12 36 4 Q50 0 64 4 Q80 10 82 28 Q72 14 58 8 Q44 6 32 10 Q20 18 18 32Z"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Bold side-swept fringe across forehead — signature pixie */}
      <path d="M22 30 Q30 14 48 10 Q60 8 72 16 L66 24 Q56 14 44 14 Q32 18 22 30Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Choppy wispy tips around ears — exaggerated */}
      <path d="M18 34 Q14 40 16 48 Q20 44 22 38" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M80 34 Q84 38 82 44 Q78 40 78 34" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M16 42 Q14 46 16 50" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" opacity="0.7" />
      {/* Bold choppy texture lines */}
      <path d="M32 10 Q40 4 50 2 M58 6 Q66 4 72 10" fill="none" stroke="#000" strokeWidth={1} opacity="0.14" />
      <path d="M34 14 Q44 8 54 8" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" />
      <path d="M28 22 Q36 14 48 12" fill="none" stroke="#fff" strokeWidth={1} opacity="0.14" />
    </g>
  );
}

function Undercut({ fill }: HairPartProps) {
  return (
    <g>
      {/* Shaved sides — dot pattern showing skin */}
      {[{x:24,y:34},{x:27,y:31},{x:30,y:28},{x:26,y:36},{x:33,y:30},
        {x:70,y:28},{x:73,y:31},{x:76,y:34},{x:74,y:36},{x:67,y:30}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.3} fill={fill} opacity={0.22-(i%3)*0.03} />
      ))}
      {/* Dramatic slicked-back top — overlaps face circle */}
      <path d="M28 34 Q26 6 50 0 Q74 6 72 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Inner solid fill */}
      <path d="M32 32 Q30 10 50 4 Q70 10 68 32Z" fill={fill} stroke="none" />
      {/* Slick-back comb lines — strong directional texture */}
      <path d="M38 22 Q42 10 50 4 M62 22 Q58 10 50 4" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.16" />
      <path d="M34 24 Q38 14 46 6 M66 24 Q62 14 54 6" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      <path d="M42 20 Q46 10 50 2" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
      <path d="M58 20 Q54 10 50 2" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
      {/* Sharp undercut line separating top from shaved sides */}
      <path d="M28 34 Q40 28 50 26 Q60 28 72 34" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
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
      <path d="M14 36 Q14 14 50 10 Q86 14 86 36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Left curtain — straight hair flowing down */}
      <path d="M14 36 Q12 44 12 58 Q12 76 16 80 Q20 82 22 76 Q24 62 24 44 Q20 34 14 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right curtain */}
      <path d="M86 36 Q88 44 88 58 Q88 76 84 80 Q80 82 78 76 Q76 62 76 44 Q80 34 86 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Vertical strand lines */}
      <path d="M16 42 L16 72 M20 40 L20 74" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M84 42 L84 72 M80 40 L80 74" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      {/* Highlights */}
      <path d="M18 44 L18 68 M82 44 L82 68" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <path d="M32 18 Q50 12 68 18" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      {/* Blunt-cut bottom */}
      <path d="M14 76 Q18 80 22 76 M78 76 Q82 80 86 76" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
    </g>
  );
}

function Fade({ fill }: HairPartProps) {
  return (
    <g>
      {/* Fade gradient on sides — sparse dots at bottom, denser up */}
      {[{x:24,y:34},{x:27,y:33},{x:76,y:34},{x:73,y:33}].map((p,i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.9} fill={fill} opacity={0.15} />
      ))}
      {[{x:25,y:31},{x:28,y:29},{x:31,y:27},{x:75,y:31},{x:72,y:29},{x:69,y:27}].map((p,i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1.1} fill={fill} opacity={0.3} />
      ))}
      {/* Tall swept-back top volume — overlaps face circle */}
      <path d="M30 34 Q28 6 50 0 Q72 6 70 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Inner volume fill for solid look */}
      <path d="M34 32 Q34 10 50 4 Q66 10 66 32Z" fill={fill} stroke="none" />
      {/* Swept-back texture lines radiating from crown */}
      <path d="M40 22 Q44 10 50 4 M60 22 Q56 10 50 4" fill="none" stroke="#000" strokeWidth={1} opacity="0.14" />
      <path d="M36 24 Q40 12 48 6 M64 24 Q60 12 52 6" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Highlights showing swept shape */}
      <path d="M42 6 Q50 0 58 6" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.2" />
      <path d="M44 14 Q50 8 56 14" fill="none" stroke="#fff" strokeWidth={1} opacity="0.15" />
      {/* Fade demarcation line */}
      <path d="M30 34 Q40 28 50 26 Q60 28 70 34" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Cornrows({ fill }: HairPartProps) {
  return (
    <g>
      {/* Base cap — taller for more volume */}
      <path d="M18 30 Q18 12 50 6 Q82 12 82 30" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Raised cornrow ridges — bold thick braided rows radiating from crown */}
      {[
        'M22 30 Q26 20 34 14 Q42 8 50 8',
        'M28 30 Q32 20 40 14 Q46 10 50 8',
        'M36 28 Q40 18 46 12 Q48 10 50 8',
        'M50 8 Q52 10 54 12 Q60 18 64 28',
        'M50 8 Q54 10 60 14 Q68 20 72 30',
        'M50 8 Q58 8 66 14 Q74 20 78 30',
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#000" strokeWidth={2.5} opacity={0.3} strokeLinecap="round" />
      ))}
      {/* Raised ridge fill — visible bumps along each row */}
      {[
        {d: 'M24 28 Q28 18 36 14 Q42 10 46 12 Q40 14 34 20 Q30 24 28 28Z', o: 0.15},
        {d: 'M54 12 Q58 10 64 14 Q72 18 76 28 Q72 24 66 20 Q60 14 54 12Z', o: 0.15},
      ].map(({d, o}, i) => (
        <path key={`r${i}`} d={d} fill="#000" opacity={o} />
      ))}
      {/* Highlight on each ridge crest */}
      {[
        'M24 28 Q28 18 36 14 Q44 8 50 8',
        'M30 28 Q34 18 42 14 Q48 10 50 8',
        'M38 26 Q42 18 48 12',
        'M52 12 Q58 18 62 26',
        'M52 8 Q56 10 62 14 Q70 20 70 28',
        'M52 8 Q60 8 68 14 Q76 22 76 28',
      ].map((d, i) => (
        <path key={`h${i}`} d={d} fill="none" stroke="#fff" strokeWidth={1} opacity={0.2} strokeLinecap="round" />
      ))}
      {/* Scalp part lines between rows — visible gaps */}
      {[25, 32, 42, 58, 68, 75].map((x, i) => (
        <path key={`s${i}`}
          d={`M${x} ${30-i*0.3} Q${x+(i<3?2:-2)} ${20} ${50} ${10}`}
          fill="none" stroke="#000" strokeWidth={0.8} opacity={0.18} />
      ))}
      {/* Top crown highlight */}
      <path d="M40 10 Q46 6 50 6 Q54 6 60 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
    </g>
  );
}

function WolfCut({ fill }: HairPartProps) {
  return (
    <g>
      {/* Base cap — full volume */}
      <path d="M12 32 Q12 10 50 4 Q88 10 88 32" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Dramatic choppy top layers — big messy chunks */}
      <path d="M16 30 Q12 16 26 8 L34 18 L38 4 L46 16 L50 2 L54 16 L62 4 L66 18 L74 8 Q88 16 84 30"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Bold shaggy side layers — chunky pieces falling past ears */}
      <path d="M12 32 Q6 46 8 66 Q10 78 18 72 Q12 58 14 44"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M88 32 Q94 46 92 66 Q90 78 82 72 Q88 58 86 44"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Chunky shaggy wisps at ends */}
      <path d="M18 68 Q14 76 20 78 Q24 72 20 64" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M82 68 Q86 76 80 78 Q76 72 80 64" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M14 56 Q10 64 14 68 M86 56 Q90 64 86 68" fill={fill} stroke="#000" strokeWidth={1.8} />
      {/* Messy layer lines — bold */}
      <path d="M28 12 L34 6 M42 8 L46 2 M56 8 L60 2 M68 12 L72 6" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
      <path d="M10 42 Q10 52 12 62 M90 42 Q90 52 88 62" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      {/* Highlights */}
      <path d="M36 8 Q44 2 50 4 Q56 2 64 8" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" />
      <path d="M14 40 L14 56 M86 40 L86 56" stroke="#fff" strokeWidth={1} opacity="0.14" />
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
      {/* Heavy blunt bangs — thick fringe above eye line */}
      <path d="M18 36 Q18 14 50 10 Q82 14 82 36 L82 38 L18 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Bang cut line */}
      <line x1="18" y1="38" x2="82" y2="38" stroke="#000" strokeWidth={1.2} opacity="0.25" />
      {/* Strand details */}
      <path d="M32 14 L32 36 M44 12 L44 36 M56 12 L56 36 M68 14 L68 36" stroke="#000" strokeWidth={0.4} opacity="0.06" />
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
      {/* Tall flat-top block — sides overlap face circle at y=34 */}
      <path d="M22 34 L20 12 Q20 4 26 4 L74 4 Q80 4 80 12 L78 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Inner fill to ensure solidity */}
      <path d="M24 32 L22 14 Q22 6 28 6 L72 6 Q78 6 78 14 L76 32Z" fill={fill} stroke="none" />
      {/* Flat top edge — bold emphasis */}
      <line x1="26" y1="4" x2="74" y2="4" stroke="#000" strokeWidth={2} opacity="0.35" />
      {/* Angular side edges */}
      <line x1="20" y1="12" x2="22" y2="28" stroke="#000" strokeWidth={1.5} opacity="0.2" />
      <line x1="80" y1="12" x2="78" y2="28" stroke="#000" strokeWidth={1.5} opacity="0.2" />
      {/* Vertical texture lines — tight, uniform hair standing up */}
      {[28,33,38,43,48,53,58,63,68,73].map((x, i) => (
        <line key={i} x1={x} y1="6" x2={x} y2="26" stroke="#000" strokeWidth={0.6} opacity={0.08+i*0.004} />
      ))}
      {/* Highlights */}
      <path d="M32 6 Q50 4 68 6" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.15" />
      <path d="M26 12 L26 22 M74 12 L74 22" stroke="#fff" strokeWidth={0.8} opacity="0.1" />
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
      <path d="M30 26 Q28 8 42 1 Q50 0 58 1 Q72 8 70 26 Q62 14 50 12 Q38 14 30 26Z"
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

/** Curly crop fade — tall curly dome on faded sides */
function FadeCurly({ fill }: HairPartProps) {
  return (
    <g>
      {/* Fade dots on sides — skin visible at bottom, denser up */}
      {[{x:24,y:34},{x:27,y:32},{x:76,y:34},{x:73,y:32}].map((p,i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.9} fill={fill} opacity={0.15} />
      ))}
      {[{x:25,y:31},{x:29,y:29},{x:32,y:27},{x:75,y:31},{x:71,y:29},{x:68,y:27}].map((p,i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1.1} fill={fill} opacity={0.3} />
      ))}
      {/* Tall curly dome — overlaps face circle */}
      <path d="M28 34 Q28 6 40 1 Q46 0 50 0 Q54 0 60 1 Q72 6 72 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Inner solid fill */}
      <path d="M30 32 Q32 8 50 2 Q68 8 70 32Z" fill={fill} stroke="none" />
      {/* Curly bumps row 1 — top crown, bold */}
      <path d="M34 6 Q37 1 42 0 Q44 0 46 2" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M44 1 Q48 0 50 0 Q52 0 56 1" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M54 1 Q56 0 58 0 Q63 2 66 6" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Curly bumps row 2 */}
      <path d="M32 14 Q35 7 40 4 Q43 3 46 6" fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M44 5 Q48 2 50 2 Q52 2 56 5" fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M54 5 Q58 3 60 4 Q64 7 67 14" fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Curly bumps row 3 */}
      <path d="M32 22 Q35 14 40 10 Q43 9 46 12" fill={fill} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M44 11 Q48 8 51 9 Q54 8 56 11" fill={fill} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M56 11 Q58 8 61 10 Q64 14 66 20" fill={fill} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      {/* Fade demarcation line */}
      <path d="M28 34 Q40 28 50 26 Q60 28 72 34" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      {/* Highlights */}
      <path d="M42 1 Q48 0 54 1" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.2" />
      <path d="M36 8 Q42 4 48 6" fill="none" stroke="#fff" strokeWidth={1} opacity="0.16" />
    </g>
  );
}

function SideSwept({ fill }: HairPartProps) {
  return (
    <g>
      {/* Cap base */}
      <path d="M16 34 Q16 12 50 6 Q84 12 84 34" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Dramatic side-swept volume — big sweep from right to left */}
      <path d="M14 34 Q10 20 24 10 Q38 2 54 4 Q70 2 82 12 Q88 20 86 34 Q80 22 66 14 Q52 10 38 14 Q24 20 16 32Z"
        fill={fill} stroke="#000" strokeWidth={3} strokeLinejoin="round" />
      {/* Flowing sweep falling to the left — stays within viewBox */}
      <path d="M82 28 Q66 16 48 12 Q30 10 16 20 Q8 28 6 40 Q4 52 8 58 Q12 52 10 42 Q12 32 18 26"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right side tucked behind ear */}
      <path d="M84 34 Q88 40 86 48 Q82 42 82 36" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Bold sweep direction lines */}
      <path d="M74 18 Q56 12 36 18 M70 24 Q52 18 32 24" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      {/* Highlights following sweep */}
      <path d="M36 6 Q50 2 64 6" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" />
      <path d="M22 18 Q36 10 48 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M10 38 Q10 44 10 50" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
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
      {/* Side curtain strands framing face */}
      <path d="M14 34 Q12 42 12 54 Q14 58 18 54 Q20 46 20 38 Q18 32 14 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M86 34 Q88 42 88 54 Q86 58 82 54 Q80 46 80 38 Q82 32 86 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M15 38 L14 50 M85 38 L86 50" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
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
      {/* Bold choppy front fringe — bigger chunks */}
      <path d="M18 32 Q24 20 36 18 L40 26 L46 18 L50 24 L54 18 L60 26 L64 18 Q76 20 82 32 L74 36 L64 30 L56 36 L50 30 L44 36 L36 30 L26 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M38 20 L40 18 M48 18 L50 16 M60 20 L62 18" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M42 22 Q48 18 54 22" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" />
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

function LobFront({ fill }: HairPartProps) {
  return (<g>
    {/* Side curtain strands framing face */}
    <path d="M14 34 L12 58 Q12 64 18 62 L22 62 Q26 64 26 58 L26 42 Q20 32 14 34Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M86 34 L88 58 Q88 64 82 62 L78 62 Q74 64 74 58 L74 42 Q80 32 86 34Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M16 38 L14 54 M84 38 L86 54" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function ShagFront({ fill }: HairPartProps) {
  return (<g>
    {/* Choppy fringe chunks across forehead */}
    <path d="M18 34 Q22 22 36 18 L40 26 L46 18 L50 24 L54 18 L60 26 L64 18 Q78 22 82 34 L74 38 L64 32 L56 36 L50 30 L44 36 L36 32 L26 38Z"
      fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    <path d="M42 22 Q48 18 54 22" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" />
  </g>);
}

function CurlyBangsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Bouncy curly fringe across forehead */}
      <path d="M20 36 C18 30 22 24 30 26 C34 22 40 22 44 26 C48 22 54 20 58 24 C62 20 68 22 72 26 C78 24 82 30 80 36 L74 38 Q68 32 60 34 Q50 30 40 34 Q32 32 26 38Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 26 C34 24 38 24 40 26 M56 24 C58 22 62 22 64 24" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M38 26 Q44 22 50 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function SideSweptFront({ fill }: HairPartProps) {
  return (<g>
    {/* Swept fringe falling to the left */}
    <path d="M16 30 Q22 18 40 20 Q52 18 60 24 L54 32 L46 26 L38 30 L30 26 L22 32Z"
      fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    <path d="M28 22 Q38 18 48 20" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    {/* Left side volume overlay */}
    <path d="M8 36 Q6 44 8 52 Q10 56 12 50 L12 38Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
  </g>);
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
  lob: LobFront,
  shag: ShagFront,
  curlyBangs: CurlyBangsFront,
  sideSwept: SideSweptFront,
};
