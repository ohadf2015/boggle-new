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
    <circle cx="50" cy="52" r="35" fill={fill} stroke="#000" strokeWidth={S} />
  );
}

function Square({ fill }: BasePartProps) {
  return (
    <rect x="16" y="18" width="68" height="68" rx="8" fill={fill} stroke="#000" strokeWidth={S} />
  );
}

function Oval({ fill }: BasePartProps) {
  return (
    <ellipse cx="50" cy="52" rx="32" ry="38" fill={fill} stroke="#000" strokeWidth={S} />
  );
}

function Heart({ fill }: BasePartProps) {
  return (
    <path
      d="M50 85 C20 65 10 45 20 32 C28 22 40 22 50 35 C60 22 72 22 80 32 C90 45 80 65 50 85Z"
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
      d="M50 14 L82 52 L50 88 L18 52Z"
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
      points="50,14 82,30 82,70 50,86 18,70 18,30"
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
      d="M50 16 C72 14 88 28 86 50 C88 72 74 88 52 86 C30 90 12 74 14 52 C10 30 28 14 50 16Z"
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
