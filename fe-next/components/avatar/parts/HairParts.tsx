/**
 * Avatar Hair Parts
 * 18 hair styles, positioned relative to head top within viewBox 0 0 100 100
 * Hair renders in two layers: back (behind face) and front (on top)
 * Feminine styles designed with more volume, flow, and visibility
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
      <path d="M25 35 Q50 22 75 35" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      {/* Voluminous curly mass — bouncy curls framing the face */}
      <circle cx="25" cy="32" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="42" cy="18" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="60" cy="18" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="75" cy="32" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="18" cy="48" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="82" cy="48" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="15" cy="62" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="85" cy="62" r="8" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Long({ fill }: HairPartProps) {
  return (
    <g>
      {/* Full long hair flowing past shoulders */}
      <path
        d="M18 30 Q18 12 50 8 Q82 12 82 30 L85 65 Q84 80 78 85 Q74 88 72 80 L72 42 Q50 28 28 42 L28 80 Q26 88 22 85 Q16 80 15 65Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M30 45 Q50 32 70 45" fill="none" stroke="#000" strokeWidth={1} opacity="0.15" />
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
      <path
        d="M42 32 L42 2 Q50 -2 58 2 L58 32"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M25 35 Q25 28 42 32" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M75 35 Q75 28 58 32" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  return (
    <g>
      {/* Fuller bob with more volume */}
      <path
        d="M18 30 Q18 12 50 10 Q82 12 82 30 L82 55 Q80 62 74 58 L74 38 Q50 24 26 38 L26 58 Q20 62 18 55Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M74 52 Q72 58 68 55" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M26 52 Q28 58 32 55" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Ponytail({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 35 Q22 12 50 10 Q78 12 78 35" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M22 35 Q24 28 35 30" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Long flowing ponytail */}
      <path
        d="M68 28 Q88 22 92 42 Q95 62 85 75 Q80 82 75 72 Q82 55 78 38"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="28" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Afro({ fill }: HairPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="30" rx="38" ry="30" fill={fill} stroke="#000" strokeWidth={S} />
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
      {/* Voluminous wavy hair flowing down both sides */}
      <path
        d="M18 32 Q18 12 50 8 Q82 12 82 32 L85 48 Q83 58 78 52 Q74 46 76 58 Q74 70 68 64 L68 38 Q50 22 32 38 L32 64 Q26 70 24 58 Q26 46 22 52 Q17 58 15 48Z"
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
      <line x1="50" y1="12" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.25" />
      {/* Left pigtail — 3-tier cascading */}
      <circle cx="14" cy="42" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="10" cy="58" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="12" cy="72" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Right pigtail */}
      <circle cx="86" cy="42" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="90" cy="58" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="88" cy="72" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="20" cy="35" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
      <circle cx="80" cy="35" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Topknot({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M30 35 Q30 20 50 18 Q70 20 70 35" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="8" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="16" rx="6" ry="2" fill="#000" opacity="0.3" />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M25 35 Q25 22 38 18" fill="none" stroke={fill} strokeWidth={1} opacity="0.3" />
      <circle cx="28" cy="30" r="1" fill={fill} opacity="0.3" />
      <circle cx="30" cy="26" r="1" fill={fill} opacity="0.3" />
      <circle cx="33" cy="23" r="1" fill={fill} opacity="0.3" />
      {/* Long side with more volume and flow */}
      <path d="M42 18 Q68 10 82 30 L85 62 Q83 70 78 66 L78 38 Q62 18 42 22Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M22 30 Q22 14 50 12 Q78 14 78 30" fill={fill} stroke="#000" strokeWidth={S} />
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
      <path d="M22 35 Q22 12 50 10 Q78 12 78 35" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="10" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Left braid — thicker */}
      <path
        d="M26 36 L22 46 L28 52 L22 60 L28 66 L22 74 L26 82"
        fill="none" stroke={fill} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M26 36 L22 46 L28 52 L22 60 L28 66 L22 74 L26 82"
        fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Right braid */}
      <path
        d="M74 36 L78 46 L72 52 L78 60 L72 66 L78 74 L74 82"
        fill="none" stroke={fill} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M74 36 L78 46 L72 52 L78 60 L72 66 L78 74 L74 82"
        fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="26" cy="84" r="3" fill="#FF1493" stroke="#000" strokeWidth={2} />
      <circle cx="74" cy="84" r="3" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Bun({ fill }: HairPartProps) {
  return (
    <g>
      {/* Smooth hair swept back */}
      <path d="M22 35 Q22 12 50 10 Q78 12 78 35 Q74 26 50 24 Q26 26 22 35Z" fill={fill} stroke="#000" strokeWidth={S} />
      {/* High bun — prominent */}
      <circle cx="50" cy="6" r="15" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M45 2 Q50 8 55 2 Q53 10 47 10 Q43 8 45 2" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      <path d="M40 30 Q42 18 44 12" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M60 30 Q58 18 56 12" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Bangs({ fill }: HairPartProps) {
  return (
    <g>
      {/* Full voluminous hair behind — longer */}
      <path
        d="M18 30 Q18 12 50 8 Q82 12 82 30 L82 60 Q80 66 76 62 L76 38 Q50 24 24 38 L24 62 Q20 66 18 60Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Thick front bangs with wispy edges */}
      <path
        d="M20 34 Q20 14 50 10 Q80 14 80 34 L74 40 L66 36 L58 42 L50 36 L42 42 L34 36 L26 40Z"
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
      <path d="M22 35 Q22 12 50 10 Q78 12 78 35" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="10" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.3" />
      {/* Left long flowing tail */}
      <path
        d="M22 35 Q12 42 8 58 Q5 76 12 88 Q18 95 22 85 Q16 70 20 55 Q22 44 28 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      {/* Right long flowing tail */}
      <path
        d="M78 35 Q88 42 92 58 Q95 76 88 88 Q82 95 78 85 Q84 70 80 55 Q78 44 72 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      <circle cx="24" cy="36" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
      <circle cx="76" cy="36" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Mullet({ fill }: HairPartProps) {
  return (
    <g>
      {/* Short on top */}
      <path d="M25 35 Q25 16 50 14 Q75 16 75 35" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Business in the front — neat bangs */}
      <path d="M30 35 Q35 28 45 30 Q55 28 65 30 Q70 28 72 35" fill={fill} stroke="#000" strokeWidth={1.5} />
      {/* Party in the back — long flowing back */}
      <path d="M68 32 Q80 35 84 55 Q86 75 80 88 Q75 92 72 82 Q78 65 74 45" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 32 Q20 35 16 55 Q14 75 20 88 Q25 92 28 82 Q22 65 26 45" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function Combover({ fill }: HairPartProps) {
  return (
    <g>
      {/* Bald top — just skin showing through */}
      <path d="M30 35 Q30 28 42 26 Q38 22 50 20 Q62 22 58 26 Q70 28 70 35" fill={fill} stroke="#000" strokeWidth={S} opacity="0.4" />
      {/* Dramatic combover sweep from left */}
      <path d="M20 38 Q18 20 30 14 Q40 10 52 14 Q60 18 65 28 Q58 22 48 20 Q35 18 25 28 Q22 34 24 40" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Side hair */}
      <path d="M20 35 Q20 50 22 55" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M80 35 Q80 50 78 55" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Elvis({ fill }: HairPartProps) {
  return (
    <g>
      {/* Base hair swept back */}
      <path d="M22 35 Q22 14 50 10 Q78 14 78 35" fill={fill} stroke="#000" strokeWidth={S} />
      {/* The iconic pompadour — big swooping quiff */}
      <path d="M30 30 Q28 8 42 2 Q52 0 56 8 Q58 14 52 22 Q46 28 40 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Volume highlight */}
      <path d="M36 14 Q42 6 48 10" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Sideburns */}
      <rect x="20" y="35" width="5" height="18" rx="2" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="75" y="35" width="5" height="18" rx="2" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Ramen({ fill }: HairPartProps) {
  return (
    <g>
      {/* A bowl of ramen on the head */}
      {/* Bowl */}
      <path d="M20 28 Q20 38 50 40 Q80 38 80 28" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M20 28 Q50 20 80 28" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Broth */}
      <path d="M24 28 Q50 22 76 28 Q76 34 50 36 Q24 34 24 28Z" fill="#F5DEB3" stroke="none" />
      {/* Noodle squiggles */}
      <path d="M30 30 Q35 26 40 30 Q45 34 50 30 Q55 26 60 30 Q65 34 70 30" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" />
      <path d="M34 34 Q39 30 44 34 Q49 38 54 34 Q59 30 64 34" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" />
      {/* Egg slice */}
      <ellipse cx="60" cy="28" rx="5" ry="4" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="60" cy="28" r="2" fill="#FFD700" />
      {/* Chopsticks */}
      <line x1="42" y1="26" x2="36" y2="6" stroke="#8B6E4E" strokeWidth={2} strokeLinecap="round" />
      <line x1="46" y1="26" x2="44" y2="6" stroke="#8B6E4E" strokeWidth={2} strokeLinecap="round" />
      {/* Steam */}
      <path d="M35 22 Q33 16 36 12" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.4" />
      <path d="M55 20 Q53 14 56 10" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.4" />
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
  mullet: Mullet,
  combover: Combover,
  elvis: Elvis,
  ramen: Ramen,
} as const;

export type HairPart = keyof typeof HAIR_PARTS;
