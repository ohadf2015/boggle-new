/**
 * Avatar Accessory Parts
 * 10 accessories, positioned within viewBox 0 0 100 100
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
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <path d="M47 42 L53 42" stroke={fill} strokeWidth={S} />
      <path d="M29 42 L22 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M71 42 L78 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Sunglasses({ fill }: AccessoryPartProps) {
  return (
    <g>
      <rect x="27" y="36" width="18" height="12" rx="3" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="55" y="36" width="18" height="12" rx="3" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M45 42 L55 42" stroke="#000" strokeWidth={S} />
      <path d="M27 40 L20 37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M73 40 L80 37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Reflection */}
      <line x1="31" y1="39" x2="36" y2="39" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
      <line x1="59" y1="39" x2="64" y2="39" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
    </g>
  );
}

function Hat({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Hat brim */}
      <ellipse cx="50" cy="24" rx="38" ry="5" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Hat dome */}
      <path d="M28 24 Q28 6 50 4 Q72 6 72 24" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Hat band */}
      <rect x="28" y="20" width="44" height="4" fill="#000" opacity="0.3" />
    </g>
  );
}

function Cap({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Cap dome */}
      <path d="M25 28 Q25 10 50 8 Q75 10 75 28" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Visor */}
      <path d="M25 28 L15 32 Q14 34 18 34 L25 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Button on top */}
      <circle cx="50" cy="8" r="2.5" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Headband({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 32 Q50 26 78 32" fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" />
      <path d="M22 32 Q50 26 78 32" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function Crown({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path
        d="M26 28 L30 10 L38 22 L50 4 L62 22 L70 10 L74 28Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Gems */}
      <circle cx="38" cy="22" r="2" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="14" r="2.5" fill="#00FFFF" stroke="#000" strokeWidth={1} />
      <circle cx="62" cy="22" r="2" fill="#BFFF00" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Earring({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left earring */}
      <circle cx="18" cy="52" r="4" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="18" cy="52" r="1.5" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Bandana({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Wrap around forehead */}
      <path d="M20 30 Q50 22 80 30" fill="none" stroke={fill} strokeWidth={7} strokeLinecap="round" />
      <path d="M20 30 Q50 22 80 30" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Tie knot on side */}
      <path d="M78 30 L88 38 M78 30 L86 44" stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <path d="M78 30 L88 38 M78 30 L86 44" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Horns({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left horn */}
      <path
        d="M30 30 Q22 15 28 5 Q32 10 35 25"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Right horn */}
      <path
        d="M70 30 Q78 15 72 5 Q68 10 65 25"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Horn ridges */}
      <path d="M29 22 L33 20" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M28 16 L32 15" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M71 22 L67 20" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M72 16 L68 15" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function Monocle({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <line x1="71" y1="42" x2="78" y2="60" stroke={fill} strokeWidth={1.5} />
    </g>
  );
}

function Eyepatch({ fill }: AccessoryPartProps) {
  return (
    <g>
      <ellipse cx="38" cy="42" rx="9" ry="7" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="29" y1="38" x2="20" y2="30" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="47" y1="38" x2="80" y2="30" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Tiara({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M30 26 L35 16 L40 22 L45 12 L50 20 L55 12 L60 22 L65 16 L70 26" fill="none" stroke={fill} strokeWidth={S} strokeLinejoin="round" />
      <circle cx="45" cy="14" r="2" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="55" cy="14" r="2" fill="#00FFFF" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Antenna({ fill }: AccessoryPartProps) {
  return (
    <g>
      <line x1="50" y1="20" x2="50" y2="2" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <circle cx="50" cy="0" r="4" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Halo({ fill }: AccessoryPartProps) {
  return (
    <ellipse cx="50" cy="12" rx="22" ry="6" fill="none" stroke={fill} strokeWidth={S} opacity="0.9" />
  );
}

function Mask({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M26 36 Q50 30 74 36 L74 48 Q50 54 26 48Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <ellipse cx="38" cy="42" rx="7" ry="5" fill="#000" />
      <ellipse cx="62" cy="42" rx="7" ry="5" fill="#000" />
    </g>
  );
}

function Scarf({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 72 Q50 65 78 72 Q80 78 78 82 Q50 75 22 82 Q20 78 22 72Z" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M40 80 L36 95 Q38 97 42 95 L44 82" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function Bowtie({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M38 78 L50 72 L62 78 L50 84Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <circle cx="50" cy="78" r="3" fill="#000" opacity="0.3" />
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
} as const;

export type AccessoryPart = keyof typeof ACCESSORY_PARTS;
