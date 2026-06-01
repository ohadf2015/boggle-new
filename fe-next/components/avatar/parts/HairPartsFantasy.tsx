/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S, CrownHighlight } from './hairShared';

function FlameHair({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}flameHairGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="30%" stopColor="#FF6D00" />
          <stop offset="60%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
      </defs>
      {/* Flame tongues emerging from head — within viewBox */}
      <path d="M16 40 C14 28 20 18 30 8 C26 20 32 12 38 2 C36 18 44 8 50 0 C56 8 64 18 62 2 C66 12 74 20 70 8 C80 18 86 28 84 40"
        fill={`url(#${u}flameHairGrad)`} stroke="#000" strokeWidth={S} />
      {/* Inner flame glow lines — slow gentle pulse */}
      <path d="M28 36 C30 24 36 16 40 8 C38 22 44 14 48 4" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M72 36 C70 24 64 16 60 8 C62 22 56 14 52 4" fill="none" stroke="#FFD600" strokeWidth={1.5}>
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" repeatCount="indefinite" />
      </path>
      <path d="M38 34 C40 24 46 18 50 10 M62 34 C60 24 54 18 50 10" fill="none" stroke="#FFEB3B" strokeWidth={0.8} opacity="0.25" />
      {/* Ember particles — slow gentle float */}
      {[{cx:32,cy:8,r:1.5,c:'#FFD600',d:4},{cx:66,cy:10,r:1.2,c:'#FF9100',d:5},{cx:50,cy:4,r:1.5,c:'#FFEB3B',d:4.5}].map((e,i) => (
        <circle key={`${e.cx}-${e.cy}`} cx={e.cx} cy={e.cy} r={e.r} fill={e.c}>
          <animate attributeName="cy" values={`${e.cy};${Math.max(0, e.cy-3)};${Math.max(0, e.cy-6)};${e.cy}`} dur={`${e.d}s`} begin={`${i*0.8}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.25;0;0.6" dur={`${e.d}s`} begin={`${i*0.8}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* SYSTEMIC shared crown highlight — adds readable top pop even on wild flame gradient */}
      <CrownHighlight opacity={0.25} strokeWidth={1.2} />
    </g>
  );
}

function GalaxyHair(_props: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        {/* Static rich nebula gradient — no color cycling */}
        <linearGradient id={`${u}galaxyHairGrad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D1B3E" />
          <stop offset="25%" stopColor="#1A237E" />
          <stop offset="50%" stopColor="#4A148C" />
          <stop offset="75%" stopColor="#880E4F" />
          <stop offset="100%" stopColor="#1A237E" />
        </linearGradient>
      </defs>
      {/* Main hair shape — bob-like with galaxy fill */}
      <path d="M14 38 C10 24 24 12 50 10 C76 12 90 24 86 38 L88 60 Q84 72 78 66 L78 44 Q50 24 22 44 L22 66 Q16 72 12 60Z"
        fill={`url(#${u}galaxyHairGrad)`} stroke="#000" strokeWidth={S} />
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
        <circle key={`${s.cx}-${s.cy}`} cx={s.cx} cy={s.cy} r={s.r} fill="#fff">
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
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        {/* Static neon gradient — magenta to cyan, no color swapping */}
        <linearGradient id={`${u}neonHairGrad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF00FF" />
          <stop offset="40%" stopColor="#CC00FF" />
          <stop offset="70%" stopColor="#00DDFF" />
          <stop offset="100%" stopColor="#00FFFF" />
        </linearGradient>
      </defs>
      {/* Cap */}
      <path d="M20 36 Q20 22 50 18 Q80 22 80 36" fill={`url(#${u}neonHairGrad)`} stroke="#000" strokeWidth={S} />
      {/* Neon spikes — varied heights and organic curves */}
      <path d="M22 32 Q24 18 28 10 Q30 22 36 6 Q40 20 44 2 Q48 18 50 8 Q54 20 58 4 Q62 16 66 12 Q70 22 74 8 Q76 18 78 32"
        fill={`url(#${u}neonHairGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Glow streaks — slow soft pulse */}
      {[{x1:28,y1:24,x2:28,y2:10,b:0},{x1:50,y1:20,x2:50,y2:6,b:1.5},{x1:70,y1:24,x2:68,y2:8,b:3}].map((l) => (
        <path key={`${l.x1}-${l.y1}-${l.x2}-${l.y2}`} d={`M${l.x1} ${l.y1} L${l.x2} ${l.y2}`} stroke="#fff" strokeWidth={1.5}>
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" begin={`${l.b}s`} repeatCount="indefinite" />
        </path>
      ))}
      <path d="M40 22 L42 8 M60 20 L58 8" stroke="#fff" strokeWidth={0.8} opacity="0.25" />
      {/* Electric sparks — slower, less frantic */}
      {[{d:'M36 8 L38 4 L34 6',c:'#00FFFF',b:0},{d:'M62 8 L60 4 L64 6',c:'#FF00FF',b:1.5},{d:'M46 6 L48 2 L44 4',c:'#00FFFF',b:3},{d:'M56 8 L54 4 L58 6',c:'#FF00FF',b:4.5}].map((s,i) => (
        <g key={s.d}><animate attributeName="opacity" values="0;0.7;0.7;0" dur="4s" begin={`${s.b}s`} repeatCount="indefinite" /><path d={s.d} stroke={s.c} strokeWidth={i<2?1:0.8} fill="none" /></g>
      ))}
    </g>
  );
}

function Pixie({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M20 34 Q20 16 50 10 Q80 16 80 34";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="pixie" /></defs>
      {/* Base cap — shorter, sits higher on head */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="pixie" d={cap} />
      {/* Choppy textured top — taller with more volume */}
      <path d="M18 32 Q16 12 36 4 Q50 0 64 4 Q80 10 82 28 Q72 14 58 8 Q44 6 32 10 Q20 18 18 32Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
  const u = useAvatarUid();
  const top = 'M28 34 Q26 6 50 0 Q74 6 72 34Z';
  return (
    <g>
      <defs>
        <HairPolishDefs uid={u} keyName="undercut" />
        {/* VIP specialty: slick-back gloss gradient running front-to-crown */}
        <linearGradient id={`${u}hair-undercut-gloss`} x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Shaved sides — dot pattern showing skin */}
      {[{x:24,y:34},{x:27,y:31},{x:30,y:28},{x:26,y:36},{x:33,y:30},
        {x:70,y:28},{x:73,y:31},{x:76,y:34},{x:74,y:36},{x:67,y:30}].map((p,i) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={1.3} fill={fill} opacity={0.22-(i%3)*0.03} />
      ))}
      {/* Dramatic slicked-back top — base + shade + rim light + gloss */}
      <path d={top} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 32 Q30 10 50 4 Q70 10 68 32Z" fill={fill} stroke="none" />
      <path d={top} fill={`url(#${u}hair-undercut-shade)`} stroke="none" />
      <path d={top} fill={`url(#${u}hair-undercut-light)`} stroke="none" />
      <path d={top} fill={`url(#${u}hair-undercut-gloss)`} stroke="none" opacity="0.6" />
      {/* Slick-back comb lines — strong directional texture */}
      <path d="M38 22 Q42 10 50 4 M62 22 Q58 10 50 4" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.16" />
      <path d="M34 24 Q38 14 46 6 M66 24 Q62 14 54 6" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.1" />
      <path d="M42 20 Q46 10 50 2" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.28" strokeLinecap="round" />
      <path d="M58 20 Q54 10 50 2" fill="none" stroke="#fff" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      {/* Sharp undercut line separating top from shaved sides */}
      <path d="M28 34 Q40 28 50 26 Q60 28 72 34" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function SpaceBuns({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = 'M20 36 Q20 18 50 14 Q80 18 80 36';
  return (
    <g>
      <defs>
        <HairPolishDefs uid={u} keyName="spaceBuns" />
        {/* VIP specialty: radial sphere shading per bun (BigHead pattern) */}
        <radialGradient id={`${u}hair-spaceBuns-bun`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="75%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      {/* Cap underneath — base + shade + light */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <path d={cap} fill={`url(#${u}hair-spaceBuns-shade)`} stroke="none" />
      <path d={cap} fill={`url(#${u}hair-spaceBuns-light)`} stroke="none" />
      {/* Left bun — base + radial sphere shading */}
      <circle cx="30" cy="12" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="30" cy="12" r="10" fill={`url(#${u}hair-spaceBuns-bun)`} stroke="none" />
      {/* Right bun */}
      <circle cx="70" cy="12" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="70" cy="12" r="10" fill={`url(#${u}hair-spaceBuns-bun)`} stroke="none" />
      {/* Bun spiral details */}
      <path d="M26 10 A3 3 0 1 1 32 10 M28 14 A2 2 0 1 0 32 14" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.18" />
      <path d="M66 10 A3 3 0 1 1 72 10 M68 14 A2 2 0 1 0 72 14" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.18" />
      {/* Specular highlights — small sharp dot per bun */}
      <ellipse cx="26" cy="8" rx="1.8" ry="1.2" fill="#fff" opacity="0.55" />
      <ellipse cx="66" cy="8" rx="1.8" ry="1.2" fill="#fff" opacity="0.55" />
      {/* Strands leading to buns */}
      <path d="M36 22 Q34 18 30 16 M64 22 Q66 18 70 16" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.15" />
      {/* Part line */}
      <line x1="50" y1="14" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}


export const HAIR_PARTS_FANTASY = {
  flame: FlameHair, galaxy: GalaxyHair, neon: NeonHair,
  pixie: Pixie, undercut: Undercut, spaceBuns: SpaceBuns,
} as const;
