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

export const BASE_PARTS = {
  round: Round,
  square: Square,
  oval: Oval,
  heart: Heart,
  diamond: Diamond,
  hexagon: Hexagon,
  blob: Blob,
} as const;

export type BasePart = keyof typeof BASE_PARTS;
