/**
 * Avatar Facial Hair Parts
 * 10 facial hair styles for male avatars, positioned on lower face.
 * Anchored at jaw/chin area: y≈56-80, cx=50 within viewBox 0 0 100 100.
 * Uses hairColor for fill to match head hair.
 */

import { STROKE_DETAIL } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_DETAIL;

/** Shared fuller mustache silhouette (sits on the upper lip, above the mouth). */
const MUSTACHE_D =
  'M39 56 Q43 53.4 47 55.4 Q50 56.9 50 56.9 Q50 56.9 53 55.4 Q57 53.4 61 56 Q61 58.9 56.4 59.3 Q52.4 59.7 50 60.7 Q47.6 59.7 43.6 59.3 Q39 58.9 39 56Z';

interface FacialHairProps {
  fill: string;
}

function None() {
  return null;
}

function Stubble({ fill }: FacialHairProps) {
  // Even 5-o'clock-shadow field across cheeks/jaw/chin, hugging the jaw and
  // skipping the lips so the mouth stays readable (facial hair renders over it).
  const dots: Array<[number, number]> = [];
  for (let y = 55; y <= 78; y += 2.3) {
    const half = 19 - (y - 55) * 0.45; // narrows toward the chin
    for (let x = 50 - half; x <= 50 + half; x += 2.5) {
      if (x > 40 && x < 60 && y > 56.5 && y < 64) continue; // lip gap
      const j = (Math.round(x + y) % 2 === 0) ? 0.55 : -0.5;
      dots.push([x + j, y]);
    }
  }
  return (
    <g>
      {/* faint shadow mass under the jaw for depth */}
      <path d="M33 65 Q38 73 50 76 Q62 73 67 65 Q66 71 60 75 Q54 78 50 78.2 Q46 78 40 75 Q34 71 33 65Z" fill={fill} opacity="0.15" />
      <g fill={fill} opacity="0.5">
        {dots.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.85" />)}
      </g>
    </g>
  );
}

function Mustache({ fill }: FacialHairProps) {
  return (
    <g>
      <path d={MUSTACHE_D} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M43 56 Q47 54.4 50 56" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.18" />
    </g>
  );
}

function Goatee({ fill }: FacialHairProps) {
  return (
    <g>
      <path d={MUSTACHE_D} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Chin tuft — soul patch flowing into a rounded chin beard */}
      <path d="M45 62.5 Q45 60.5 47.5 60.8 Q50 61.4 52.5 60.8 Q55 60.5 55 62.5 Q55.4 68 53 72 Q51 75 50 75.5 Q49 75 47 72 Q44.6 68 45 62.5Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M48 64 Q50 65 52 64" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.14" />
      <path d="M50 63 L50 73" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.15" />
    </g>
  );
}

function ShortBeard({ fill }: FacialHairProps) {
  return (
    <g>
      {/* Full jaw-wrapping beard with a real mouth opening (evenodd hole) */}
      <path
        fillRule="evenodd"
        d="M30 54 Q33 51 37 53 Q42 56 47 56.5 Q50 57 53 56.5 Q58 56 63 53 Q67 51 70 54 Q72 61 69 69 Q65 76 57 79 Q53 80.5 50 80.7 Q47 80.5 43 79 Q35 76 31 69 Q28 61 30 54Z M43 59 Q50 57.6 57 59 Q57.6 64 53 67 Q50 68.6 47 67 Q42.4 64 43 59Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      {/* Mustache over the upper lip */}
      <path d={MUSTACHE_D} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Soft strand shading + volume highlights */}
      <path d="M36 60 Q38 66 41 71" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" />
      <path d="M64 60 Q62 66 59 71" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" />
      <path d="M50 69 L50 78" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <ellipse cx="36" cy="59" rx="3" ry="4" fill="#fff" opacity="0.07" />
      <ellipse cx="64" cy="59" rx="3" ry="4" fill="#fff" opacity="0.07" />
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
      {/* Sideburns anchoring the strap at the temples */}
      <path d="M27 49 Q26 55 29 60 L33 59 Q31 54 31 49Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M73 49 Q74 55 71 60 L67 59 Q69 54 69 49Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Bold jawline band */}
      <path d="M30 58 Q33 66 39 71 Q45 76 50 77 Q55 76 61 71 Q67 66 70 58" fill="none" stroke={fill} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M30 58 Q33 66 39 71 Q45 76 50 77 Q55 76 61 71 Q67 66 70 58" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" opacity="0.22" />
      <path d="M34 62 Q39 70 50 74 Q61 70 66 62" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.12" />
    </g>
  );
}

function MuttonChops({ fill }: FacialHairProps) {
  return (
    <g>
      {/* Bold chops flaring from the temples toward the mouth corners */}
      <path d="M27 47 Q31 45 33 49 Q35 55 35 61 Q35 67 39 70 Q43 73 47 70 Q45 65 43 60 Q41 54 39 50 Q37 46 32 46Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M73 47 Q69 45 67 49 Q65 55 65 61 Q65 67 61 70 Q57 73 53 70 Q55 65 57 60 Q59 54 61 50 Q63 46 68 46Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Connecting mustache (classic mutton-chop pairing), chin left bare */}
      <path d={MUSTACHE_D} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M33 53 Q34 60 35 66" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.12" />
      <path d="M67 53 Q66 60 65 66" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.12" />
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
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}wizardBeardGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="60%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* Main flowing beard shape */}
      <path d="M34 58 Q36 56 40 57 Q44 58 47 58 Q50 58 53 58 Q56 58 60 57 Q64 56 66 58 Q70 64 68 74 Q66 82 62 86 Q58 91 54 93 Q52 94 50 94 Q48 94 46 93 Q42 91 38 86 Q34 82 32 74 Q30 64 34 58Z" fill={`url(#${u}wizardBeardGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Mustache portion */}
      <path d="M40 57 Q44 55 47 56 Q50 57.5 50 57.5 Q50 57.5 53 56 Q56 55 60 57" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      {/* Wispy flow lines */}
      <path d="M38 64 Q40 72 42 80 Q44 88 46 94" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
      <path d="M50 60 Q50 72 50 82 Q50 90 50 97" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
      <path d="M62 64 Q60 72 58 80 Q56 88 54 94" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
      {/* Wispy tendrils at the tip */}
      <path d="M46 92 Q44 95 42 96" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity="0.5" />
      <path d="M50 94 Q50 96 50 96" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
      <path d="M54 92 Q56 95 58 96" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity="0.5" />
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

/** Trimmed beard — neat, crisp-edged short beard hugging the jaw, mouth open. */
function TrimmedBeard({ fill }: FacialHairProps) {
  const uid = useAvatarUid();
  const shadeId = `tbeard-shade-${uid}`;
  const BEARD_D =
    'M32 55 Q35 52.5 39 54 Q43.5 56.2 47 56.6 Q50 57 53 56.6 Q56.5 56.2 61 54 Q65 52.5 68 55 Q70 61 67.5 68 Q64 74.5 56.5 77.5 Q53 79 50 79.2 Q47 79 43.5 77.5 Q36 74.5 32.5 68 Q30 61 32 55Z';
  const HOLE_D = 'M43.5 59 Q50 57.8 56.5 59 Q57 63.5 52.8 66.4 Q50 68 47.2 66.4 Q43 63.5 43.5 59Z';
  return (
    <g>
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="45%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.30" />
        </linearGradient>
      </defs>
      <path fillRule="evenodd" d={`${BEARD_D} ${HOLE_D}`} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* clean vertical shading for the trimmed 3D look (mouth kept open) */}
      <path fillRule="evenodd" d={`${BEARD_D} ${HOLE_D}`} fill={`url(#${shadeId})`} stroke="none" />
      {/* Mustache over the upper lip */}
      <path d={MUSTACHE_D} fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Crisp trimmed-edge highlights */}
      <path d="M34 58 Q40 60 45 59" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.12" />
      <path d="M55 59 Q60 60 66 58" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.12" />
      <path d="M50 68 L50 77" fill="none" stroke="#000" strokeWidth={0.4} opacity="0.1" />
    </g>
  );
}

/** Rainbow-striped beard (Epic). */
function RainbowBeard() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}rbbeard`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF1744" />
          <stop offset="25%" stopColor="#FF9100" />
          <stop offset="50%" stopColor="#FFEA00" />
          <stop offset="75%" stopColor="#00E676" />
          <stop offset="100%" stopColor="#2979FF" />
        </linearGradient>
      </defs>
      <path d="M30 56 Q32 78 50 82 Q68 78 70 56 Q60 64 50 64 Q40 64 30 56Z" fill={`url(#${u}rbbeard)`} stroke="#000" strokeWidth={S + 0.6} strokeLinejoin="round" />
      <path d="M40 64 L38 76 M50 66 L50 80 M60 64 L62 76" stroke="#000" strokeWidth={0.6} opacity="0.25" />
    </g>
  );
}

/** Flame-shaped beard with licking tips (Epic). */
function FlameBeard() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}flbeard`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFD600" />
          <stop offset="50%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FF3D00" />
        </linearGradient>
      </defs>
      <path d="M30 56 Q30 70 38 78 L40 70 L46 82 L50 72 L54 82 L60 70 L62 78 Q70 70 70 56 Q60 64 50 64 Q40 64 30 56Z" fill={`url(#${u}flbeard)`} stroke="#000" strokeWidth={S + 0.6} strokeLinejoin="round" />
      <path d="M44 68 Q46 74 44 78 M56 68 Q54 74 56 78" stroke="#FFF59D" strokeWidth={0.8} opacity="0.6" fill="none" />
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
  trimmedBeard: TrimmedBeard,
  rainbowBeard: RainbowBeard,
  flameBeard: FlameBeard,
};

export type FacialHairPart = keyof typeof FACIAL_HAIR_PARTS;
