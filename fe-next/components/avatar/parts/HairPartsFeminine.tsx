/** Femme-only hair styles — bows, ribbons, clips, princess braids. See hairShared.tsx for props + helpers. */
import { useAvatarUid } from '../AvatarUidContext';
import { HairPartProps, HairPolishDefs, HairPolish, S } from './hairShared';

const BOW = '#FF6FA5';
const BOW_DARK = '#C7427A';
const CLIP_BLUE = '#5BC0EB';
const CLIP_PINK = '#FFB7D5';

/** HeartBuns — two heart-shaped buns sit high on either side, full bangs cap behind. */
function HeartBuns({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M14 30 Q12 12 50 8 Q88 12 86 30";
  const heart = (cx: number, cy: number) => {
    const r = 6;
    return `M${cx} ${cy + r * 0.4}
      C${cx} ${cy + r * 0.1} ${cx - r * 0.4} ${cy - r * 0.4} ${cx - r * 0.7} ${cy - r * 0.4}
      C${cx - r * 1.1} ${cy - r * 0.4} ${cx - r * 1.1} ${cy + r * 0.2} ${cx - r * 0.55} ${cy + r * 0.45}
      C${cx - r * 0.25} ${cy + r * 0.7} ${cx} ${cy + r} ${cx} ${cy + r}
      C${cx} ${cy + r} ${cx + r * 0.25} ${cy + r * 0.7} ${cx + r * 0.55} ${cy + r * 0.45}
      C${cx + r * 1.1} ${cy + r * 0.2} ${cx + r * 1.1} ${cy - r * 0.4} ${cx + r * 0.7} ${cy - r * 0.4}
      C${cx + r * 0.4} ${cy - r * 0.4} ${cx} ${cy + r * 0.1} ${cx} ${cy + r * 0.4}Z`;
  };
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="heartBuns" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="heartBuns" d={cap} />
      {/* Center part */}
      <line x1="50" y1="8" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Left heart bun */}
      <path d={heart(28, 8)} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right heart bun */}
      <path d={heart(72, 8)} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Wrap detail on each heart */}
      <path d="M24 8 Q28 11 32 8" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <path d="M68 8 Q72 11 76 8" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      {/* Tiny bow accent on each bun */}
      <path d="M28 4 L24 1 L24 6 L28 4Z" fill={BOW} stroke={BOW_DARK} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M28 4 L32 1 L32 6 L28 4Z" fill={BOW} stroke={BOW_DARK} strokeWidth={0.8} strokeLinejoin="round" />
      <circle cx="28" cy="4" r="1.2" fill={BOW_DARK} />
      <path d="M72 4 L68 1 L68 6 L72 4Z" fill={BOW} stroke={BOW_DARK} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M72 4 L76 1 L76 6 L72 4Z" fill={BOW} stroke={BOW_DARK} strokeWidth={0.8} strokeLinejoin="round" />
      <circle cx="72" cy="4" r="1.2" fill={BOW_DARK} />
      {/* Heart highlights */}
      <ellipse cx="26" cy="6" rx="2" ry="1.2" fill="#fff" opacity="0.3" />
      <ellipse cx="70" cy="6" rx="2" ry="1.2" fill="#fff" opacity="0.3" />
      {/* Crown sheen */}
      <path d="M34 12 C42 8 58 8 66 12" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

/** SideBow — long flowing hair gathered to one side with a giant statement bow at the gather point. */
function SideBow({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 36 C8 20 18 8 34 4 Q50 0 66 4 C82 8 92 20 90 36 C92 50 90 64 86 76 Q82 86 78 78 Q80 64 78 52 Q70 36 50 34 Q30 36 22 52 Q20 64 22 78 Q18 86 14 76 C8 64 8 50 10 36Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="sideBow" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="sideBow" d={cap} />
      {/* Gathered side ponytail spilling over right shoulder */}
      <path d="M70 18 C84 16 92 22 92 34 C94 48 90 60 84 70 Q80 76 78 70 Q82 60 84 48 Q82 36 76 28 Q72 22 68 22Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M82 30 C84 42 84 54 80 64" stroke="#fff" strokeWidth={1.2} opacity="0.2" strokeLinecap="round" />
      <path d="M78 32 C80 42 80 52 78 60" stroke="#fff" strokeWidth={0.7} opacity="0.12" strokeLinecap="round" />
      {/* Big statement bow at gather */}
      <path d="M70 18 L60 8 L62 24 L70 18Z" fill={BOW} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M70 18 L80 8 L78 24 L70 18Z" fill={BOW} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <ellipse cx="70" cy="18" rx="2.5" ry="3" fill={BOW_DARK} stroke="#000" strokeWidth={1.2} />
      {/* Bow ribbon tails dangling */}
      <path d="M68 22 Q66 30 67 36" fill="none" stroke={BOW} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M72 22 Q74 30 73 36" fill="none" stroke={BOW} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M68 22 Q66 30 67 36" fill="none" stroke="#000" strokeWidth={0.8} strokeLinecap="round" opacity="0.6" />
      <path d="M72 22 Q74 30 73 36" fill="none" stroke="#000" strokeWidth={0.8} strokeLinecap="round" opacity="0.6" />
      {/* Bow highlights */}
      <path d="M62 12 L66 14" stroke="#fff" strokeWidth={1} opacity="0.5" strokeLinecap="round" />
      <path d="M76 12 L72 14" stroke="#fff" strokeWidth={1} opacity="0.5" strokeLinecap="round" />
      {/* Hair sweep texture */}
      <path d="M30 12 Q50 6 68 14" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.22" strokeLinecap="round" />
      <path d="M36 16 Q52 12 64 18" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.13" strokeLinecap="round" />
    </g>
  );
}

/** MilkmaidBraids — single braid wraps over crown halo-style + small flower accents. */
function MilkmaidBraids({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M12 34 Q12 14 50 8 Q88 14 88 34";
  /* Halo braid arc — rope of overlapping chevron segments along the crown */
  const arcSegs = [];
  const segCount = 14;
  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    /* Arc from (12,12) over (50,-2) to (88,12) */
    const x = 12 + t * 76;
    const y = 12 - Math.sin(t * Math.PI) * 14;
    const tilt = i % 2 === 0 ? -2 : 2;
    arcSegs.push(
      <ellipse key={`a-${i}`} cx={x} cy={y + tilt * 0.3} rx={4} ry={3.2} fill={fill}
        stroke="#000" strokeWidth={1.2} strokeLinejoin="round"
        transform={`rotate(${tilt * 6} ${x} ${y})`} />
    );
  }
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="milkmaidBraids" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} />
      <HairPolish uid={u} keyName="milkmaidBraids" d={cap} />
      {/* Center part */}
      <line x1="50" y1="8" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Halo braid arc */}
      {arcSegs}
      {/* Tiny flowers tucked into braid */}
      <g>
        {[26, 50, 74].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={6 - (cx === 50 ? 4 : 0)} r="2.2" fill={CLIP_PINK} stroke="#000" strokeWidth={1} />
            <circle cx={cx} cy={6 - (cx === 50 ? 4 : 0)} r="0.8" fill={BOW_DARK} />
            <circle cx={cx - 2} cy={5 - (cx === 50 ? 4 : 0)} r="1.2" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
            <circle cx={cx + 2} cy={5 - (cx === 50 ? 4 : 0)} r="1.2" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
            <circle cx={cx} cy={4 - (cx === 50 ? 4 : 0)} r="1.2" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
            <circle cx={cx} cy={8 - (cx === 50 ? 4 : 0)} r="1.2" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
          </g>
        ))}
      </g>
      {/* Crown sheen below braid */}
      <path d="M30 24 C42 20 58 20 70 24" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" strokeLinecap="round" />
    </g>
  );
}

/** ButterflyClips — long flowing hair with two visible butterfly clips at the temples. */
function ButterflyClips({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M8 38 C6 22 16 6 32 4 Q50 0 68 4 C84 6 94 22 92 38 C94 56 92 72 88 80 Q82 86 80 78 Q82 64 80 50 Q70 32 50 30 Q30 32 20 50 Q18 64 20 78 Q18 86 12 80 C8 72 6 56 8 38Z";
  const butterfly = (cx: number, cy: number, color1: string, color2: string) => (
    <g>
      {/* Body */}
      <ellipse cx={cx} cy={cy} rx="0.8" ry="2.5" fill="#000" />
      {/* Upper wings */}
      <path d={`M${cx} ${cy - 1.5} Q${cx - 4} ${cy - 4} ${cx - 5} ${cy} Q${cx - 3} ${cy + 0.5} ${cx} ${cy - 0.5}Z`}
        fill={color1} stroke="#000" strokeWidth={0.7} strokeLinejoin="round" />
      <path d={`M${cx} ${cy - 1.5} Q${cx + 4} ${cy - 4} ${cx + 5} ${cy} Q${cx + 3} ${cy + 0.5} ${cx} ${cy - 0.5}Z`}
        fill={color1} stroke="#000" strokeWidth={0.7} strokeLinejoin="round" />
      {/* Lower wings */}
      <path d={`M${cx} ${cy} Q${cx - 3} ${cy + 1} ${cx - 4} ${cy + 3} Q${cx - 2} ${cy + 3.5} ${cx} ${cy + 1.5}Z`}
        fill={color2} stroke="#000" strokeWidth={0.7} strokeLinejoin="round" />
      <path d={`M${cx} ${cy} Q${cx + 3} ${cy + 1} ${cx + 4} ${cy + 3} Q${cx + 2} ${cy + 3.5} ${cx} ${cy + 1.5}Z`}
        fill={color2} stroke="#000" strokeWidth={0.7} strokeLinejoin="round" />
      {/* Wing dots */}
      <circle cx={cx - 3} cy={cy - 1.5} r="0.5" fill="#fff" opacity="0.7" />
      <circle cx={cx + 3} cy={cy - 1.5} r="0.5" fill="#fff" opacity="0.7" />
    </g>
  );
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="butterflyClips" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="butterflyClips" d={cap} />
      {/* Side strand highlights */}
      <path d="M12 44 Q14 60 12 78" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" strokeLinecap="round" />
      <path d="M88 44 Q86 60 88 78" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.18" strokeLinecap="round" />
      {/* Center part */}
      <line x1="50" y1="4" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Crown highlight */}
      <path d="M30 8 C42 4 58 4 70 8" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.2" strokeLinecap="round" />
      {/* Butterfly clips at temples */}
      {butterfly(18, 32, CLIP_PINK, BOW)}
      {butterfly(82, 32, CLIP_BLUE, '#3D9DC9')}
      {/* Lower butterfly clips for extra girly */}
      {butterfly(14, 56, CLIP_BLUE, '#3D9DC9')}
      {butterfly(86, 56, CLIP_PINK, BOW)}
    </g>
  );
}

/** LowPigtailsBow — low pigtails near the nape, each tied with a big bow. */
function LowPigtailsBow({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 36 C8 18 18 6 34 4 Q50 0 66 4 C82 6 92 18 90 36 C90 50 88 56 84 62 Q80 64 80 58 Q82 50 80 46 Q70 38 50 38 Q30 38 20 46 Q18 50 20 58 Q20 64 16 62 C12 56 10 50 10 36Z";
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="lowPigtailsBow" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="lowPigtailsBow" d={cap} />
      {/* Center part */}
      <line x1="50" y1="4" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.22" />
      {/* Left low pigtail — hangs from low temple area, narrow taper */}
      <path d="M16 64 C8 70 4 78 6 86 C8 92 14 92 16 86 C18 80 16 74 18 70 C20 66 18 64 16 64Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right low pigtail — mirror */}
      <path d="M84 64 C92 70 96 78 94 86 C92 92 86 92 84 86 C82 80 84 74 82 70 C80 66 82 64 84 64Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Pigtail strand textures */}
      <path d="M10 70 Q8 80 12 88" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.16" strokeLinecap="round" />
      <path d="M90 70 Q92 80 88 88" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.16" strokeLinecap="round" />
      <path d="M8 72 Q6 80 10 86" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      <path d="M92 72 Q94 80 90 86" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      {/* Big bow on left tie */}
      <path d="M16 66 L8 60 L10 74 L16 68Z" fill={BOW} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M16 66 L24 60 L22 74 L16 68Z" fill={BOW} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <ellipse cx="16" cy="67" rx="2" ry="2.5" fill={BOW_DARK} stroke="#000" strokeWidth={1} />
      <path d="M11 64 L14 65" stroke="#fff" strokeWidth={0.8} opacity="0.5" strokeLinecap="round" />
      <path d="M21 64 L18 65" stroke="#fff" strokeWidth={0.8} opacity="0.5" strokeLinecap="round" />
      {/* Big bow on right tie */}
      <path d="M84 66 L92 60 L90 74 L84 68Z" fill={BOW} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M84 66 L76 60 L78 74 L84 68Z" fill={BOW} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <ellipse cx="84" cy="67" rx="2" ry="2.5" fill={BOW_DARK} stroke="#000" strokeWidth={1} />
      <path d="M89 64 L86 65" stroke="#fff" strokeWidth={0.8} opacity="0.5" strokeLinecap="round" />
      <path d="M79 64 L82 65" stroke="#fff" strokeWidth={0.8} opacity="0.5" strokeLinecap="round" />
      {/* Crown sheen */}
      <path d="M30 8 C42 4 58 4 70 8" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

/** PrincessBraid — single thick rope braid down the back center, beaded with flower clips along its length. */
function PrincessBraid({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 36 C8 18 18 6 34 4 Q50 0 66 4 C82 6 92 18 90 36 C92 48 88 56 84 60 Q80 62 80 56 Q82 48 80 44 Q70 32 50 30 Q30 32 20 44 Q18 48 20 56 Q20 62 16 60 C12 56 8 48 10 36Z";
  /* Braid runs centered behind the head — visible portions only x∈[44,56] from y=82..96 (below face). Most braid hidden behind face but tip and weave segments emerge. */
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="princessBraid" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="princessBraid" d={cap} />
      {/* Center part flowing into braid */}
      <line x1="50" y1="4" x2="50" y2="30" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Side baby hairs framing face */}
      <path d="M14 38 Q10 50 14 62" fill="none" stroke="#000" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      <path d="M86 38 Q90 50 86 62" fill="none" stroke="#000" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      {/* Braid tube — tapered down + chevron weave */}
      <path d="M44 78 Q42 86 44 94 Q50 96 56 94 Q58 86 56 78Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Weave chevrons */}
      {[80, 84, 88, 92].map((y) => (
        <g key={y}>
          <path d={`M44 ${y} Q50 ${y + 2} 56 ${y}`} stroke="#000" strokeWidth={0.8} fill="none" opacity="0.28" />
          <path d={`M44 ${y + 1} Q50 ${y - 1} 56 ${y + 1}`} stroke="#fff" strokeWidth={0.6} fill="none" opacity="0.18" />
        </g>
      ))}
      {/* Flower clip at top of braid */}
      <circle cx="50" cy="78" r="2.5" fill={CLIP_PINK} stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="78" r="0.9" fill={BOW_DARK} />
      <circle cx="47" cy="77" r="1.4" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
      <circle cx="53" cy="77" r="1.4" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
      <circle cx="50" cy="74.5" r="1.4" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
      <circle cx="50" cy="80.5" r="1.4" fill={CLIP_PINK} stroke="#000" strokeWidth={0.6} />
      {/* Bow tied at braid tip */}
      <path d="M50 94 L46 98 L50 96 Z" fill={BOW} stroke="#000" strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M50 94 L54 98 L50 96 Z" fill={BOW} stroke="#000" strokeWidth={0.8} strokeLinejoin="round" />
      <ellipse cx="50" cy="95" rx="1" ry="1.2" fill={BOW_DARK} stroke="#000" strokeWidth={0.6} />
      {/* Crown sheen */}
      <path d="M30 8 C42 4 58 4 70 8" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

/** SideBraidBow — side-swept fishtail braid down one side with a bow at the gather. */
function SideBraidBow({ fill }: HairPartProps) {
  const u = useAvatarUid();
  const cap = "M10 36 C8 18 18 6 34 4 Q50 0 66 4 C82 6 92 18 90 36 C92 48 88 56 84 62 Q82 64 82 58 Q84 48 82 44 Q72 32 50 30 Q28 32 20 44 Q18 48 20 58 Q18 64 16 62 C12 56 8 48 10 36Z";
  /* Side braid emerges from upper-right, swoops down right side past shoulder */
  const braidSegs = [];
  const segCount = 8;
  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    /* Path from (78,28) curving down to (92,86) */
    const x = 78 + t * 14 - Math.sin(t * Math.PI) * 4;
    const y = 28 + t * 58;
    const w = 5.5 - t * 2;
    braidSegs.push(
      <g key={i}>
        <ellipse cx={x - w * 0.3} cy={y} rx={w * 0.65} ry={w * 0.55} fill={fill}
          stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
        <ellipse cx={x + w * 0.3} cy={y + 2} rx={w * 0.65} ry={w * 0.55} fill={fill}
          stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g>
      <defs><HairPolishDefs uid={u} keyName="sideBraidBow" /></defs>
      <path d={cap} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <HairPolish uid={u} keyName="sideBraidBow" d={cap} />
      {/* Side-swept top section pulling toward right */}
      <path d="M30 14 Q50 8 76 22" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.22" strokeLinecap="round" />
      <path d="M34 18 Q52 14 72 26" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.13" strokeLinecap="round" />
      {/* Braid */}
      {braidSegs}
      {/* Highlight ribbon on braid */}
      <path d="M80 32 Q86 56 90 80" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      {/* Bow at braid origin */}
      <path d="M78 24 L70 18 L74 32 L78 26Z" fill={BOW} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M78 24 L86 18 L82 32 L78 26Z" fill={BOW} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <ellipse cx="78" cy="25" rx="2" ry="2.5" fill={BOW_DARK} stroke="#000" strokeWidth={1} />
      <path d="M73 22 L76 23" stroke="#fff" strokeWidth={0.8} opacity="0.5" strokeLinecap="round" />
      <path d="M83 22 L80 23" stroke="#fff" strokeWidth={0.8} opacity="0.5" strokeLinecap="round" />
      {/* Tiny tie at braid tip */}
      <ellipse cx="92" cy="86" rx="3" ry="2" fill={BOW} stroke="#000" strokeWidth={1} />
    </g>
  );
}

export const HAIR_PARTS_FEMININE = {
  heartBuns: HeartBuns,
  sideBow: SideBow,
  milkmaidBraids: MilkmaidBraids,
  butterflyClips: ButterflyClips,
  lowPigtailsBow: LowPigtailsBow,
  princessBraid: PrincessBraid,
  sideBraidBow: SideBraidBow,
} as const;
