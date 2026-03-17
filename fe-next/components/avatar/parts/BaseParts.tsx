/**
 * Avatar Base (Face Shape) Parts
 * 5 face shapes, all centered on viewBox 0 0 100 100
 */

const S = 3; // stroke width — neo-brutalist thick outlines

interface BasePartProps {
  fill: string;
}

function Round({ fill }: BasePartProps) {
  return (
    <circle cx="50" cy="52" r="30" fill={fill} stroke="#000" strokeWidth={S} />
  );
}

function Square({ fill }: BasePartProps) {
  return (
    <rect x="20" y="22" width="60" height="60" rx="8" fill={fill} stroke="#000" strokeWidth={S} />
  );
}

function Oval({ fill }: BasePartProps) {
  return (
    <ellipse cx="50" cy="52" rx="28" ry="33" fill={fill} stroke="#000" strokeWidth={S} />
  );
}

function Heart({ fill }: BasePartProps) {
  return (
    <path
      d="M50 82 C24 64 15 48 23 36 C30 27 42 27 50 38 C58 27 70 27 77 36 C85 48 76 64 50 82Z"
      fill={fill}
      stroke="#000"
      strokeWidth={S}
      strokeLinejoin="round"
    />
  );
}

function Diamond({ fill }: BasePartProps) {
  return (
    <path
      d="M50 18 L78 52 L50 84 L22 52Z"
      fill={fill}
      stroke="#000"
      strokeWidth={S}
      strokeLinejoin="round"
    />
  );
}

function Hexagon({ fill }: BasePartProps) {
  return (
    <polygon
      points="50,18 78,32 78,68 50,84 22,68 22,32"
      fill={fill}
      stroke="#000"
      strokeWidth={S}
      strokeLinejoin="round"
    />
  );
}

function Blob({ fill }: BasePartProps) {
  return (
    <path
      d="M50 20 C70 18 84 30 82 50 C84 70 72 84 52 82 C32 86 16 72 18 52 C14 32 30 18 50 20Z"
      fill={fill}
      stroke="#000"
      strokeWidth={S}
    />
  );
}

function Skull({ fill }: BasePartProps) {
  return (
    <g>
      {/* Skull shape */}
      <path d="M25 55 C25 28 35 18 50 18 C65 18 75 28 75 55 C75 62 70 68 65 70 L60 78 L55 70 L45 70 L40 78 L35 70 C30 68 25 62 25 55Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Cheekbones */}
      <path d="M30 55 Q35 52 38 55" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M62 55 Q65 52 70 55" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.3" />
      {/* Nose cavity hint */}
      <path d="M48 52 L50 56 L52 52" fill="none" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Shield({ fill }: BasePartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Shield/crest shape */}
      <path d="M20 22 L50 16 L80 22 L80 55 Q80 78 50 88 Q20 78 20 55Z"
        fill="url(#shieldGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Inner border */}
      <path d="M25 26 L50 21 L75 26 L75 53 Q75 74 50 83 Q25 74 25 53Z"
        fill="none" stroke="#FFD700" strokeWidth={1.5} opacity="0.5" />
    </g>
  );
}

function StarBase({ fill }: BasePartProps) {
  return (
    <g>
      {/* 5-point star face */}
      <polygon
        points="50,12 58,38 86,38 63,54 72,80 50,64 28,80 37,54 14,38 42,38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
    </g>
  );
}

// ==================== LEGENDARY: Dragon Head ====================
function DragonHead({ fill }: BasePartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="dragonScaleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#1A1A2E" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="dragonHornGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#5D4037" />
          <stop offset="50%" stopColor="#8D6E63" />
          <stop offset="100%" stopColor="#D7CCC8" />
        </linearGradient>
      </defs>
      {/* Main head shape — wider at jaw, narrowing to snout area */}
      <path d="M22 65 C18 55 18 40 25 30 C30 22 40 18 50 18 C60 18 70 22 75 30 C82 40 82 55 78 65 L72 72 Q62 78 50 78 Q38 78 28 72Z"
        fill="url(#dragonScaleGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Left horn */}
      <path d="M28 30 L16 10 L22 14 L18 4 L26 18 L30 24"
        fill="url(#dragonHornGrad)" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Right horn */}
      <path d="M72 30 L84 10 L78 14 L82 4 L74 18 L70 24"
        fill="url(#dragonHornGrad)" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Brow ridges */}
      <path d="M30 34 Q38 28 46 34" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
      <path d="M54 34 Q62 28 70 34" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
      {/* Scale texture lines on forehead */}
      <path d="M40 24 Q50 20 60 24" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <path d="M36 28 Q50 23 64 28" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      {/* Nostrils / snout hint */}
      <circle cx="44" cy="58" r="2" fill="#000" opacity="0.2" />
      <circle cx="56" cy="58" r="2" fill="#000" opacity="0.2" />
      {/* Jaw spikes */}
      <polygon points="24,66 20,72 28,68" fill={fill} stroke="#000" strokeWidth={1} />
      <polygon points="76,66 80,72 72,68" fill={fill} stroke="#000" strokeWidth={1} />
      <polygon points="30,70 27,76 33,72" fill={fill} stroke="#000" strokeWidth={1} />
      <polygon points="70,70 73,76 67,72" fill={fill} stroke="#000" strokeWidth={1} />
    </g>
  );
}

export const BASE_PARTS = {
  round: Round,
  square: Square,
  oval: Oval,
  heart: Heart,
  diamond: Diamond,
  hexagon: Hexagon,
  blob: Blob,
  skull: Skull,
  shield: Shield,
  star: StarBase,
  dragonHead: DragonHead,
} as const;

export type BasePart = keyof typeof BASE_PARTS;
