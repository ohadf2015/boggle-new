/**
 * Avatar Accessory Parts
 * Avatar accessories, positioned within viewBox 0 0 100 100
 */

import { STROKE_INNER, STROKE_OUTER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

/** Most accessories use inner stroke; head accessories (hats, crowns) use outer */
const S = STROKE_INNER;
const SO = STROKE_OUTER;

interface AccessoryPartProps {
  fill: string;
}

function None() {
  return null;
}

function Glasses({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="38" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <circle cx="38" cy="42" r="7.5" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.3" />
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <circle cx="62" cy="42" r="7.5" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.3" />
      <path d="M47 42 Q50 44 53 42" stroke={fill} strokeWidth={S} fill="none" />
      <path d="M29 42 L22 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M71 42 L78 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 38 Q36 36 39 38" stroke="#fff" strokeWidth={1} opacity="0.25" fill="none" />
      <path d="M57 38 Q60 36 63 38" stroke="#fff" strokeWidth={1} opacity="0.25" fill="none" />
    </g>
  );
}

function Sunglasses({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}sunglassLensGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="26" y="35" width="20" height="13" rx="4" fill={`url(#${u}sunglassLensGrad)`} stroke="#000" strokeWidth={S} />
      <rect x="54" y="35" width="20" height="13" rx="4" fill={`url(#${u}sunglassLensGrad)`} stroke="#000" strokeWidth={S} />
      <path d="M46 41 L54 41" stroke="#000" strokeWidth={S + 0.5} />
      <path d="M26 39 L18 36" stroke="#000" strokeWidth={S + 0.5} strokeLinecap="round" />
      <path d="M74 39 L82 36" stroke="#000" strokeWidth={S + 0.5} strokeLinecap="round" />
      <path d="M30 38 Q36 36 40 38" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.35" />
      <path d="M58 38 Q64 36 68 38" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.35" />
      <circle cx="42" cy="40" r="0.8" fill="#fff" opacity="0.5" />
      <circle cx="70" cy="40" r="0.8" fill="#fff" opacity="0.5" />
    </g>
  );
}

function Hat({ fill }: AccessoryPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="24" rx="38" ry="5" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M28 24 Q28 6 50 4 Q72 6 72 24" fill={fill} stroke="#000" strokeWidth={SO} />
      <rect x="28" y="19" width="44" height="5" fill="#000" opacity="0.3" />
      <rect x="47" y="19" width="6" height="5" fill="#FFD700" stroke="#000" strokeWidth={1} rx="1" />
      <path d="M30 24 L32 24" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M68 24 L70 24" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M34 10 Q50 6 66 10" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.1" />
    </g>
  );
}

function Cap({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M25 28 Q25 10 50 8 Q75 10 75 28" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M25 28 L15 32 Q14 34 18 34 L25 30" fill={fill} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <circle cx="50" cy="8" r="2.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M50 8 L50 28" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <path d="M50 8 L32 24" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M50 8 L68 24" stroke="#000" strokeWidth={0.7} opacity="0.12" />
      <path d="M28 26 Q50 22 72 26" stroke="#000" strokeWidth={1} opacity="0.15" />
    </g>
  );
}

function Headband({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 32 Q50 26 78 32" fill="none" stroke={fill} strokeWidth={6} strokeLinecap="round" />
      <path d="M22 31 Q50 25 78 31" fill="none" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <path d="M22 33.5 Q50 27.5 78 33.5" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <path d="M24 30 Q50 24.5 76 30" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.12" />
    </g>
  );
}

function Crown({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M24 30 L28 8 L38 22 L50 0 L62 22 L72 8 L76 30Z" fill={fill} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M26 28 L74 28" stroke="#000" strokeWidth={1.5} opacity="0.25" />
      <circle cx="38" cy="22" r="2.5" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="12" r="3" fill="#00FFFF" stroke="#000" strokeWidth={1} />
      <circle cx="62" cy="22" r="2.5" fill="#BFFF00" stroke="#000" strokeWidth={1} />
      <circle cx="30" cy="14" r="1.5" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="70" cy="14" r="1.5" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="50" cy="11" r="1.2" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Earring({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Stud on ear — visible at edge of face */}
      <circle cx="18" cy="54" r="4" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="18" cy="54" r="1.5" fill="#fff" opacity="0.5" />
      <circle cx="82" cy="54" r="4" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="82" cy="54" r="1.5" fill="#fff" opacity="0.5" />
      {/* Dangle */}
      <line x1="18" y1="58" x2="18" y2="66" stroke={fill} strokeWidth={2} />
      <circle cx="18" cy="69" r="4" fill="#fff" stroke={fill} strokeWidth={1.5} />
      <circle cx="17" cy="68" r="1.2" fill="#fff" opacity="0.5" />
      <line x1="82" y1="58" x2="82" y2="66" stroke={fill} strokeWidth={2} />
      <circle cx="82" cy="69" r="4" fill="#fff" stroke={fill} strokeWidth={1.5} />
    </g>
  );
}

function Bandana({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M20 30 Q50 22 80 30" fill="none" stroke={fill} strokeWidth={7} strokeLinecap="round" />
      <path d="M20 30 Q50 22 80 30" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <circle cx="35" cy="27" r="1" fill="#000" opacity="0.15" />
      <circle cx="50" cy="25" r="1" fill="#000" opacity="0.15" />
      <circle cx="65" cy="27" r="1" fill="#000" opacity="0.15" />
      <path d="M78 30 L88 38 M78 30 L86 44" stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <path d="M78 30 L88 38 M78 30 L86 44" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M80 32 L82 34" stroke="#000" strokeWidth={0.8} opacity="0.15" />
    </g>
  );
}

function Horns({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}hornGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d="M30 30 Q22 15 28 5 Q32 10 35 25" fill={`url(#${u}hornGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M70 30 Q78 15 72 5 Q68 10 65 25" fill={`url(#${u}hornGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M29 22 L33 20" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M28 16 L32 15" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M27.5 10 L31 9.5" stroke="#000" strokeWidth={1} opacity="0.25" />
      <path d="M71 22 L67 20" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M72 16 L68 15" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M72.5 10 L69 9.5" stroke="#000" strokeWidth={1} opacity="0.25" />
    </g>
  );
}

function Monocle({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <circle cx="62" cy="42" r="10.5" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.4" />
      <circle cx="62" cy="42" r="8" fill="#87CEEB" opacity="0.08" />
      <path d="M57 38 Q60 36 63 38" stroke="#fff" strokeWidth={0.8} opacity="0.3" fill="none" />
      <path d="M71 42 L74 50 L76 52 L78 56 L76 60" stroke={fill} strokeWidth={1.5} fill="none" />
      <circle cx="75" cy="52" r="0.8" fill={fill} opacity="0.5" />
    </g>
  );
}

function Eyepatch({ fill }: AccessoryPartProps) {
  return (
    <g>
      <ellipse cx="38" cy="42" rx="9" ry="7" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="29" y1="38" x2="20" y2="30" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="47" y1="38" x2="80" y2="30" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="34" y1="40" x2="42" y2="44" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <line x1="36" y1="42" x2="40" y2="42" stroke="#fff" strokeWidth={1.2} opacity="0.15" />
      <circle cx="20" cy="30" r="1.5" fill="#888" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Tiara({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M28 28 L33 14 L38 22 L43 8 L50 18 L57 8 L62 22 L67 14 L72 28" fill="none" stroke={fill} strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 28 L70 28" stroke={fill} strokeWidth={2} />
      <circle cx="43" cy="12" r="2.5" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="57" cy="12" r="2.5" fill="#00FFFF" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="18" r="2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="43" cy="11.5" r="0.8" fill="#fff" opacity="0.5" />
      <circle cx="57" cy="11.5" r="0.8" fill="#fff" opacity="0.5" />
      <path d="M35 24 Q37 22 39 24 M61 24 Q63 22 65 24" stroke={fill} strokeWidth={0.8} opacity="0.4" fill="none" />
    </g>
  );
}

function Antenna({ fill }: AccessoryPartProps) {
  return (
    <g>
      <line x1="50" y1="22" x2="50" y2="10" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="50" y1="18" x2="50" y2="16" stroke="#555" strokeWidth={3.5} />
      <line x1="50" y1="14" x2="50" y2="12" stroke="#555" strokeWidth={3.5} />
      <circle cx="50" cy="6" r="4" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="6" r="6" fill={fill} opacity="0.15" />
      <circle cx="49" cy="5" r="1.2" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Halo({ fill }: AccessoryPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="12" rx="24" ry="7" fill={fill} opacity="0.12" />
      <ellipse cx="50" cy="12" rx="22" ry="6" fill="none" stroke={fill} strokeWidth={S} opacity="0.9" />
      <ellipse cx="50" cy="12" rx="19" ry="4.5" fill="none" stroke={fill} strokeWidth={0.8} opacity="0.3" />
      <path d="M34 10 Q38 8 42 10" stroke="#fff" strokeWidth={1} opacity="0.3" fill="none" />
    </g>
  );
}

function Mask({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M26 36 Q50 30 74 36 L74 48 Q50 54 26 48Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <ellipse cx="38" cy="42" rx="7" ry="5" fill="#000" />
      <ellipse cx="62" cy="42" rx="7" ry="5" fill="#000" />
      <circle cx="36" cy="41" r="1" fill="#fff" opacity="0.15" />
      <circle cx="60" cy="41" r="1" fill="#fff" opacity="0.15" />
      <path d="M30 36 Q32 34 34 36" stroke={fill} strokeWidth={1.5} fill="none" opacity="0.5" />
      <path d="M66 36 Q68 34 70 36" stroke={fill} strokeWidth={1.5} fill="none" opacity="0.5" />
      <path d="M44 44 Q50 46 56 44" stroke="#000" strokeWidth={0.8} opacity="0.3" fill="none" />
    </g>
  );
}

function Scarf({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 72 Q50 65 78 72 Q80 78 78 82 Q50 75 22 82 Q20 78 22 72Z" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M30 74 Q50 68 70 74" stroke="#000" strokeWidth={0.6} opacity="0.12" fill="none" />
      <path d="M28 78 Q50 72 72 78" stroke="#000" strokeWidth={0.6} opacity="0.12" fill="none" />
      <path d="M40 80 L36 95 Q38 97 42 95 L44 82" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="37" y1="92" x2="38" y2="97" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <line x1="41" y1="92" x2="41" y2="97" stroke="#000" strokeWidth={0.8} opacity="0.2" />
    </g>
  );
}

function Bowtie({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left wing */}
      <path d="M32 76 L50 70 L50 82Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right wing */}
      <path d="M68 76 L50 70 L50 82Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Dot details */}
      <circle cx="40" cy="76" r="1.2" fill="#000" opacity="0.15" />
      <circle cx="60" cy="76" r="1.2" fill="#000" opacity="0.15" />
      {/* Center knot */}
      <circle cx="50" cy="76" r="4" fill="#000" opacity="0.3" />
      <circle cx="50" cy="76" r="2.5" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Keffiyeh({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M18 28 Q18 10 50 6 Q82 10 82 28 L84 40 Q82 45 78 42 L78 30 Q50 18 22 30 L22 42 Q18 45 16 40Z" fill={fill} stroke="#000" strokeWidth={SO} />
      <ellipse cx="50" cy="22" rx="30" ry="4" fill="none" stroke="#000" strokeWidth={3} />
      <path d="M22 36 L18 70 Q20 75 24 72 L26 42" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M78 36 L82 70 Q80 75 76 72 L74 42" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M20 50 L24 50 M20 58 L24 58 M76 50 L80 50 M76 58 L80 58" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Fez({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M35 26 L35 10 Q50 6 65 10 L65 26" fill={fill} stroke="#000" strokeWidth={SO} />
      <ellipse cx="50" cy="26" rx="15" ry="4" fill={fill} stroke="#000" strokeWidth={SO} />
      <line x1="50" y1="8" x2="50" y2="4" stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="4" r="2" fill="#000" />
      <path d="M50 4 Q55 8 58 18" stroke="#000" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <path d="M58 18 Q60 22 62 20" stroke="#000" strokeWidth={1} fill="none" />
    </g>
  );
}

function MustacheGlasses({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="38" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <path d="M47 42 L53 42" stroke={fill} strokeWidth={S} />
      <path d="M29 42 L22 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M71 42 L78 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <ellipse cx="50" cy="52" rx="5" ry="6" fill="#F8D5C2" stroke="#000" strokeWidth={S} />
      <path d="M36 58 Q43 62 50 56 Q57 62 64 58" fill="#2C1B18" stroke="#000" strokeWidth={1.5} />
      <path d="M38 58 Q43 65 50 58 Q57 65 62 58" fill="#2C1B18" stroke="#000" strokeWidth={1} />
      <path d="M30 35 Q38 30 46 35" fill="#2C1B18" stroke="#000" strokeWidth={1.5} />
      <path d="M54 35 Q62 30 70 35" fill="#2C1B18" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Sombrero({ fill }: AccessoryPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="26" rx="46" ry="8" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M32 26 Q32 6 50 2 Q68 6 68 26" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M34 20 Q50 16 66 20" fill="none" stroke="#FF6B35" strokeWidth={2} />
      <path d="M36 14 Q50 10 64 14" fill="none" stroke="#BFFF00" strokeWidth={2} />
      <circle cx="12" cy="30" r="3" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="88" cy="30" r="3" fill="#BFFF00" stroke="#000" strokeWidth={1} />
      <circle cx="30" cy="33" r="3" fill="#00FFFF" stroke="#000" strokeWidth={1} />
      <circle cx="70" cy="33" r="3" fill="#FF6B35" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Turban({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 32 Q22 8 50 4 Q78 8 78 32" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M28 28 Q40 12 50 20 Q60 12 72 28" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M32 24 Q50 10 68 24" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M26 30 Q50 18 74 30" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <circle cx="50" cy="18" r="4" fill="#FF1493" stroke="#FFD700" strokeWidth={2} />
      <circle cx="50" cy="18" r="1.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function NoseRing({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Ring hanging from nose — larger for visibility */}
      <path d="M46 56 Q50 67 54 56" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <circle cx="50" cy="65" r="4" fill={fill} stroke="#000" strokeWidth={1.5} />
      <circle cx="48.5" cy="63.5" r="1.2" fill="#fff" opacity="0.4" />
    </g>
  );
}

function ClownNose({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="50" cy="52" r="7" fill={fill || '#FF0000'} stroke="#000" strokeWidth={S} />
      <circle cx="47" cy="49" r="2.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function PartyHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M30 28 L50 2 L70 28Z" fill={fill} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M36 20 L50 6 L64 20" fill="none" stroke="#FF1493" strokeWidth={2} opacity="0.5" />
      <path d="M40 14 L50 6 L60 14" fill="none" stroke="#00FFFF" strokeWidth={2} opacity="0.5" />
      <circle cx="50" cy="2" r="4" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      <path d="M30 28 Q25 50 22 58" stroke="#000" strokeWidth={1} fill="none" opacity="0.4" />
      <path d="M70 28 Q75 50 78 58" stroke="#000" strokeWidth={1} fill="none" opacity="0.4" />
    </g>
  );
}

function PropellerHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M28 28 Q28 10 50 6 Q72 10 72 28" fill={fill} stroke="#000" strokeWidth={SO} />
      <ellipse cx="50" cy="28" rx="22" ry="3" fill={fill} stroke="#000" strokeWidth={SO} />
      <line x1="50" y1="6" x2="50" y2="0" stroke="#000" strokeWidth={2} />
      <ellipse cx="40" cy="-2" rx="12" ry="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} transform="rotate(-20 50 0)" />
      <ellipse cx="60" cy="-2" rx="12" ry="3" fill="#00FFFF" stroke="#000" strokeWidth={1.5} transform="rotate(20 50 0)" />
      <circle cx="50" cy="0" r="3" fill="#FFD700" stroke="#000" strokeWidth={1.5} />
      <path d="M32 -4 L34 -2" stroke="#FF1493" strokeWidth={0.8} opacity="0.3" />
      <path d="M68 -4 L66 -2" stroke="#00FFFF" strokeWidth={0.8} opacity="0.3" />
    </g>
  );
}

function Viking({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M24 32 Q24 10 50 6 Q76 10 76 32" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M48 32 L50 52 L52 32" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M24 26 Q14 18 8 4 Q12 8 18 10 Q20 16 24 22" fill={fill} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M76 26 Q86 18 92 4 Q88 8 82 10 Q80 16 76 22" fill={fill} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M16 14 L19 12 M14 10 L17 9 M84 14 L81 12 M86 10 L83 9" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <circle cx="34" cy="28" r="2" fill="#888" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="26" r="2" fill="#888" stroke="#000" strokeWidth={1} />
      <circle cx="66" cy="28" r="2" fill="#888" stroke="#000" strokeWidth={1} />
      <path d="M24 30 Q26 32 28 30 M72 30 Q74 32 76 30" stroke="#8B6914" strokeWidth={1.5} opacity="0.3" fill="none" />
    </g>
  );
}

function DevilHorns({ fill }: AccessoryPartProps) {
  const c = fill || '#CC0000';
  return (
    <g>
      <path d="M28 28 Q20 12 24 0 Q30 8 34 22" fill={c} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M72 28 Q80 12 76 0 Q70 8 66 22" fill={c} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Tail removed — conflicts with body layer at y=80-98 */}
    </g>
  );
}

function Headphones({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M18 42 Q18 10 50 4 Q82 10 82 42" fill="none" stroke={fill} strokeWidth={4} />
      <path d="M18 42 Q18 10 50 4 Q82 10 82 42" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <rect x="12" y="38" width="12" height="16" rx="4" fill={fill} stroke="#000" strokeWidth={SO} />
      <rect x="14" y="41" width="8" height="10" rx="2" fill="#000" opacity="0.2" />
      <path d="M16 43 L16 49 M18 43 L18 49 M20 43 L20 49" stroke="#000" strokeWidth={0.5} opacity="0.15" />
      <rect x="76" y="38" width="12" height="16" rx="4" fill={fill} stroke="#000" strokeWidth={SO} />
      <rect x="78" y="41" width="8" height="10" rx="2" fill="#000" opacity="0.2" />
      <path d="M80 43 L80 49 M82 43 L82 49 M84 43 L84 49" stroke="#000" strokeWidth={0.5} opacity="0.15" />
      <circle cx="14" cy="42" r="1" fill={fill} opacity="0.5" />
    </g>
  );
}

function ChefHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Puffy top — single smooth cloud shape */}
      <path d="M30 22 Q28 14 34 8 Q38 2 44 2 Q48 -2 50 -2 Q52 -2 56 2 Q62 2 66 8 Q72 14 70 22Z"
        fill={fill} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      {/* Subtle puff bumps */}
      <path d="M34 8 Q38 4 44 4 Q48 0 52 2 Q58 2 62 6" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.08" />
      {/* Hat band */}
      <rect x="30" y="20" width="40" height="8" rx="2" fill={fill} stroke="#000" strokeWidth={SO} />
      {/* Band detail line */}
      <path d="M32 24 L68 24" stroke="#000" strokeWidth={0.5} opacity="0.1" />
    </g>
  );
}

function CucumberFace({ fill }: AccessoryPartProps) {
  const c = fill || '#7CCD7C';
  return (
    <g>
      <ellipse cx="38" cy="42" rx="8" ry="6" fill={c} stroke="#228B22" strokeWidth={S} transform="rotate(-10 38 42)" />
      <ellipse cx="62" cy="42" rx="8" ry="6" fill={c} stroke="#228B22" strokeWidth={S} transform="rotate(10 62 42)" />
      <ellipse cx="36" cy="41" rx="2" ry="1" fill="#228B22" opacity="0.4" />
      <ellipse cx="40" cy="43" rx="2" ry="1" fill="#228B22" opacity="0.4" />
      <ellipse cx="60" cy="41" rx="2" ry="1" fill="#228B22" opacity="0.4" />
      <ellipse cx="64" cy="43" rx="2" ry="1" fill="#228B22" opacity="0.4" />
    </g>
  );
}

function Plunger({ fill }: AccessoryPartProps) {
  return (
    <g>
      <line x1="50" y1="18" x2="50" y2="2" stroke="#8B6E4E" strokeWidth={3} strokeLinecap="round" />
      <path d="M38 18 Q38 10 50 8 Q62 10 62 18 Q62 24 50 26 Q38 24 38 18Z" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="22" r="3" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Samurai({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}samuraiGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#333" />
        </linearGradient>
      </defs>
      <path d="M20 35 Q50 8 80 35 L75 30 Q50 12 25 30Z" fill={`url(#${u}samuraiGrad)`} stroke="#000" strokeWidth={S} />
      <path d="M50 8 L48 20 L52 20Z" fill="#FFD700" stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="22" r="3" fill="#FFD700" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="21.5" r="1" fill="#fff" opacity="0.3" />
      <path d="M20 35 L15 45 L23 40Z" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M80 35 L85 45 L77 40Z" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M25 33 L75 33" stroke="#FFD700" strokeWidth={2} strokeLinecap="round" />
      <path d="M28 33 Q30 36 32 33 M68 33 Q70 36 72 33" stroke="#B8860B" strokeWidth={0.8} opacity="0.4" fill="none" />
    </g>
  );
}

function Astronaut({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}visorGrad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A237E" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4FC3F7" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="44" rx="34" ry="32" fill="none" stroke={fill} strokeWidth={3} />
      <path d="M28 32 Q50 24 72 32" fill="none" stroke="#fff" strokeWidth={2} opacity="0.3" />
      <rect x="22" y="58" width="8" height="6" rx="2" fill={fill} stroke="#000" strokeWidth={1} />
      <rect x="70" y="58" width="8" height="6" rx="2" fill={fill} stroke="#000" strokeWidth={1} />
      <line x1="50" y1="12" x2="50" y2="6" stroke={fill} strokeWidth={2} />
      <circle cx="50" cy="5" r="2.5" fill="#FF0000" stroke="#000" strokeWidth={1} />
      <ellipse cx="50" cy="42" rx="28" ry="24" fill={`url(#${u}visorGrad)`} />
      <path d="M20 44 L22 44 M78 44 L80 44" stroke={fill} strokeWidth={1.5} opacity="0.5" />
      <circle cx="30" cy="62" r="1.5" fill={fill} stroke="#000" strokeWidth={0.5} opacity="0.6" />
    </g>
  );
}

function WizardHat({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}wizardGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#1A0033" />
        </linearGradient>
      </defs>
      <path d="M25 32 L50 0 L75 32 Q62 28 50 30 Q38 28 25 32Z" fill={`url(#${u}wizardGrad)`} stroke="#000" strokeWidth={SO} />
      <ellipse cx="50" cy="32" rx="30" ry="5" fill={fill} stroke="#000" strokeWidth={SO} />
      <polygon points="40,12 41,15 44,15 41.5,17 42.5,20 40,18 37.5,20 38.5,17 36,15 39,15" fill="#FFD700" />
      <polygon points="58,18 59,20 61,20 59.5,21.5 60,23.5 58,22 56,23.5 56.5,21.5 55,20 57,20" fill="#FFD700" />
      <circle cx="48" cy="22" r="1.5" fill="#E040FB" opacity="0.8" />
      <circle cx="34" cy="24" r="1" fill="#FFD700" opacity="0.5" />
      <circle cx="64" cy="22" r="0.8" fill="#E040FB" opacity="0.4" />
      <path d="M50 2 Q56 4 52 8" fill="none" stroke="#FFD700" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function NinjaScarf({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M25 45 Q50 42 75 45 L75 70 Q50 75 25 70Z" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M35 50 Q38 52 35 55" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M65 50 Q62 52 65 55" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M75 55 Q82 58 85 70 Q88 78 82 80" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M75 60 Q80 64 83 72" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
      <line x1="30" y1="45" x2="70" y2="45" stroke="#000" strokeWidth={1.5} />
      <path d="M40 64 Q42 62 44 64 M56 64 Q58 62 60 64" stroke="#000" strokeWidth={0.5} opacity="0.1" fill="none" />
    </g>
  );
}

function PhoenixCrown({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}phoenixCrownGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#B71C1C" />
          <stop offset="40%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
        <linearGradient id={`${u}phoenixWingGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="30%" stopColor="#FF6D00" />
          <stop offset="60%" stopColor="#FFAB00" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
        <radialGradient id={`${u}phoenixGemGrad`} cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="40%" stopColor="#FF1744" />
          <stop offset="100%" stopColor="#B71C1C" />
        </radialGradient>
      </defs>
      <path d="M22 28 C14 18 8 6 18 -2 C22 8 26 4 28 12 C30 6 34 2 32 14 L28 26Z"
        fill={`url(#${u}phoenixWingGrad)`} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M78 28 C86 18 92 6 82 -2 C78 8 74 4 72 12 C70 6 66 2 68 14 L72 26Z"
        fill={`url(#${u}phoenixWingGrad)`} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M25 30 L75 30 L73 26 L27 26Z" fill={`url(#${u}phoenixCrownGrad)`} stroke="#000" strokeWidth={S} />
      <path d="M28 26 L35 14 L42 26" fill={`url(#${u}phoenixCrownGrad)`} stroke="#000" strokeWidth={1.5} />
      <path d="M42 26 L50 8 L58 26" fill={`url(#${u}phoenixCrownGrad)`} stroke="#000" strokeWidth={1.5} />
      <path d="M58 26 L65 14 L72 26" fill={`url(#${u}phoenixCrownGrad)`} stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="18" r="4" fill={`url(#${u}phoenixGemGrad)`} stroke="#000" strokeWidth={1.5} />
      <circle cx="35" cy="22" r="2.5" fill={`url(#${u}phoenixGemGrad)`} stroke="#000" strokeWidth={1} />
      <circle cx="65" cy="22" r="2.5" fill={`url(#${u}phoenixGemGrad)`} stroke="#000" strokeWidth={1} />
      <circle cx="20" cy="8" r="1" fill="#FFD600" opacity="0.7" />
      <circle cx="42" cy="4" r="0.8" fill="#FF6D00" opacity="0.6" />
      <circle cx="58" cy="6" r="1" fill="#FFD600" opacity="0.7" />
      <circle cx="80" cy="8" r="0.8" fill="#FF6D00" opacity="0.6" />
      <circle cx="50" cy="3" r="1.2" fill="#fff" opacity="0.5" />
      <circle cx="30" cy="6" r="0.6" fill="#FFD600" opacity="0.5" />
      <circle cx="70" cy="4" r="0.7" fill="#FFAB00" opacity="0.5" />
      <line x1="30" y1="28" x2="70" y2="28" stroke="#FFD600" strokeWidth={1} opacity="0.6" />
    </g>
  );
}

function Beanie({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M24 30 Q24 10 50 6 Q76 10 76 30" fill={fill} stroke="#000" strokeWidth={SO} />
      <rect x="22" y="26" width="56" height="10" rx="2" fill={fill} stroke="#000" strokeWidth={SO} />
      <path d="M24 28 Q50 22 76 28" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Knit pattern lines */}
      <path d="M30 14 L30 26" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M40 10 L40 26" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M50 8 L50 26" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M60 10 L60 26" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      <path d="M70 14 L70 26" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      {/* Cuff fold line */}
      <path d="M24 30 Q50 26 76 30" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      <path d="M26 32 Q50 28 74 32" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.15" />
      {/* Top pom-pom */}
      <circle cx="50" cy="6" r="4" fill={fill} stroke="#000" strokeWidth={SO} />
      <circle cx="49" cy="5" r="1.2" fill="#fff" opacity="0.2" />
    </g>
  );
}

function CatEars({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left ear */}
      <path d="M28 28 L22 4 L40 22Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 24 L26 10 L36 20Z" fill="#FFB6C1" stroke="none" />
      {/* Right ear */}
      <path d="M72 28 L78 4 L60 22Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M70 24 L74 10 L64 20Z" fill="#FFB6C1" stroke="none" />
      {/* Ear highlights */}
      <path d="M26 14 L28 18" stroke="#fff" strokeWidth={0.6} opacity="0.2" />
      <path d="M74 14 L72 18" stroke="#fff" strokeWidth={0.6} opacity="0.2" />
    </g>
  );
}

function FlowerCrown({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Stem/vine across head */}
      <path d="M24 26 Q37 18 50 20 Q63 18 76 26" fill="none" stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      {/* Leaves */}
      <ellipse cx="30" cy="24" rx="3" ry="1.5" fill="#228B22" transform="rotate(-20 30 24)" />
      <ellipse cx="45" cy="19" rx="3" ry="1.5" fill="#228B22" transform="rotate(10 45 19)" />
      <ellipse cx="58" cy="19" rx="3" ry="1.5" fill="#228B22" transform="rotate(-10 58 19)" />
      <ellipse cx="70" cy="23" rx="3" ry="1.5" fill="#228B22" transform="rotate(20 70 23)" />
      {/* Flower 1 — pink */}
      <circle cx="28" cy="22" r="2" fill="#FF69B4" stroke="#000" strokeWidth={0.6} />
      <circle cx="28" cy="22" r="0.8" fill="#FFD700" />
      {/* Flower 2 — yellow */}
      <circle cx="38" cy="18" r="2.2" fill="#FFD700" stroke="#000" strokeWidth={0.6} />
      <circle cx="38" cy="18" r="0.8" fill="#fff" />
      {/* Flower 3 — white */}
      <circle cx="50" cy="17" r="2" fill="#fff" stroke="#000" strokeWidth={0.6} />
      <circle cx="50" cy="17" r="0.8" fill="#FFD700" />
      {/* Flower 4 — pink */}
      <circle cx="62" cy="18" r="2.2" fill="#FF69B4" stroke="#000" strokeWidth={0.6} />
      <circle cx="62" cy="18" r="0.8" fill="#FFD700" />
      {/* Flower 5 — yellow */}
      <circle cx="72" cy="22" r="2" fill="#FFD700" stroke="#000" strokeWidth={0.6} />
      <circle cx="72" cy="22" r="0.8" fill="#fff" />
    </g>
  );
}

function Goggles({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Strap */}
      <path d="M18 30 Q50 24 82 30" fill="none" stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <path d="M18 30 Q50 24 82 30" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Left lens */}
      <circle cx="38" cy="28" r="9" fill="none" stroke="#888" strokeWidth={2.5} />
      <circle cx="38" cy="28" r="7" fill="#87CEEB" opacity="0.15" />
      <circle cx="38" cy="28" r="9" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
      {/* Right lens */}
      <circle cx="62" cy="28" r="9" fill="none" stroke="#888" strokeWidth={2.5} />
      <circle cx="62" cy="28" r="7" fill="#87CEEB" opacity="0.15" />
      <circle cx="62" cy="28" r="9" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
      {/* Bridge */}
      <path d="M47 28 Q50 30 53 28" stroke="#888" strokeWidth={2} fill="none" />
      {/* Lens shine */}
      <path d="M33 24 Q36 22 39 24" stroke="#fff" strokeWidth={0.8} opacity="0.3" fill="none" />
      <path d="M57 24 Q60 22 63 24" stroke="#fff" strokeWidth={0.8} opacity="0.3" fill="none" />
      {/* Strap rivets */}
      <circle cx="26" cy="29" r="1.5" fill="#888" stroke="#000" strokeWidth={0.8} />
      <circle cx="74" cy="29" r="1.5" fill="#888" stroke="#000" strokeWidth={0.8} />
    </g>
  );
}

function BunnyEars({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left ear — upright */}
      <path d="M34 26 Q32 6 30 2 Q28 0 34 1 Q40 2 38 20" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M35 22 Q34 10 33 6 Q32 4 35 5 Q37 6 37 18" fill="#FFB6C1" stroke="none" />
      {/* Right ear — slightly drooping */}
      <path d="M66 26 Q70 8 74 4 Q78 2 80 6 Q82 12 72 20" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M68 22 Q71 12 74 8 Q76 6 77 9 Q78 14 71 18" fill="#FFB6C1" stroke="none" />
      {/* Right ear droop curve */}
      <path d="M74 4 Q78 8 80 14" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.15" />
      {/* Ear highlights */}
      <path d="M33 8 L34 14" stroke="#fff" strokeWidth={0.6} opacity="0.2" />
      <path d="M73 8 L72 14" stroke="#fff" strokeWidth={0.6} opacity="0.2" />
    </g>
  );
}

function CyberpunkVisor({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}cyberpunkVisorGrad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ff" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#f0f" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0ff" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Frame */}
      <path d="M20 38 Q22 34 30 33 Q40 32 50 32 Q60 32 70 33 Q78 34 80 38 L82 44 Q80 48 70 49 Q60 50 50 50 Q40 50 30 49 Q22 48 18 44Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Visor lens */}
      <path d="M24 38 Q26 35 34 34 Q42 33 50 33 Q58 33 66 34 Q74 35 76 38 L78 43 Q76 46 66 47 Q58 48 50 48 Q42 48 34 47 Q26 46 22 43Z" fill={`url(#${u}cyberpunkVisorGrad)`} />
      {/* Neon accent line */}
      <path d="M24 41 Q37 39 50 39 Q63 39 76 41" fill="none" stroke="#0ff" strokeWidth={1.5} opacity="0.8" />
      <path d="M28 41 Q50 39.5 72 41" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.4" />
      {/* Temple arms */}
      <path d="M20 38 L14 36" stroke={fill} strokeWidth={S + 0.5} strokeLinecap="round" />
      <path d="M80 38 L86 36" stroke={fill} strokeWidth={S + 0.5} strokeLinecap="round" />
      {/* Frame detail dots */}
      <circle cx="26" cy="42" r="1" fill="#0ff" opacity="0.6" />
      <circle cx="74" cy="42" r="1" fill="#f0f" opacity="0.6" />
    </g>
  );
}

/** Monkey ears — furry round ears peeking from behind the head.
 * Rendered in the back-layer (before face) so they naturally peek out. */
function MonkeyEars({ fill }: AccessoryPartProps) {
  const earColor = fill || '#8B4513';
  return (
    <g>
      {/* Left ear — positioned to peek from behind the face circle (face edge ~x=20) */}
      <ellipse cx="13" cy="46" rx="10" ry="12" fill={earColor} stroke="#000" strokeWidth={2.5} />
      <ellipse cx="12" cy="46" rx="5" ry="6" fill="#DEB887" stroke="none" />
      {/* Right ear */}
      <ellipse cx="87" cy="46" rx="10" ry="12" fill={earColor} stroke="#000" strokeWidth={2.5} />
      <ellipse cx="88" cy="46" rx="5" ry="6" fill="#DEB887" stroke="none" />
    </g>
  );
}

function Bow({ fill }: AccessoryPartProps) {
  const bowColor = fill || '#FF1493';
  return (
    <g>
      {/* Hair bow — sits on top of head */}
      {/* Left wing */}
      <path d="M34 16 Q26 8 22 14 Q18 20 28 22 Q34 24 38 20Z"
        fill={bowColor} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right wing */}
      <path d="M46 16 Q54 8 58 14 Q62 20 52 22 Q46 24 42 20Z"
        fill={bowColor} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Center knot */}
      <ellipse cx="40" cy="19" rx="4" ry="3.5" fill={bowColor} stroke="#000" strokeWidth={S} />
      {/* Ribbon tails */}
      <path d="M36 22 L32 30 Q34 28 36 30" fill={bowColor} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M44 22 L48 30 Q46 28 44 30" fill={bowColor} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      {/* Highlights */}
      <path d="M28 12 Q32 10 36 14" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.3" />
      <path d="M52 12 Q48 10 44 14" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.3" />
    </g>
  );
}

function Pearls({ fill }: AccessoryPartProps) {
  const pearlColor = fill || '#FFF5EE';
  return (
    <g>
      {/* Pearl necklace — strand around neck/body junction */}
      {[
        { x: 30, y: 73 }, { x: 34, y: 71.5 }, { x: 38, y: 70.5 },
        { x: 42, y: 70 }, { x: 46, y: 69.5 }, { x: 50, y: 69.5 },
        { x: 54, y: 69.5 }, { x: 58, y: 70 }, { x: 62, y: 70.5 },
        { x: 66, y: 71.5 }, { x: 70, y: 73 },
      ].map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <circle cx={p.x} cy={p.y} r="2.2" fill={pearlColor} stroke="#C0B8A8" strokeWidth={0.6} />
          {/* Pearl luster — shifted highlight */}
          <circle cx={p.x - 0.5} cy={p.y - 0.6} r="0.8" fill="#fff" opacity="0.6" />
        </g>
      ))}
      {/* Connecting strand hint */}
      <path d="M30 73 Q34 71 38 70 Q42 69.5 46 69.5 Q50 69.5 54 69.5 Q58 70 62 70.5 Q66 71.5 70 73"
        fill="none" stroke="#C0B8A8" strokeWidth={0.4} opacity="0.3" />
    </g>
  );
}

function HeartGlasses({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const frameColor = fill || '#FF1493';
  return (
    <g>
      {/* Heart-shaped sunglasses */}
      <defs>
        <linearGradient id={`${u}heartLensGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={frameColor} stopOpacity="0.7" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {/* Left heart lens */}
      <path d="M30 40 C30 34 36 34 38 38 C40 34 46 34 46 40 C46 48 38 52 38 52 C38 52 30 48 30 40Z"
        fill={`url(#${u}heartLensGrad)`} stroke={frameColor} strokeWidth={S} />
      {/* Right heart lens */}
      <path d="M54 40 C54 34 60 34 62 38 C64 34 70 34 70 40 C70 48 62 52 62 52 C62 52 54 48 54 40Z"
        fill={`url(#${u}heartLensGrad)`} stroke={frameColor} strokeWidth={S} />
      {/* Bridge */}
      <path d="M46 42 Q50 44 54 42" stroke={frameColor} strokeWidth={S} fill="none" />
      {/* Arms */}
      <path d="M30 40 L22 36" stroke={frameColor} strokeWidth={S} strokeLinecap="round" />
      <path d="M70 40 L78 36" stroke={frameColor} strokeWidth={S} strokeLinecap="round" />
      {/* Lens shine */}
      <path d="M33 37 Q36 35 38 37" fill="none" stroke="#fff" strokeWidth={1} opacity="0.35" />
      <path d="M57 37 Q60 35 62 37" fill="none" stroke="#fff" strokeWidth={1} opacity="0.35" />
    </g>
  );
}

function Choker({ fill }: AccessoryPartProps) {
  const bandColor = fill || '#000000';
  return (
    <g>
      {/* Choker necklace — tight band around neck */}
      <path d="M36 68 Q50 72 64 68" fill="none" stroke={bandColor} strokeWidth={4} strokeLinecap="round" />
      {/* Band edges */}
      <path d="M36 66.5 Q50 70.5 64 66.5" fill="none" stroke={bandColor} strokeWidth={0.8} opacity="0.5" />
      <path d="M36 69.5 Q50 73.5 64 69.5" fill="none" stroke={bandColor} strokeWidth={0.8} opacity="0.5" />
      {/* Center pendant — small heart charm */}
      <path d="M48 72 C48 70 50 70 50 71.5 C50 70 52 70 52 72 C52 74 50 76 50 76 C50 76 48 74 48 72Z"
        fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      {/* Pendant shine */}
      <circle cx="49.5" cy="72" r="0.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function ButterflyClip({ fill }: AccessoryPartProps) {
  const wingColor = fill || '#E6A0FF';
  return (
    <g>
      {/* Butterfly hair clip — sits on right side of head */}
      {/* Left upper wing */}
      <path d="M72 18 Q66 10 68 16 Q64 12 70 20Z"
        fill={wingColor} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      {/* Right upper wing */}
      <path d="M72 18 Q78 10 76 16 Q80 12 74 20Z"
        fill={wingColor} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      {/* Left lower wing */}
      <path d="M71 20 Q66 24 68 22 Q64 26 70 22Z"
        fill={wingColor} stroke="#000" strokeWidth={0.8} opacity="0.8" strokeLinejoin="round" />
      {/* Right lower wing */}
      <path d="M73 20 Q78 24 76 22 Q80 26 74 22Z"
        fill={wingColor} stroke="#000" strokeWidth={0.8} opacity="0.8" strokeLinejoin="round" />
      {/* Body */}
      <line x1="72" y1="14" x2="72" y2="24" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      {/* Antennae */}
      <path d="M72 14 L70 10" stroke="#000" strokeWidth={0.8} strokeLinecap="round" />
      <path d="M72 14 L74 10" stroke="#000" strokeWidth={0.8} strokeLinecap="round" />
      <circle cx="70" cy="10" r="0.8" fill="#000" />
      <circle cx="74" cy="10" r="0.8" fill="#000" />
      {/* Wing pattern dots */}
      <circle cx="68" cy="16" r="1" fill="#fff" opacity="0.4" />
      <circle cx="76" cy="16" r="1" fill="#fff" opacity="0.4" />
    </g>
  );
}

// ==================== New epic/cool accessories ====================

/** Back-layer: white feathered angel wings spreading behind the head. */
function AngelWings({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#FFFFFF';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}angelW`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor={c} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M22 40 Q2 30 4 52 Q6 70 24 64 Q14 58 14 50 Q14 44 22 40Z" fill={`url(#${u}angelW)`} stroke="#000" strokeWidth={S} />
      <path d="M20 44 Q8 41 8 52 M20 50 Q10 49 9 58" stroke="#000" strokeWidth={0.8} opacity="0.25" fill="none" />
      <path d="M78 40 Q98 30 96 52 Q94 70 76 64 Q86 58 86 50 Q86 44 78 40Z" fill={`url(#${u}angelW)`} stroke="#000" strokeWidth={S} />
      <path d="M80 44 Q92 41 92 52 M80 50 Q90 49 91 58" stroke="#000" strokeWidth={0.8} opacity="0.25" fill="none" />
    </g>
  );
}

/** Back-layer: dark bat-style demon wings. */
function DemonWings({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#7A1020';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}demonW`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} />
          <stop offset="100%" stopColor="#3A0810" />
        </linearGradient>
      </defs>
      <path d="M24 38 Q4 32 2 50 L10 48 L6 58 L16 54 L12 64 L24 58Z" fill={`url(#${u}demonW)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M22 42 L9 49 M22 50 L12 57" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M76 38 Q96 32 98 50 L90 48 L94 58 L84 54 L88 64 L76 58Z" fill={`url(#${u}demonW)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M78 42 L91 49 M78 50 L88 57" stroke="#000" strokeWidth={0.8} opacity="0.4" />
    </g>
  );
}

/** Back-layer: colorful butterfly wings (upper + lower lobes). */
function ButterflyWings({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#FF1493';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}flutter`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c} />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <ellipse cx="14" cy="40" rx="12" ry="10" fill={`url(#${u}flutter)`} stroke="#000" strokeWidth={S} />
      <ellipse cx="16" cy="61" rx="9" ry="9" fill={`url(#${u}flutter)`} stroke="#000" strokeWidth={S} />
      <circle cx="12" cy="40" r="2.5" fill="#fff" opacity="0.6" />
      <circle cx="15" cy="61" r="2" fill="#fff" opacity="0.6" />
      <ellipse cx="86" cy="40" rx="12" ry="10" fill={`url(#${u}flutter)`} stroke="#000" strokeWidth={S} />
      <ellipse cx="84" cy="61" rx="9" ry="9" fill={`url(#${u}flutter)`} stroke="#000" strokeWidth={S} />
      <circle cx="88" cy="40" r="2.5" fill="#fff" opacity="0.6" />
      <circle cx="85" cy="61" r="2" fill="#fff" opacity="0.6" />
    </g>
  );
}

/** RGB gaming headset — band over head, ear cups, mic boom. */
function GamerHeadset({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#1A1A2E';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}rgb`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF1493" />
          <stop offset="50%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#BFFF00" />
        </linearGradient>
      </defs>
      <path d="M18 38 Q18 8 50 8 Q82 8 82 38" fill="none" stroke={c} strokeWidth={7} strokeLinecap="round" />
      <path d="M30 11 Q50 6 70 11" fill="none" stroke={`url(#${u}rgb)`} strokeWidth={2.4} strokeLinecap="round" />
      <rect x="9" y="36" width="14" height="19" rx="5" fill={c} stroke="#000" strokeWidth={SO} />
      <rect x="77" y="36" width="14" height="19" rx="5" fill={c} stroke="#000" strokeWidth={SO} />
      <circle cx="16" cy="45.5" r="3" fill="#00FFFF" opacity="0.85" />
      <circle cx="84" cy="45.5" r="3" fill="#00FFFF" opacity="0.85" />
      <path d="M77 50 Q60 56 55 63" fill="none" stroke="#000" strokeWidth={2} />
      <circle cx="54" cy="63.5" r="2.6" fill="#FF1493" stroke="#000" strokeWidth={1} />
    </g>
  );
}

/** Cowboy hat — wide brim + dented crown + gold band stud. */
function CowboyHat({ fill }: AccessoryPartProps) {
  const c = fill && fill !== '#000000' ? fill : '#8B5A2B';
  return (
    <g>
      <path d="M8 30 Q50 21 92 30 Q50 41 8 30Z" fill={c} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M30 31 Q30 10 50 9 Q70 10 70 31 Q50 26 30 31Z" fill={c} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M44 12 Q50 16 56 12" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      <path d="M31 28 Q50 25 69 28" fill="none" stroke="#5A3A1A" strokeWidth={3.5} />
      <circle cx="50" cy="27" r="1.6" fill="#FFD700" stroke="#000" strokeWidth={0.6} />
    </g>
  );
}

/** Pirate bicorne with skull & crossbones. */
function PirateHat({ fill }: AccessoryPartProps) {
  const c = fill && fill !== '#000000' ? fill : '#1A1A2E';
  return (
    <g>
      <path d="M14 31 Q22 8 50 14 Q78 8 86 31 Q50 24 14 31Z" fill={c} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <circle cx="50" cy="22" r="5" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="48" cy="21" r="1" fill="#000" />
      <circle cx="52" cy="21" r="1" fill="#000" />
      <path d="M46.5 25.5 L53.5 25.5" stroke="#000" strokeWidth={1.6} />
      <path d="M43 28 L57 18 M43 18 L57 28" stroke="#fff" strokeWidth={1.6} opacity="0.9" />
    </g>
  );
}

/** Classy top hat with red band. */
function TopHat({ fill }: AccessoryPartProps) {
  const c = fill && fill !== '#000000' ? fill : '#16213E';
  return (
    <g>
      <ellipse cx="50" cy="29" rx="34" ry="6" fill={c} stroke="#000" strokeWidth={SO} />
      <path d="M32 29 L34 4 Q50 1 66 4 L68 29Z" fill={c} stroke="#000" strokeWidth={SO} />
      <ellipse cx="50" cy="4" rx="16" ry="4" fill={c} stroke="#000" strokeWidth={S} />
      <rect x="33" y="21" width="34" height="5" fill="#C62828" />
      <path d="M38 26 L40 7" stroke="#fff" strokeWidth={2} opacity="0.2" />
    </g>
  );
}

/** Graduation mortarboard with gold tassel. */
function GraduationCap({ fill }: AccessoryPartProps) {
  const c = fill && fill !== '#000000' ? fill : '#1A1A2E';
  return (
    <g>
      <path d="M34 26 Q50 22 66 26 L66 33 Q50 37 34 33Z" fill={c} stroke="#000" strokeWidth={S} />
      <path d="M18 22 L50 12 L82 22 L50 32Z" fill={c} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <circle cx="50" cy="22" r="2.5" fill="#FFD700" stroke="#000" strokeWidth={1} />
      <path d="M50 22 Q66 24 68 30" fill="none" stroke="#FFD700" strokeWidth={1.5} />
      <rect x="66" y="30" width="4.5" height="9" rx="2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
    </g>
  );
}

/** Tin-foil hat — crinkled cone with a little signal ball. */
function TinfoilHat({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}foil`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ECECEC" />
          <stop offset="50%" stopColor="#A9A9A9" />
          <stop offset="100%" stopColor="#D4D4D4" />
        </linearGradient>
      </defs>
      <path d="M28 32 L50 6 L72 32 Q50 26 28 32Z" fill={`url(#${u}foil)`} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M42 28 L48 12 M56 28 L52 12 M36 30 L44 18" stroke="#000" strokeWidth={0.7} opacity="0.3" />
      <line x1="50" y1="6" x2="50" y2="1" stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="1" r="2" fill="#BFFF00" stroke="#000" strokeWidth={1} />
      <path d="M46 26 L50 9" stroke="#fff" strokeWidth={2} opacity="0.4" />
    </g>
  );
}

/** Rubber duck perched on the head (funny). */
function DuckHat({ fill }: AccessoryPartProps) {
  const c = fill && fill !== '#000000' ? fill : '#FFD93B';
  return (
    <g>
      <ellipse cx="48" cy="23" rx="16" ry="11" fill={c} stroke="#000" strokeWidth={SO} />
      <circle cx="62" cy="14" r="8" fill={c} stroke="#000" strokeWidth={SO} />
      <path d="M70 13 L79 12 L70 17Z" fill="#FF8C00" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <circle cx="63" cy="12" r="1.7" fill="#000" />
      <circle cx="63.6" cy="11.4" r="0.5" fill="#fff" />
      <path d="M33 21 Q27 16 30 23" fill={c} stroke="#000" strokeWidth={1.5} />
      <path d="M44 24 Q52 28 56 23" fill="none" stroke="#000" strokeWidth={1} opacity="0.4" />
    </g>
  );
}

/** VR headset visor over the eyes with cyan lens glow. */
function VrHeadset({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#1A1A2E';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}vr`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A2A44" />
          <stop offset="100%" stopColor={c} />
        </linearGradient>
      </defs>
      <path d="M24 40 Q24 23 50 23 Q76 23 76 40" fill="none" stroke={c} strokeWidth={5} />
      <rect x="22" y="34" width="56" height="18" rx="6" fill={`url(#${u}vr)`} stroke="#000" strokeWidth={SO} />
      <rect x="28" y="38" width="16" height="10" rx="3" fill="#00FFFF" opacity="0.55" />
      <rect x="56" y="38" width="16" height="10" rx="3" fill="#00FFFF" opacity="0.55" />
      <path d="M48 52 Q50 49 52 52" fill="#000" />
      <path d="M28 36 L70 36" stroke="#fff" strokeWidth={1.5} opacity="0.22" />
    </g>
  );
}

/** Frog perched on head with bulging eyes (epic, funny). */
function FrogHat({ fill }: AccessoryPartProps) {
  const c = fill && fill !== '#000000' ? fill : '#5CB85C';
  return (
    <g>
      <ellipse cx="50" cy="25" rx="20" ry="12" fill={c} stroke="#000" strokeWidth={SO} />
      <ellipse cx="50" cy="28" rx="11" ry="6" fill="#C8E6A0" opacity="0.6" />
      <circle cx="40" cy="12" r="6" fill={c} stroke="#000" strokeWidth={SO} />
      <circle cx="60" cy="12" r="6" fill={c} stroke="#000" strokeWidth={SO} />
      <circle cx="40" cy="11" r="3" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="60" cy="11" r="3" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="40" cy="11.5" r="1.3" fill="#000" />
      <circle cx="60" cy="11.5" r="1.3" fill="#000" />
      <path d="M40 29 Q50 35 60 29" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="37" cy="23" r="1.4" fill="#3D8B3D" />
      <circle cx="63" cy="23" r="1.4" fill="#3D8B3D" />
    </g>
  );
}

/** Halo ring wreathed in flame (epic). */
function FlamingHalo({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}fhalo`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="60%" stopColor="#FFD93B" />
          <stop offset="100%" stopColor="#FFF3B0" />
        </linearGradient>
      </defs>
      <path d="M26 18 Q24 6 30 11 Q31 4 35 11 Q41 4 37 16Z" fill={`url(#${u}fhalo)`} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <path d="M48 10 Q44 -1 51 5 Q53 -2 56 5 Q63 -1 54 12Z" fill={`url(#${u}fhalo)`} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <path d="M74 18 Q76 6 70 11 Q69 4 65 11 Q59 4 63 16Z" fill={`url(#${u}fhalo)`} stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <ellipse cx="50" cy="18" rx="22" ry="6" fill="none" stroke="#FFD93B" strokeWidth={4} />
      <ellipse cx="50" cy="18" rx="22" ry="6" fill="none" stroke="#000" strokeWidth={1} opacity="0.5" />
    </g>
  );
}

/** Jagged frozen ice crown with frost sparkles (epic). */
function IceCrown({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}ice`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0FBFF" />
          <stop offset="100%" stopColor="#7EC8E3" />
        </linearGradient>
      </defs>
      <path d="M26 31 L30 12 L38 24 L50 6 L62 24 L70 12 L74 31 Q50 27 26 31Z" fill={`url(#${u}ice)`} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <path d="M50 13 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4Z" fill="#fff" />
      <circle cx="34" cy="22" r="1.4" fill="#fff" />
      <circle cx="66" cy="22" r="1.4" fill="#fff" />
      <path d="M30 27 Q50 23 70 27" stroke="#fff" strokeWidth={1.2} opacity="0.5" fill="none" />
    </g>
  );
}

/** Legendary gem-encrusted crystal crown with golden glow. */
function CrystalCrown({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}crystalG`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#F5B301" />
        </linearGradient>
        <radialGradient id={`${u}gemR`}>
          <stop offset="0%" stopColor="#FF6BD6" />
          <stop offset="100%" stopColor="#8B2FC9" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="22" rx="34" ry="15" fill="#FFD700" opacity="0.16" />
      <path d="M24 30 L24 21 L34 26 L42 14 L50 24 L58 14 L66 26 L76 21 L76 30 Q50 34 24 30Z" fill={`url(#${u}crystalG)`} stroke="#000" strokeWidth={SO} strokeLinejoin="round" />
      <circle cx="42" cy="16" r="2.6" fill={`url(#${u}gemR)`} stroke="#000" strokeWidth={0.8} />
      <circle cx="58" cy="16" r="2.6" fill={`url(#${u}gemR)`} stroke="#000" strokeWidth={0.8} />
      <circle cx="50" cy="26" r="3.2" fill="#00FFFF" stroke="#000" strokeWidth={0.8} />
      <circle cx="33" cy="25" r="2" fill="#BFFF00" stroke="#000" strokeWidth={0.6} />
      <circle cx="67" cy="25" r="2" fill="#BFFF00" stroke="#000" strokeWidth={0.6} />
      <path d="M50 8 l1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1Z" fill="#fff" />
      <circle cx="30" cy="17" r="1" fill="#fff" />
      <circle cx="70" cy="17" r="1" fill="#fff" />
    </g>
  );
}

export const ACCESSORY_PARTS = {
  none: None,
  glasses: Glasses,
  sunglasses: Sunglasses,
  hat: Hat,
  cap: Cap,
  headband: Headband,
  crown: Crown,
  earring: Earring,
  bandana: Bandana,
  horns: Horns,
  monocle: Monocle,
  eyepatch: Eyepatch,
  tiara: Tiara,
  antenna: Antenna,
  halo: Halo,
  mask: Mask,
  scarf: Scarf,
  bowtie: Bowtie,
  keffiyeh: Keffiyeh,
  fez: Fez,
  mustacheGlasses: MustacheGlasses,
  sombrero: Sombrero,
  turban: Turban,
  noseRing: NoseRing,
  clownNose: ClownNose,
  partyHat: PartyHat,
  propellerHat: PropellerHat,
  viking: Viking,
  devilHorns: DevilHorns,
  headphones: Headphones,
  chefHat: ChefHat,
  cucumberFace: CucumberFace,
  plunger: Plunger,
  samurai: Samurai,
  astronaut: Astronaut,
  wizardHat: WizardHat,
  ninjaScarf: NinjaScarf,
  phoenixCrown: PhoenixCrown,
  monkeyEars: MonkeyEars,
  beanie: Beanie,
  catEars: CatEars,
  flowerCrown: FlowerCrown,
  goggles: Goggles,
  bunnyEars: BunnyEars,
  cyberpunkVisor: CyberpunkVisor,
  bow: Bow,
  pearls: Pearls,
  heartGlasses: HeartGlasses,
  choker: Choker,
  butterflyClip: ButterflyClip,
  angelWings: AngelWings,
  demonWings: DemonWings,
  butterflyWings: ButterflyWings,
  gamerHeadset: GamerHeadset,
  cowboyHat: CowboyHat,
  pirateHat: PirateHat,
  topHat: TopHat,
  graduationCap: GraduationCap,
  tinfoilHat: TinfoilHat,
  duckHat: DuckHat,
  vrHeadset: VrHeadset,
  frogHat: FrogHat,
  flamingHalo: FlamingHalo,
  iceCrown: IceCrown,
  crystalCrown: CrystalCrown,
} as const;

export type AccessoryPart = keyof typeof ACCESSORY_PARTS;
