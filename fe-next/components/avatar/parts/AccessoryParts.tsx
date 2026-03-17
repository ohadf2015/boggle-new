/**
 * Avatar Accessory Parts
 * Avatar accessories, positioned within viewBox 0 0 100 100
 */

const S = 2.5;

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
  return (
    <g>
      <defs>
        <linearGradient id="lensGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="26" y="35" width="20" height="13" rx="4" fill="url(#lensGrad)" stroke="#000" strokeWidth={S} />
      <rect x="54" y="35" width="20" height="13" rx="4" fill="url(#lensGrad)" stroke="#000" strokeWidth={S} />
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
      <ellipse cx="50" cy="24" rx="38" ry="5" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M28 24 Q28 6 50 4 Q72 6 72 24" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M25 28 Q25 10 50 8 Q75 10 75 28" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M25 28 L15 32 Q14 34 18 34 L25 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
      <path d="M24 30 L28 8 L38 22 L50 0 L62 22 L72 8 L76 30Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
  return (
    <g>
      <defs>
        <linearGradient id="hornGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d="M30 30 Q22 15 28 5 Q32 10 35 25" fill="url(#hornGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M70 30 Q78 15 72 5 Q68 10 65 25" fill="url(#hornGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
      <line x1="50" y1="20" x2="50" y2="6" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="50" y1="16" x2="50" y2="14" stroke="#555" strokeWidth={3.5} />
      <line x1="50" y1="12" x2="50" y2="10" stroke="#555" strokeWidth={3.5} />
      <circle cx="50" cy="0" r="4" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="0" r="6" fill={fill} opacity="0.15" />
      <circle cx="49" cy="-1" r="1.2" fill="#fff" opacity="0.4" />
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
      <path d="M18 28 Q18 10 50 6 Q82 10 82 28 L84 40 Q82 45 78 42 L78 30 Q50 18 22 30 L22 42 Q18 45 16 40Z" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M35 26 L35 10 Q50 6 65 10 L65 26" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="26" rx="15" ry="4" fill={fill} stroke="#000" strokeWidth={S} />
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
      <ellipse cx="50" cy="26" rx="46" ry="8" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M32 26 Q32 6 50 2 Q68 6 68 26" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M22 32 Q22 8 50 4 Q78 8 78 32" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M30 28 L50 -2 L70 28Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 20 L50 2 L64 20" fill="none" stroke="#FF1493" strokeWidth={2} opacity="0.5" />
      <path d="M40 14 L50 2 L60 14" fill="none" stroke="#00FFFF" strokeWidth={2} opacity="0.5" />
      <circle cx="50" cy="-2" r="5" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      <path d="M30 28 Q25 50 22 58" stroke="#000" strokeWidth={1} fill="none" opacity="0.4" />
      <path d="M70 28 Q75 50 78 58" stroke="#000" strokeWidth={1} fill="none" opacity="0.4" />
    </g>
  );
}

function PropellerHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M28 28 Q28 10 50 6 Q72 10 72 28" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="28" rx="22" ry="3" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M24 32 Q24 10 50 6 Q76 10 76 32" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M48 32 L50 52 L52 32" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M24 26 Q14 18 8 4 Q12 8 18 10 Q20 16 24 22" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M76 26 Q86 18 92 4 Q88 8 82 10 Q80 16 76 22" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
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
      <path d="M50 98 Q55 90 60 92 Q65 88 62 82" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M60 80 L62 82 L64 78" fill={c} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Headphones({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M18 42 Q18 10 50 4 Q82 10 82 42" fill="none" stroke={fill} strokeWidth={4} />
      <path d="M18 42 Q18 10 50 4 Q82 10 82 42" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <rect x="12" y="38" width="12" height="16" rx="4" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="14" y="41" width="8" height="10" rx="2" fill="#000" opacity="0.2" />
      <path d="M16 43 L16 49 M18 43 L18 49 M20 43 L20 49" stroke="#000" strokeWidth={0.5} opacity="0.15" />
      <rect x="76" y="38" width="12" height="16" rx="4" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="78" y="41" width="8" height="10" rx="2" fill="#000" opacity="0.2" />
      <path d="M80 43 L80 49 M82 43 L82 49 M84 43 L84 49" stroke="#000" strokeWidth={0.5} opacity="0.15" />
      <circle cx="14" cy="42" r="1" fill={fill} opacity="0.5" />
    </g>
  );
}

function ChefHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="38" cy="6" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="6" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="2" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="44" cy="12" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="56" cy="12" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="30" y="20" width="40" height="8" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="45" cy="6" r="1" fill="#000" opacity="0.06" />
      <circle cx="55" cy="8" r="0.8" fill="#000" opacity="0.05" />
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
      <line x1="50" y1="18" x2="50" y2="-4" stroke="#8B6E4E" strokeWidth={3} strokeLinecap="round" />
      <path d="M38 18 Q38 10 50 8 Q62 10 62 18 Q62 24 50 26 Q38 24 38 18Z" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="22" r="3" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Samurai({ fill }: AccessoryPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="samuraiGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#333" />
        </linearGradient>
      </defs>
      <path d="M20 35 Q50 8 80 35 L75 30 Q50 12 25 30Z" fill="url(#samuraiGrad)" stroke="#000" strokeWidth={S} />
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
  return (
    <g>
      <defs>
        <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="1">
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
      <ellipse cx="50" cy="42" rx="28" ry="24" fill="url(#visorGrad)" />
      <path d="M20 44 L22 44 M78 44 L80 44" stroke={fill} strokeWidth={1.5} opacity="0.5" />
      <circle cx="30" cy="62" r="1.5" fill={fill} stroke="#000" strokeWidth={0.5} opacity="0.6" />
    </g>
  );
}

function WizardHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="wizardGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#1A0033" />
        </linearGradient>
      </defs>
      <path d="M25 32 L50 -5 L75 32 Q62 28 50 30 Q38 28 25 32Z" fill="url(#wizardGrad)" stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="32" rx="30" ry="5" fill={fill} stroke="#000" strokeWidth={S} />
      <polygon points="40,10 41,13 44,13 41.5,15 42.5,18 40,16 37.5,18 38.5,15 36,13 39,13" fill="#FFD700" />
      <polygon points="58,16 59,18 61,18 59.5,19.5 60,21.5 58,20 56,21.5 56.5,19.5 55,18 57,18" fill="#FFD700" />
      <circle cx="48" cy="22" r="1.5" fill="#E040FB" opacity="0.8" />
      <circle cx="34" cy="24" r="1" fill="#FFD700" opacity="0.5" />
      <circle cx="64" cy="20" r="0.8" fill="#E040FB" opacity="0.4" />
      <path d="M50 -5 Q56 -2 52 4" fill="none" stroke="#FFD700" strokeWidth={1.5} strokeLinecap="round" />
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
  return (
    <g>
      <defs>
        <linearGradient id="phoenixCrownGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#B71C1C" />
          <stop offset="40%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
        <linearGradient id="phoenixWingGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="30%" stopColor="#FF6D00" />
          <stop offset="60%" stopColor="#FFAB00" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
        <radialGradient id="phoenixGemGrad" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="40%" stopColor="#FF1744" />
          <stop offset="100%" stopColor="#B71C1C" />
        </radialGradient>
      </defs>
      <path d="M22 28 C14 18 8 6 18 -2 C22 8 26 4 28 12 C30 6 34 2 32 14 L28 26Z"
        fill="url(#phoenixWingGrad)" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M78 28 C86 18 92 6 82 -2 C78 8 74 4 72 12 C70 6 66 2 68 14 L72 26Z"
        fill="url(#phoenixWingGrad)" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M25 30 L75 30 L73 26 L27 26Z" fill="url(#phoenixCrownGrad)" stroke="#000" strokeWidth={S} />
      <path d="M28 26 L35 14 L42 26" fill="url(#phoenixCrownGrad)" stroke="#000" strokeWidth={1.5} />
      <path d="M42 26 L50 8 L58 26" fill="url(#phoenixCrownGrad)" stroke="#000" strokeWidth={1.5} />
      <path d="M58 26 L65 14 L72 26" fill="url(#phoenixCrownGrad)" stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="18" r="4" fill="url(#phoenixGemGrad)" stroke="#000" strokeWidth={1.5} />
      <circle cx="35" cy="22" r="2.5" fill="url(#phoenixGemGrad)" stroke="#000" strokeWidth={1} />
      <circle cx="65" cy="22" r="2.5" fill="url(#phoenixGemGrad)" stroke="#000" strokeWidth={1} />
      <circle cx="20" cy="8" r="1" fill="#FFD600" opacity="0.7" />
      <circle cx="42" cy="2" r="0.8" fill="#FF6D00" opacity="0.6" />
      <circle cx="58" cy="4" r="1" fill="#FFD600" opacity="0.7" />
      <circle cx="80" cy="8" r="0.8" fill="#FF6D00" opacity="0.6" />
      <circle cx="50" cy="0" r="1.2" fill="#fff" opacity="0.5" />
      <circle cx="30" cy="4" r="0.6" fill="#FFD600" opacity="0.5" />
      <circle cx="70" cy="2" r="0.7" fill="#FFAB00" opacity="0.5" />
      <line x1="30" y1="28" x2="70" y2="28" stroke="#FFD600" strokeWidth={1} opacity="0.6" />
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
} as const;

export type AccessoryPart = keyof typeof ACCESSORY_PARTS;
