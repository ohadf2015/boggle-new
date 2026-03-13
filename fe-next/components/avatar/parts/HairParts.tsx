/**
 * Avatar Hair Parts
 * 10 hair styles, positioned relative to head top within viewBox 0 0 100 100
 * Hair renders in two layers: back (behind face) and front (on top)
 */

const S = 3;

interface HairPartProps {
  fill: string;
}

function None() {
  return null;
}

function Spiky({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M25 35 L30 8 L38 28 L42 5 L50 25 L55 2 L60 22 L65 10 L72 30 L75 35"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Base band connecting to head */}
      <path d="M25 35 Q50 22 75 35" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      <circle cx="30" cy="28" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="45" cy="20" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="60" cy="22" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="72" cy="30" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="24" cy="40" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="76" cy="38" r="8" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Long({ fill }: HairPartProps) {
  return (
    <g>
      {/* Main hair mass */}
      <path
        d="M22 30 Q22 15 50 12 Q78 15 78 30 L80 75 Q78 80 72 78 L72 40 Q50 28 28 40 L28 78 Q22 80 20 75Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  return (
    <path
      d="M25 38 Q25 14 50 12 Q75 14 75 38"
      fill={fill}
      stroke="#000"
      strokeWidth={S}
      strokeLinejoin="round"
    />
  );
}

function Mohawk({ fill }: HairPartProps) {
  return (
    <g>
      {/* Tall mohawk strip */}
      <path
        d="M42 32 L42 2 Q50 -2 58 2 L58 32"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Shaved sides (subtle) */}
      <path d="M25 35 Q25 28 42 32" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M75 35 Q75 28 58 32" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M22 30 Q22 14 50 12 Q78 14 78 30 L78 52 Q76 56 70 54 L70 35 Q50 25 30 35 L30 54 Q24 56 22 52Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Ponytail({ fill }: HairPartProps) {
  return (
    <g>
      {/* Top hair */}
      <path
        d="M25 35 Q25 14 50 12 Q75 14 75 35"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
      />
      {/* Ponytail going right */}
      <path
        d="M70 28 Q85 25 88 40 Q90 55 80 60"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinecap="round"
      />
      {/* Hair tie */}
      <circle cx="72" cy="28" r="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Afro({ fill }: HairPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="30" rx="38" ry="30" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Texture dots */}
      <circle cx="35" cy="18" r="2" fill="#000" opacity="0.15" />
      <circle cx="55" cy="12" r="2" fill="#000" opacity="0.15" />
      <circle cx="70" cy="22" r="2" fill="#000" opacity="0.15" />
      <circle cx="28" cy="32" r="2" fill="#000" opacity="0.15" />
      <circle cx="72" cy="35" r="2" fill="#000" opacity="0.15" />
    </g>
  );
}

function Wavy({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M22 32 Q22 14 50 12 Q78 14 78 32 L80 45 Q78 55 74 50 Q70 45 72 55 Q70 65 66 60 L66 35 Q50 24 34 35 L34 60 Q28 65 28 55 Q30 45 26 50 Q22 55 20 45Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Pigtails({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M25 35 Q25 14 50 12 Q75 14 75 35" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Left pigtail */}
      <circle cx="18" cy="45" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="14" cy="55" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Right pigtail */}
      <circle cx="82" cy="45" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="86" cy="55" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Hair ties */}
      <circle cx="22" cy="38" r="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
      <circle cx="78" cy="38" r="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Topknot({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M30 35 Q30 20 50 18 Q70 20 70 35" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Topknot bun */}
      <circle cx="50" cy="8" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Band */}
      <ellipse cx="50" cy="16" rx="6" ry="2" fill="#000" opacity="0.3" />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  return (
    <g>
      {/* Shaved side (left) - dots */}
      <path d="M25 35 Q25 22 38 18" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <circle cx="28" cy="30" r="1" fill={fill} opacity="0.3" />
      <circle cx="30" cy="26" r="1" fill={fill} opacity="0.3" />
      <circle cx="33" cy="23" r="1" fill={fill} opacity="0.3" />
      {/* Long side (right) */}
      <path d="M42 18 Q65 14 78 30 L80 60 Q78 65 74 62 L74 35 Q60 20 42 22Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 30 Q22 14 50 12 Q78 14 78 30" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Individual dreads */}
      <rect x="22" y="30" width="6" height="40" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="30" y="28" width="6" height="45" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="38" y="26" width="6" height="42" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="47" y="25" width="6" height="38" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="56" y="26" width="6" height="44" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="64" y="28" width="6" height="41" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="72" y="30" width="6" height="36" rx="3" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Braids({ fill }: HairPartProps) {
  return (
    <g>
      {/* Top hair */}
      <path d="M25 35 Q25 14 50 12 Q75 14 75 35" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Left braid — zigzag rope */}
      <path
        d="M28 36 L24 46 L30 52 L24 58 L30 64 L24 70 L28 75"
        fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M28 36 L24 46 L30 52 L24 58 L30 64 L24 70 L28 75"
        fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Right braid */}
      <path
        d="M72 36 L76 46 L70 52 L76 58 L70 64 L76 70 L72 75"
        fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M72 36 L76 46 L70 52 L76 58 L70 64 L76 70 L72 75"
        fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Hair ties at bottom */}
      <circle cx="28" cy="76" r="2.5" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
      <circle cx="72" cy="76" r="2.5" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Bun({ fill }: HairPartProps) {
  return (
    <g>
      {/* Smooth hair swept back */}
      <path d="M25 35 Q25 14 50 12 Q75 14 75 35 Q72 28 50 26 Q28 28 25 35Z" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Low bun at the back */}
      <circle cx="50" cy="80" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Bun swirl detail */}
      <path d="M46 76 Q50 80 54 76 Q52 84 48 84 Q44 82 46 76" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.4" />
      {/* Connecting neck hair */}
      <path d="M38 35 Q40 60 42 72 Q50 78 58 72 Q60 60 62 35" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Bangs({ fill }: HairPartProps) {
  return (
    <g>
      {/* Full hair behind */}
      <path
        d="M22 30 Q22 14 50 12 Q78 14 78 30 L78 55 Q76 58 72 56 L72 35 Q50 25 28 35 L28 56 Q24 58 22 55Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Thick front bangs — the key visual feature */}
      <path
        d="M24 32 Q24 16 50 14 Q76 16 76 32 L72 38 L62 36 L54 40 L46 36 L38 40 L28 36Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Twintails({ fill }: HairPartProps) {
  return (
    <g>
      {/* Top hair with center part */}
      <path d="M25 35 Q25 14 50 12 Q75 14 75 35" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Center part line */}
      <line x1="50" y1="12" x2="50" y2="25" stroke="#000" strokeWidth={1} opacity="0.3" />
      {/* Left long tail */}
      <path
        d="M25 35 Q18 40 15 55 Q12 70 18 82 Q22 88 26 80 Q22 65 25 50 Q26 42 30 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      {/* Right long tail */}
      <path
        d="M75 35 Q82 40 85 55 Q88 70 82 82 Q78 88 74 80 Q78 65 75 50 Q74 42 70 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      {/* Hair ties high up */}
      <circle cx="26" cy="37" r="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
      <circle cx="74" cy="37" r="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

export const HAIR_PARTS = {
  none: None,
  spiky: Spiky,
  curly: Curly,
  long: Long,
  buzz: Buzz,
  mohawk: Mohawk,
  bob: Bob,
  ponytail: Ponytail,
  afro: Afro,
  wavy: Wavy,
  pigtails: Pigtails,
  topknot: Topknot,
  sideshave: Sideshave,
  dreads: Dreads,
  braids: Braids,
  bun: Bun,
  bangs: Bangs,
  twintails: Twintails,
} as const;

export type HairPart = keyof typeof HAIR_PARTS;
