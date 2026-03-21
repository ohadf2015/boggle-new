/**
 * Avatar Facial Hair Parts
 * 10 facial hair styles for male avatars, positioned on lower face.
 * Anchored at jaw/chin area: y≈56-80, cx=50 within viewBox 0 0 100 100.
 * Uses hairColor for fill to match head hair.
 */

import { STROKE_DETAIL } from './avatarDesignConstants';

const S = STROKE_DETAIL;

interface FacialHairProps {
  fill: string;
}

function None() {
  return null;
}

function Stubble({ fill }: FacialHairProps) {
  return (
    <g opacity="0.55">
      <circle cx="34" cy="62" r="0.5" fill={fill} />
      <circle cx="36" cy="64" r="0.5" fill={fill} />
      <circle cx="33" cy="66" r="0.5" fill={fill} />
      <circle cx="35" cy="68" r="0.5" fill={fill} />
      <circle cx="37" cy="66" r="0.5" fill={fill} />
      <circle cx="38" cy="63" r="0.5" fill={fill} />
      <circle cx="36" cy="60" r="0.5" fill={fill} />
      <circle cx="44" cy="68" r="0.5" fill={fill} />
      <circle cx="46" cy="70" r="0.5" fill={fill} />
      <circle cx="48" cy="69" r="0.5" fill={fill} />
      <circle cx="50" cy="71" r="0.5" fill={fill} />
      <circle cx="52" cy="69" r="0.5" fill={fill} />
      <circle cx="54" cy="70" r="0.5" fill={fill} />
      <circle cx="56" cy="68" r="0.5" fill={fill} />
      <circle cx="50" cy="67" r="0.5" fill={fill} />
      <circle cx="47" cy="67" r="0.5" fill={fill} />
      <circle cx="53" cy="67" r="0.5" fill={fill} />
      <circle cx="43" cy="58" r="0.4" fill={fill} />
      <circle cx="45" cy="57" r="0.4" fill={fill} />
      <circle cx="47" cy="58" r="0.4" fill={fill} />
      <circle cx="50" cy="57" r="0.4" fill={fill} />
      <circle cx="53" cy="58" r="0.4" fill={fill} />
      <circle cx="55" cy="57" r="0.4" fill={fill} />
      <circle cx="57" cy="58" r="0.4" fill={fill} />
      <circle cx="66" cy="62" r="0.5" fill={fill} />
      <circle cx="64" cy="64" r="0.5" fill={fill} />
      <circle cx="67" cy="66" r="0.5" fill={fill} />
      <circle cx="65" cy="68" r="0.5" fill={fill} />
      <circle cx="63" cy="66" r="0.5" fill={fill} />
      <circle cx="62" cy="63" r="0.5" fill={fill} />
      <circle cx="64" cy="60" r="0.5" fill={fill} />
      <circle cx="40" cy="65" r="0.4" fill={fill} />
      <circle cx="42" cy="67" r="0.4" fill={fill} />
      <circle cx="58" cy="67" r="0.4" fill={fill} />
      <circle cx="60" cy="65" r="0.4" fill={fill} />
    </g>
  );
}

function Mustache({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M42 57 Q44 55 47 56 Q50 57 50 57 Q50 57 53 56 Q56 55 58 57 Q58 59 55 59 Q52 59 50 60 Q48 59 45 59 Q42 59 42 57Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M44 56.5 Q47 55.5 50 57" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.2" />
    </g>
  );
}

function Goatee({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M42 57 Q44 55 47 56 Q50 57 50 57 Q50 57 53 56 Q56 55 58 57 Q58 59 55 59 Q52 59 50 60 Q48 59 45 59 Q42 59 42 57Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M44 63 Q44 61 46 61 Q48 62 50 62 Q52 62 54 61 Q56 61 56 63 Q56 68 54 71 Q52 73 50 74 Q48 73 46 71 Q44 68 44 63Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M47 64 Q50 65 53 64" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.15" />
    </g>
  );
}

function ShortBeard({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M32 56 Q34 54 38 55 Q42 56 44 57 L44 57 Q47 58 50 58 Q53 58 56 57 L56 57 Q58 56 62 55 Q66 54 68 56 Q70 60 68 66 Q66 72 62 74 Q58 76 54 77 Q52 77.5 50 78 Q48 77.5 46 77 Q42 76 38 74 Q34 72 32 66 Q30 60 32 56Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M41 57 Q44 55 47 56 Q50 57.5 50 57.5 Q50 57.5 53 56 Q56 55 59 57" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M38 62 Q40 66 42 70" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.12" />
      <path d="M50 62 L50 72" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
      <path d="M62 62 Q60 66 58 70" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.12" />
      <path d="M40 58 Q44 60 48 59" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.12" />
    </g>
  );
}

function FullBeard({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M28 54 Q30 50 34 52 Q38 54 42 56 Q46 57 50 57 Q54 57 58 56 Q62 54 66 52 Q70 50 72 54 Q74 60 72 68 Q70 74 66 78 Q62 82 56 84 Q52 85 50 85.5 Q48 85 44 84 Q38 82 34 78 Q30 74 28 68 Q26 60 28 54Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M40 56 Q44 54 47 55.5 Q50 57 50 57 Q50 57 53 55.5 Q56 54 60 56" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.3" />
      <path d="M34 60 Q36 66 38 72 Q40 76 42 78" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M50 60 L50 80" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
      <path d="M66 60 Q64 66 62 72 Q60 76 58 78" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M44 62 Q50 64 56 62" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
      <ellipse cx="34" cy="60" rx="3" ry="5" fill="#fff" opacity="0.06" />
      <ellipse cx="66" cy="60" rx="3" ry="5" fill="#fff" opacity="0.06" />
    </g>
  );
}

function SoulPatch({ fill }: FacialHairProps) {
  return (
    <g>
      <ellipse cx="50" cy="65" rx="2.5" ry="3.5" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="64" rx="1" ry="1.5" fill="#fff" opacity="0.1" />
    </g>
  );
}

function ChinStrap({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M30 56 Q32 54 34 56 Q36 60 38 64 Q40 68 44 71 Q47 73 50 74 Q53 73 56 71 Q60 68 62 64 Q64 60 66 56 Q68 54 70 56" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M30 56 Q32 54 34 56 Q36 60 38 64 Q40 68 44 71 Q47 73 50 74 Q53 73 56 71 Q60 68 62 64 Q64 60 66 56 Q68 54 70 56" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.3" />
    </g>
  );
}

function MuttonChops({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M28 48 Q30 44 32 48 Q34 54 34 60 Q34 66 32 70 Q30 74 34 74 Q38 74 40 70 Q42 66 40 60 Q38 54 36 50 Q34 46 30 48Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M72 48 Q70 44 68 48 Q66 54 66 60 Q66 66 68 70 Q70 74 66 74 Q62 74 60 70 Q58 66 60 60 Q62 54 64 50 Q66 46 70 48Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 54 Q33 60 33 66" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
      <path d="M68 54 Q67 60 67 66" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
    </g>
  );
}

function VanDyke({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M42 57 Q44 55 47 56 Q50 57.5 50 57.5 Q50 57.5 53 56 Q56 55 58 57 Q59 58 60 57 Q61 55.5 62 56" fill="none" stroke={fill} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M42 57 Q41 58 40 57 Q39 55.5 38 56" fill="none" stroke={fill} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M44 63 Q44 61 47 61 Q50 62 50 62 Q50 62 53 61 Q56 61 56 63 Q56 68 54 72 Q52 76 50 78 Q48 76 46 72 Q44 68 44 63Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M50 63 L50 75" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.15" />
    </g>
  );
}

function Handlebar({ fill }: FacialHairProps) {
  return (
    <g>
      <path d="M42 57 Q44 55 47 56.5 Q50 58 50 58 Q50 58 53 56.5 Q56 55 58 57" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M42 57 Q40 58 38 57 Q36 55 34 54 Q32 53 31 55" fill="none" stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M58 57 Q60 58 62 57 Q64 55 66 54 Q68 53 69 55" fill="none" stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M42 57 Q40 58 38 57 Q36 55 34 54 Q32 53 31 55" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.25" />
      <path d="M58 57 Q60 58 62 57 Q64 55 66 54 Q68 53 69 55" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.25" />
      <path d="M46 56.5 Q50 57.5 54 56.5" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.2" />
    </g>
  );
}

function WizardBeard({ fill }: FacialHairProps) {
  return (
    <g>
      <defs>
        <linearGradient id="wizardBeardGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="60%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Main flowing beard shape */}
      <path d="M34 58 Q36 56 40 57 Q44 58 47 58 Q50 58 53 58 Q56 58 60 57 Q64 56 66 58 Q70 64 68 74 Q66 82 62 88 Q58 94 54 97 Q52 98 50 99 Q48 98 46 97 Q42 94 38 88 Q34 82 32 74 Q30 64 34 58Z" fill="url(#wizardBeardGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Mustache portion */}
      <path d="M40 57 Q44 55 47 56 Q50 57.5 50 57.5 Q50 57.5 53 56 Q56 55 60 57" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      {/* Wispy flow lines */}
      <path d="M38 64 Q40 72 42 80 Q44 88 46 94" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
      <path d="M50 60 Q50 72 50 82 Q50 90 50 97" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
      <path d="M62 64 Q60 72 58 80 Q56 88 54 94" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
      {/* Wispy tendrils at the tip */}
      <path d="M46 94 Q44 98 42 100" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity="0.5" />
      <path d="M50 97 Q50 100 50 102" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
      <path d="M54 94 Q56 98 58 100" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity="0.5" />
      {/* Subtle highlight streaks */}
      <path d="M44 62 Q46 68 46 74" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
      <path d="M56 62 Q54 68 54 74" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.1" />
      {/* Magical sparkle hints */}
      <circle cx="42" cy="78" r="0.6" fill="#fff" opacity="0.15" />
      <circle cx="56" cy="84" r="0.5" fill="#fff" opacity="0.12" />
      <circle cx="48" cy="90" r="0.7" fill="#fff" opacity="0.1" />
      {/* Volume highlights */}
      <ellipse cx="40" cy="66" rx="3" ry="5" fill="#fff" opacity="0.06" />
      <ellipse cx="60" cy="66" rx="3" ry="5" fill="#fff" opacity="0.06" />
    </g>
  );
}

function PencilMustache({ fill }: FacialHairProps) {
  return (
    <g>
      {/* Left line */}
      <path d="M40 57 Q44 55.5 50 56.5" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
      {/* Right line */}
      <path d="M60 57 Q56 55.5 50 56.5" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
      {/* Subtle shadow */}
      <path d="M40 57 Q44 55.5 50 56.5" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.2" />
      <path d="M60 57 Q56 55.5 50 56.5" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.2" />
      {/* Tiny pointed tips */}
      <path d="M40 57 L38 57.5" stroke={fill} strokeWidth={0.8} strokeLinecap="round" />
      <path d="M60 57 L62 57.5" stroke={fill} strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );
}

function BraidedBeard({ fill }: FacialHairProps) {
  return (
    <g>
      {/* Mustache */}
      <path d="M42 57 Q44 55 47 56 Q50 57.5 50 57.5 Q50 57.5 53 56 Q56 55 58 57 Q58 59 55 59 Q52 59 50 60 Q48 59 45 59 Q42 59 42 57Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Chin base */}
      <path d="M38 62 Q38 60 42 60 Q46 61 50 61 Q54 61 58 60 Q62 60 62 62 Q62 66 60 68 Q56 70 50 70 Q44 70 40 68 Q38 66 38 62Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Left braid */}
      <path d="M42 68 Q40 72 42 74 Q44 76 42 78 Q40 80 42 82" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M42 68 Q40 72 42 74 Q44 76 42 78 Q40 80 42 82" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.25" />
      {/* Center braid */}
      <path d="M50 70 Q48 74 50 76 Q52 78 50 80 Q48 82 50 84" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M50 70 Q48 74 50 76 Q52 78 50 80 Q48 82 50 84" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.25" />
      {/* Right braid */}
      <path d="M58 68 Q60 72 58 74 Q56 76 58 78 Q60 80 58 82" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M58 68 Q60 72 58 74 Q56 76 58 78 Q60 80 58 82" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.25" />
      {/* Beads at braid tips */}
      <circle cx="42" cy="84" r="2" fill="#C0C0C0" stroke="#000" strokeWidth={0.8} />
      <circle cx="50" cy="86" r="2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="58" cy="84" r="2" fill="#C0C0C0" stroke="#000" strokeWidth={0.8} />
      {/* Bead highlights */}
      <circle cx="41.5" cy="83.5" r="0.6" fill="#fff" opacity="0.3" />
      <circle cx="49.5" cy="85.5" r="0.6" fill="#fff" opacity="0.3" />
      <circle cx="57.5" cy="83.5" r="0.6" fill="#fff" opacity="0.3" />
    </g>
  );
}

function FuManchu({ fill }: FacialHairProps) {
  return (
    <g>
      {/* Thin mustache line */}
      <path d="M42 57 Q46 55.5 50 56.5 Q54 55.5 58 57" fill="none" stroke={fill} strokeWidth={1.8} strokeLinecap="round" />
      {/* Left drooping tendril */}
      <path d="M42 57 Q40 60 38 65 Q36 72 34 78 Q33 82 34 84" fill="none" stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M42 57 Q40 60 38 65 Q36 72 34 78 Q33 82 34 84" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.2" />
      {/* Right drooping tendril */}
      <path d="M58 57 Q60 60 62 65 Q64 72 66 78 Q67 82 66 84" fill="none" stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M58 57 Q60 60 62 65 Q64 72 66 78 Q67 82 66 84" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.2" />
      {/* Subtle highlight */}
      <path d="M44 56.5 Q47 55.5 50 56.5" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.15" />
    </g>
  );
}

export const FACIAL_HAIR_PARTS: Record<string, React.FC<FacialHairProps> | (() => null)> = {
  none: None,
  stubble: Stubble,
  mustache: Mustache,
  goatee: Goatee,
  shortBeard: ShortBeard,
  fullBeard: FullBeard,
  soulPatch: SoulPatch,
  chinStrap: ChinStrap,
  muttonChops: MuttonChops,
  vanDyke: VanDyke,
  handlebar: Handlebar,
  wizardBeard: WizardBeard,
  pencilMustache: PencilMustache,
  braidedBeard: BraidedBeard,
  fuManchu: FuManchu,
};

export type FacialHairPart = keyof typeof FACIAL_HAIR_PARTS;
