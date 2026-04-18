/** Front hair overlay variants — see hairShared.tsx for props + helpers. */
import { HairPartProps, S } from './hairShared';

function BangsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Chunky bangs with soft wavy bottom */}
      <path d="M18 34 Q18 14 50 8 Q82 14 82 34 Q74 40 66 36 Q58 42 50 36 Q42 42 34 36 Q26 40 18 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 22 L32 34 M44 18 L42 36 M56 18 L58 36 M68 22 L68 34" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M38 16 Q46 10 56 10 Q66 10 72 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
    </g>
  );
}

function LongFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Side strands framing face — fuller, matching improved back volume */}
      <path d="M10 34 C8 40 8 50 10 60 C12 66 16 64 16 58 C16 50 16 42 14 36 C12 32 10 32 10 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M90 34 C92 40 92 50 90 60 C88 66 84 64 84 58 C84 50 84 42 86 36 C88 32 90 32 90 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M12 38 C12 46 12 54 13 58 M88 38 C88 46 88 54 87 58" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
      {/* Top parting hint */}
      <path d="M44 28 C48 24 52 24 56 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M46 26 C48 22 52 22 54 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BobFront({ fill }: HairPartProps) {
  return (<g>
    {/* Side curtains — wider, matching improved back volume */}
    <path d="M8 34 C6 40 8 52 10 58 C12 62 18 60 18 54 C18 46 18 38 14 32 C12 30 8 32 8 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M92 34 C94 40 92 52 90 58 C88 62 82 60 82 54 C82 46 82 38 86 32 C88 30 92 32 92 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M11 38 C11 46 11 52 12 56 M89 38 C89 46 89 52 88 56" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
    {/* Curl-in tips */}
    <path d="M10 56 C12 60 16 60 18 56 M82 56 C84 60 88 60 90 56" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" />
    {/* Top parting hint */}
    <path d="M44 28 C48 24 52 24 56 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
  </g>);
}

function WavyFront({ fill }: HairPartProps) {
  return (<g>
    {/* Wavy side strands — fuller S-curves matching improved back */}
    <path d="M8 36 C6 44 8 52 10 58 C12 62 16 60 16 54 C16 48 14 42 12 36 C10 32 8 34 8 36Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M92 36 C94 44 92 52 90 58 C88 62 84 60 84 54 C84 48 86 42 88 36 C90 32 92 34 92 36Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M10 40 C10 46 10 52 11 56 M90 40 C90 46 90 52 89 56" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
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
      {/* Side volume visible in front — left and right puffs beside face */}
      <path d="M6 38 Q4 48 8 56 Q12 60 14 54 Q10 46 10 38 Q8 34 6 38Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M94 38 Q96 48 92 56 Q88 60 86 54 Q90 46 90 38 Q92 34 94 38Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Bumpy forehead hairline */}
      <path d="M16 38 C18 32 24 28 32 30 C38 26 44 26 50 28 C56 26 62 26 68 30 C76 28 82 32 84 38 L78 40 Q68 34 58 36 Q50 32 42 36 Q32 34 22 40Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
      <path d="M20 34 Q26 22 40 24 Q50 18 60 24 Q74 22 80 34 Q72 38 64 34 Q56 40 50 34 Q44 40 36 34 Q28 38 20 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 24 L36 32 M64 24 L64 32" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M44 22 Q50 18 56 22" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function MulletFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 34 Q28 26 42 26 Q50 22 58 26 Q72 26 78 34 Q70 38 62 34 Q56 38 50 34 Q44 38 38 34 Q30 38 22 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M38 26 Q46 22 50 22 Q54 22 62 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function CurlyFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Curly fringe — bigger bouncier curls at forehead, matching improved back */}
      <circle cx="22" cy="36" r="7" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="36" cy="30" r="7" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="50" cy="28" r="7" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="64" cy="30" r="7" fill={fill} stroke="#000" strokeWidth={2} />
      <circle cx="78" cy="36" r="7" fill={fill} stroke="#000" strokeWidth={2} />
      {/* Side puff overlaps */}
      <circle cx="12" cy="42" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="88" cy="42" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Highlights on curl tops */}
      <ellipse cx="34" cy="28" rx="2.5" ry="1.5" fill="#fff" opacity="0.1" />
      <ellipse cx="50" cy="26" rx="2.5" ry="1.5" fill="#fff" opacity="0.1" />
      <ellipse cx="66" cy="28" rx="2.5" ry="1.5" fill="#fff" opacity="0.1" />
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
      {/* Side curtain strands — matching improved back volume */}
      <path d="M10 34 C8 42 6 56 8 68 C10 72 16 70 16 64 C16 54 18 44 18 38 C16 32 12 32 10 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M90 34 C92 42 94 56 92 68 C90 72 84 70 84 64 C84 54 82 44 82 38 C84 32 88 32 90 34Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M12 40 L11 60 M88 40 L89 60" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
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
      {/* Soft layered fringe — 3 rounded sections */}
      <path d="M20 34 Q26 24 38 24 Q44 20 50 22 Q56 20 62 24 Q74 24 80 34 L72 36 Q64 30 56 32 Q50 28 44 32 Q36 30 28 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Side layer overlays */}
      <path d="M14 36 Q12 44 14 54 Q16 58 20 54 L20 40Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M86 36 Q88 44 86 54 Q84 58 80 54 L80 40Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M42 24 Q48 20 54 24" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" />
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
    {/* Soft rounded fringe — curtain-like sections */}
    <path d="M20 34 Q26 24 38 26 Q44 22 50 24 Q56 22 62 26 Q74 24 80 34 L72 36 Q64 30 56 32 Q50 28 44 32 Q36 30 28 36Z"
      fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    {/* Side layers visible in front */}
    <path d="M14 38 Q12 46 14 56 Q16 60 20 56 L20 42Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M86 38 Q88 46 86 56 Q84 60 80 56 L80 42Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M42 26 Q48 22 54 26" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" />
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
    {/* Swept fringe — falls to left side, clean shape */}
    <path d="M18 32 Q24 22 40 24 Q52 22 64 28 L58 34 L48 28 L38 32 L28 28 L22 34Z"
      fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    <path d="M30 26 Q40 22 50 24" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    {/* Left side longer piece */}
    <path d="M12 36 Q10 44 12 52 Q14 56 18 52 L18 40Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
  </g>);
}


function FrizzleFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Side frizz puffs beside face — wilder than AfroFront */}
      <path d="M4 38 Q2 50 6 58 Q10 62 12 56 Q8 48 8 38 Q6 34 4 38Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M96 38 Q98 50 94 58 Q90 62 88 56 Q92 48 92 38 Q94 34 96 38Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Bumpy forehead hairline — irregular bumps */}
      <path d="M16 38 C18 30 26 26 34 28 C40 24 46 24 50 26 C54 24 60 24 66 28 C74 26 82 30 84 38 L78 40 Q66 32 56 34 Q50 30 44 34 Q34 32 22 40Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Extra frizz tufts at hairline */}
      <circle cx="28" cy="36" r="3.5" fill={fill} stroke="#000" strokeWidth={1.3} />
      <circle cx="72" cy="36" r="3.5" fill={fill} stroke="#000" strokeWidth={1.3} />
      <circle cx="50" cy="32" r="3" fill={fill} stroke="#000" strokeWidth={1.2} />
    </g>
  );
}

function DuragFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Forehead fabric band — the front edge of the durag */}
      <path d="M18 38 Q18 28 50 24 Q82 28 82 38 L80 42 Q66 36 50 34 Q34 36 20 42Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Fabric sheen on band */}
      <path d="M30 30 Q42 26 50 26 Q58 26 70 30" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" />
      <path d="M26 34 Q38 30 50 30 Q62 30 74 34" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
    </g>
  );
}

function LocsShortFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* 3 short front-hanging locs — neat, shoulder-length-ish */}
      <path d="M34 26 C33 30 32 36 34 42 Q37.5 44 41 42 C43 36 42 30 41 26 Q37.5 24 34 26Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M46 24 C45 28 44 34 46 38 Q49.5 40 53 38 C55 34 54 28 53 24 Q49.5 22 46 24Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M58 26 C57 30 56 36 58 42 Q61.5 44 65 42 C67 36 66 30 65 26 Q61.5 24 58 26Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M35 32 L40 32 M36 36 L39 36 M47 30 L52 30 M48 34 L51 34 M59 32 L64 32 M60 36 L63 36"
        stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

export const HAIR_FRONT_MAP = {
  bangs: BangsFront, long: LongFront, bob: BobFront, wavy: WavyFront,
  sideshave: SideshaveFront, afro: AfroFront, dreads: DreadsFront, pigtails: PigtailsFront,
  braids: BraidsFront, bun: BunFront, twintails: TwintailsFront, mullet: MulletFront,
  curly: CurlyFront, pixie: PixieFront, straight: StraightFront, spaceBuns: SpaceBunsFront,
  wolfCut: WolfCutFront, cornrows: CornrowsFront, curtainBangs: CurtainBangsFront,
  halfUp: HalfUpFront, himecut: HimecutFront, lob: LobFront, shag: ShagFront,
  curlyBangs: CurlyBangsFront, sideSwept: SideSweptFront,
  frizzle: FrizzleFront, durag: DuragFront, locsShort: LocsShortFront,
} as const;
