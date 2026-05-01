/** Front hair overlay variants — see hairShared.tsx for props + helpers. */
import { HairPartProps, S } from './hairShared';

function BangsFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Chunky bangs with soft wavy bottom */}
      <path d="M18 34 Q18 14 50 8 Q82 14 82 34 Q74 36 66 33 Q58 36 50 33 Q42 36 34 33 Q26 36 18 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 22 L32 33 M44 18 L42 33 M56 18 L58 33 M68 22 L68 33" stroke="#000" strokeWidth={0.6} opacity="0.1" />
      <path d="M38 16 Q46 10 56 10 Q66 10 72 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
    </g>
  );
}

function LongFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Temple wisps — short locks framing only the upper face, stops above eye line */}
      <path d="M10 32 Q7 38 10 44 Q14 46 16 42 Q18 36 14 32 Q12 30 10 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M90 32 Q93 38 90 44 Q86 46 84 42 Q82 36 86 32 Q88 30 90 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M12 36 L13 42 M88 36 L87 42" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
      {/* Top parting hint */}
      <path d="M44 28 C48 24 52 24 56 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M46 26 C48 22 52 22 54 26" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BobFront({ fill }: HairPartProps) {
  return (<g>
    {/* Side cheek-tips — soft inward curl above jaw, stops above eye line */}
    <path d="M9 32 Q6 40 10 46 Q14 48 18 44 Q20 38 16 32 Q12 30 9 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M91 32 Q94 40 90 46 Q86 48 82 44 Q80 38 84 32 Q88 30 91 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M11 36 L12 42 M89 36 L88 42" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
    {/* Top parting hint */}
    <path d="M44 28 C48 24 52 24 56 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
  </g>);
}

function WavyFront({ fill }: HairPartProps) {
  return (<g>
    {/* Wavy temple wisps — gentle S-curves above eye line */}
    <path d="M8 34 Q6 40 10 44 Q14 46 16 42 Q18 36 14 32 Q10 30 8 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M92 34 Q94 40 90 44 Q86 46 84 42 Q82 36 86 32 Q90 30 92 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M10 38 L11 42 M90 38 L89 42" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
  </g>);
}

function SideshaveFront({ fill }: HairPartProps) {
  return (<g>
    {/* Right side volume — capped above eye line */}
    <path d="M86 30 Q88 36 87 44 Q85 46 84 44 L84 34Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M52 26 Q66 22 80 30" fill={fill} stroke="#000" strokeWidth={2} opacity="0.6" />
    <path d="M85 34 L85 42" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function AfroFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Side puffs — volumetric but capped above cheekbone (y≤48) */}
      <path d="M6 36 Q3 44 7 48 Q11 50 12 46 Q9 42 9 36 Q7 33 6 36Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M94 36 Q97 44 93 48 Q89 50 88 46 Q91 42 91 36 Q93 33 94 36Z"
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
      {/* Forehead-only dreads — short tapered tufts above the eye line (y<34) */}
      <path d="M30 22 C29 26 28 30 30 33 Q33.5 35 37 33 C39 30 38 26 37 22 Q33.5 20 30 22Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M46 20 C45 24 44 28 46 31 Q49.5 33 53 31 C55 28 54 24 53 20 Q49.5 18 46 20Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M62 22 C61 26 60 30 62 33 Q65.5 35 69 33 C71 30 70 26 69 22 Q65.5 20 62 22Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Segment wraps */}
      <path d="M31 27 L36 27 M32 30 L35 30 M47 25 L52 25 M48 28 L51 28 M63 27 L68 27 M64 30 L67 30" stroke="#000" strokeWidth={0.6} opacity="0.12" />
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
      <path d="M20 32 Q26 20 40 22 Q50 16 60 22 Q74 20 80 32 Q72 34 64 32 Q56 34 50 30 Q44 34 36 32 Q28 34 20 32Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 22 L36 30 M64 22 L64 30" stroke="#000" strokeWidth={0.5} opacity="0.1" />
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
      {/* Side puff overlaps — raised above eye line */}
      <circle cx="12" cy="38" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="88" cy="38" r="5" fill={fill} stroke="#000" strokeWidth={1.5} />
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
      {/* Sleek temple strands — straight, narrow, stops above eye line */}
      <path d="M11 32 L9 44 Q12 46 16 44 L18 34 Q14 30 11 32Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M89 32 L91 44 Q88 46 84 44 L82 34 Q86 30 89 32Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M12 36 L11 42 M88 36 L89 42" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
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
      {/* Side layer overlays — capped at y=46, above eye line */}
      <path d="M14 34 Q12 40 14 46 Q17 47 20 44 L20 38Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M86 34 Q88 40 86 46 Q83 47 80 44 L80 38Z"
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
      {[32, 38, 44, 50, 56, 62, 68].map((x) => (
        <line key={x} x1={x} y1={32} x2={x} y2={28} stroke="#000" strokeWidth={0.8} opacity="0.15" />
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
      {/* Loose temple strands — capped above eye line */}
      <path d="M13 32 Q11 38 13 44 Q15 46 16 42 L15 38 Q13 32 13 32Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M87 32 Q89 38 87 44 Q85 46 84 42 L85 38 Q87 32 87 32Z"
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
      {/* Sharp straight bangs overlay — the iconic blunt fringe (above eye line) */}
      <path d="M20 32 Q20 14 50 10 Q80 14 80 32 L80 34 L20 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Sharp cut line at bottom */}
      <line x1="20" y1="34" x2="80" y2="34" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      {/* Strand lines for sleek look */}
      <path d="M32 18 L32 36 M42 14 L42 36 M50 12 L50 36 M58 14 L58 36 M68 18 L68 36" stroke="#000" strokeWidth={0.4} opacity="0.06" />
      <path d="M36 16 Q44 12 50 12 Q56 12 64 16" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
    </g>
  );
}

function LobFront({ fill }: HairPartProps) {
  return (<g>
    {/* Cheek-tipped side strands — short blunt cut just past temple, stops above eye line */}
    <path d="M13 32 L11 44 Q12 47 16 46 L18 44 L20 36 Q17 30 13 32Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M87 32 L89 44 Q88 47 84 46 L82 44 L80 36 Q83 30 87 32Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M14 36 L13 42 M86 36 L87 42" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
  </g>);
}

function ShagFront({ fill }: HairPartProps) {
  return (<g>
    {/* Soft rounded fringe — curtain-like sections */}
    <path d="M20 34 Q26 24 38 26 Q44 22 50 24 Q56 22 62 26 Q74 24 80 34 L72 36 Q64 30 56 32 Q50 28 44 32 Q36 30 28 36Z"
      fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    {/* Side feathered layers — short, capped above eye line */}
    <path d="M14 36 Q12 42 14 46 Q17 48 20 45 L20 40Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M86 36 Q88 42 86 46 Q83 48 80 45 L80 40Z"
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
    {/* Left side wisp — short, above eye line */}
    <path d="M12 34 Q10 40 12 44 Q15 46 18 44 L18 38Z"
      fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
  </g>);
}


function FrizzleFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Side frizz puffs — wilder than AfroFront, capped above cheekbone */}
      <path d="M4 36 Q2 46 6 50 Q10 52 12 48 Q8 42 8 36 Q6 32 4 36Z"
        fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M96 36 Q98 46 94 50 Q90 52 88 48 Q92 42 92 36 Q94 32 96 36Z"
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
      {/* Forehead fabric band — front edge sits above eye line */}
      <path d="M18 34 Q18 24 50 20 Q82 24 82 34 L80 36 Q66 32 50 30 Q34 32 20 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Fabric sheen on band */}
      <path d="M30 26 Q42 22 50 22 Q58 22 70 26" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" />
      <path d="M26 30 Q38 26 50 26 Q62 26 74 30" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
    </g>
  );
}

function LocsShortFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Forehead-only neat locs — short tufts above eye line (y<34) */}
      <path d="M30 22 C29 26 28 30 30 33 Q33.5 35 37 33 C39 30 38 26 37 22 Q33.5 20 30 22Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M46 20 C45 24 44 28 46 31 Q49.5 33 53 31 C55 28 54 24 53 20 Q49.5 18 46 20Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M62 22 C61 26 60 30 62 33 Q65.5 35 69 33 C71 30 70 26 69 22 Q65.5 20 62 22Z"
        fill={fill} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M31 27 L36 27 M32 30 L35 30 M47 25 L52 25 M48 28 L51 28 M63 27 L68 27 M64 30 L67 30"
        stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function PonytailFront({ fill }: HairPartProps) {
  return (
    <g>
      {/* Sleek pulled-back forehead cap — sits above eye line (y<34), no face coverage */}
      <path d="M16 32 C16 14 30 8 50 6 C70 8 84 14 84 32 Q74 33 66 31 Q58 33 50 31 Q42 33 34 31 Q26 33 16 32Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Pulled-back texture lines radiating from crown */}
      <path d="M28 24 C36 16 46 10 50 8 C54 10 64 16 72 24" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.14" />
      <path d="M32 22 C40 14 50 10 50 8 C50 10 60 14 68 22" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" />
      <path d="M22 28 C30 20 42 14 50 12" fill="none" stroke="#fff" strokeWidth={0.7} opacity="0.12" strokeLinecap="round" />
      <path d="M78 28 C70 20 58 14 50 12" fill="none" stroke="#fff" strokeWidth={0.7} opacity="0.12" strokeLinecap="round" />
      {/* Crown highlight */}
      <path d="M34 12 C42 8 58 8 66 12" fill="none" stroke="#fff" strokeWidth={1.4} opacity="0.2" strokeLinecap="round" />
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
  ponytail: PonytailFront,
} as const;
