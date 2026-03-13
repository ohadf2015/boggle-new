/**
 * Avatar Body Parts
 * Male & female torso/shoulders silhouette at the bottom of the avatar.
 * Positioned at y≈70-100 within viewBox 0 0 100 100.
 * Designed to be clearly distinguishable even at small avatar sizes (64px).
 */

const S = 3; // stroke width — neo-brutalist thick outlines

interface BodyPartProps {
  fill: string;
}

function Male({ fill }: BodyPartProps) {
  return (
    <g>
      {/* Thick neck */}
      <rect x="40" y="70" width="20" height="10" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Broad squared shoulders */}
      <path
        d="M24 100 L24 88 Q24 80 34 78 L40 77 L60 77 L66 78 Q76 80 76 88 L76 100Z"
        fill="#4A90D9"
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Round collar */}
      <path
        d="M40 77 Q50 83 60 77"
        fill={fill}
        stroke="#000"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function Female({ fill }: BodyPartProps) {
  return (
    <g>
      {/* Slender neck */}
      <rect x="44" y="70" width="12" height="10" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Narrower, rounder shoulders with fitted top */}
      <path
        d="M30 100 L30 90 Q30 83 38 81 L44 79 L56 79 L62 81 Q70 83 70 90 L70 100Z"
        fill="#E85D9B"
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* V-neck with deeper cut */}
      <path
        d="M44 79 L50 90 L56 79"
        fill={fill}
        stroke="#000"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

export const BODY_PARTS = {
  male: Male,
  female: Female,
} as const;

export type BodyPart = keyof typeof BODY_PARTS;
