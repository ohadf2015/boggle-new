/** Back hair variants — see hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S } from './hairShared';

function Shag({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M14 36 Q14 14 50 8 Q86 14 86 36";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="shag" /></defs>
      {/* Full volume cap */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="shag" d={cap} />
      {/* Layered top with soft rounded layers */}
      <path d="M18 32 Q20 18 34 12 Q42 8 50 8 Q58 8 66 12 Q80 18 82 32"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Flowing side layers — smooth, chin-length */}
      <path d="M14 36 Q10 48 12 60 Q14 66 20 62 Q16 52 18 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M86 36 Q90 48 88 60 Q86 66 80 62 Q84 52 82 42"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Soft bangs — 3 rounded sections */}
      <path d="M22 30 Q30 22 38 26 Q42 22 50 20 Q58 22 62 26 Q70 22 78 30"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Strand texture */}
      <path d="M14 44 Q14 52 16 58 M86 44 Q86 52 84 58" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      {/* Highlights */}
      <path d="M38 10 Q48 6 50 8 Q52 6 62 10" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.16" />
      <path d="M16 42 L16 54 M84 42 L84 54" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function FlatTop({ fill }: HairPartProps) {
  const u = useAvatarUid();
  // Flat top with faded, tapering sides that hug the head — not a floating brick.
  const block = "M22 36 Q19 29 22 22 L25 11 Q25 8 29 8 L71 8 Q75 8 75 11 L78 22 Q81 29 78 36 Q50 30 22 36Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="flatTop" /></defs>
      <path d={block} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="flatTop" d={block} />
      {/* Bold flat top edge */}
      <line x1="28" y1="8.5" x2="72" y2="8.5" stroke="#000" strokeWidth={2} opacity="0.3" />
      {/* Side fade hints — shorter, lighter toward the jaw */}
      <path d="M23 28 Q21 32 23 35 M77 28 Q79 32 77 35" fill="none" stroke="#000" strokeWidth={1} opacity="0.14" />
      {/* Vertical texture — hair standing up */}
      {[30,35,40,45,50,55,60,65,70].map((x) => (
        <line key={`line-${x}`} x1={x} y1="11" x2={x} y2="23" stroke="#000" strokeWidth={0.6} opacity={0.09} />
      ))}
      {/* Highlights */}
      <path d="M30 10 Q50 8 70 10" fill="none" stroke="#fff" strokeWidth={1.3} opacity="0.16" />
      <path d="M27 13 L26 21 M73 13 L74 21" stroke="#fff" strokeWidth={0.7} opacity="0.1" />
    </g>
  );
}

function Lob({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M12 36 Q12 14 50 10 Q88 14 88 36 L90 72 Q88 78 82 74 L80 50 Q78 38 76 36 Q50 26 24 36 Q22 38 20 50 L18 74 Q12 78 10 72Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="lob" /></defs>
      {/* Long bob — between bob and long, rests on shoulders */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="lob" d={cap} />
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
  const u = useAvatarUid();
  const cap = "M20 36 Q20 18 50 14 Q80 18 80 36";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="fingerWaves" /></defs>
      {/* Sleek cap — 1920s finger wave base */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="fingerWaves" d={cap} />
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
  const u = useAvatarUid();
  const cap = "M8 42 C4 34 6 22 16 14 C24 8 36 4 50 4 C64 4 76 8 84 14 C94 22 96 34 92 42 C96 50 94 60 88 62 C92 56 90 48 88 44 Q50 18 12 44 C10 48 8 56 12 62 C6 60 4 50 8 42Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="curlyBangs" /></defs>
      {/* Full curly volume */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="curlyBangs" d={cap} />
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
  const u = useAvatarUid();
  const quiffCap = "M30 26 Q28 8 42 1 Q50 0 58 1 Q72 8 70 26 Q62 14 50 12 Q38 14 30 26Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="quiff" /></defs>
      {/* Shorter sides — tapered */}
      <path d="M22 36 Q22 28 30 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <path d="M78 36 Q78 28 70 24" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      {[{x:24,y:32},{x:27,y:28},{x:30,y:26},{x:74,y:26},{x:73,y:28},{x:76,y:32}].map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={1.2} fill={fill} opacity={0.25} />
      ))}
      {/* Big volume at front — the signature quiff */}
      <path d={quiffCap}
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="quiff" d={quiffCap} />
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
  const u = useAvatarUid();
  const dome = 'M28 34 Q28 6 40 1 Q46 0 50 0 Q54 0 60 1 Q72 6 72 34Z';
  return (
    <g>
      <defs>
        <HairPolishDefs uid={u} keyName="fadeCurly" />
        {/* VIP specialty: radial curl-cluster pop — softens dome into sphere */}
        <radialGradient id={`${u}hair-fadeCurly-pop`} cx="0.4" cy="0.25" r="0.8">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      {/* Fade dots on sides — skin visible at bottom, denser up */}
      {[{x:24,y:34},{x:27,y:32},{x:76,y:34},{x:73,y:32}].map((p,i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.9} fill={fill} opacity={0.15} />
      ))}
      {[{x:25,y:31},{x:29,y:29},{x:32,y:27},{x:75,y:31},{x:71,y:29},{x:68,y:27}].map((p,i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1.1} fill={fill} opacity={0.3} />
      ))}
      {/* Tall curly dome — base + inner fill + shade + light + sphere pop */}
      <path d={dome} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 32 Q32 8 50 2 Q68 8 70 32Z" fill={fill} stroke="none" />
      <path d={dome} fill={`url(#${u}hair-fadeCurly-shade)`} stroke="none" />
      <path d={dome} fill={`url(#${u}hair-fadeCurly-light)`} stroke="none" />
      <path d={dome} fill={`url(#${u}hair-fadeCurly-pop)`} stroke="none" />
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
  const u = useAvatarUid();
  const cap = "M18 36 Q18 14 50 8 Q82 14 82 36";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="sideSwept" /></defs>
      {/* Full cap base */}
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="sideSwept" d={cap} />
      {/* Side-swept volume — sweeps from right, falls left with clean shape */}
      <path d="M18 34 Q16 18 30 10 Q44 4 60 6 Q76 4 82 14 Q84 22 82 34 Q74 20 58 14 Q42 12 28 20 Q20 28 18 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Left side — longer section falling past ear */}
      <path d="M18 34 Q12 42 10 54 Q10 62 16 58 Q14 48 18 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Sweep lines */}
      <path d="M70 14 Q52 10 34 18" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.12" />
      {/* Highlights */}
      <path d="M38 6 Q52 2 62 6" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" />
      <path d="M12 42 Q12 48 14 54" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

export const HAIR_PARTS_TRENDY = {
  shag: Shag, flatTop: FlatTop, lob: Lob, fingerWaves: FingerWaves,
  curlyBangs: CurlyBangs, quiff: Quiff, fadeCurly: FadeCurly, sideSwept: SideSwept,
} as const;
