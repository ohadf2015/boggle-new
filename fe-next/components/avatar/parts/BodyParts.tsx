/**
 * Avatar Body Parts
 * Male & female torso/shoulders silhouette at the bottom of the avatar.
 * Positioned at y≈70-100 within viewBox 0 0 100 100.
 * Designed to be clearly distinguishable even at small avatar sizes (64px).
 */

import { STROKE_OUTER, darken } from './avatarDesignConstants';

const S = STROKE_OUTER; // neo-brutalist thick outlines

interface BodyPartProps {
  fill: string;
  /** Shirt/clothing color — overrides the default gender-based color */
  shirtColor?: string;
}

function Male({ fill, shirtColor }: BodyPartProps) {
  const shirt = shirtColor || '#4A90D9';
  const shirtShadow = darken(shirt);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Neck — wide, masculine, slightly darker than face for depth */}
      <rect x="38" y="68" width="24" height="14" rx="3" fill={neckShade} stroke="#000" strokeWidth={S} />
      {/* Broad t-shirt — shoulders extend to edges */}
      <path
        d="M0 100 L0 86 Q0 76 14 74 L38 71 L62 71 L86 74 Q100 76 100 86 L100 100Z"
        fill={shirt}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Shoulder depth shading */}
      <path d="M0 86 Q0 76 14 74 L26 73 Q10 78 10 88 L10 100 L0 100Z" fill={shirtShadow} stroke="none" opacity={0.5} />
      <path d="M100 86 Q100 76 86 74 L74 73 Q90 78 90 88 L90 100 L100 100Z" fill={shirtShadow} stroke="none" opacity={0.5} />
      {/* Crew-neck collar */}
      <path d="M38 71 Q50 80 62 71" fill={neckShade} stroke="#000" strokeWidth={2} strokeLinecap="round" />
      {/* Shirt crease lines */}
      <line x1="42" y1="82" x2="40" y2="100" stroke={shirtShadow} strokeWidth={1.5} opacity={0.3} />
      <line x1="58" y1="82" x2="60" y2="100" stroke={shirtShadow} strokeWidth={1.5} opacity={0.3} />
    </g>
  );
}

function Female({ fill, shirtColor }: BodyPartProps) {
  const shirt = shirtColor || '#E85D9B';
  const shirtShadow = darken(shirt);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Slender neck — slightly darker than face for depth */}
      <rect x="43" y="68" width="14" height="14" rx="3" fill={neckShade} stroke="#000" strokeWidth={S} />
      {/* Fitted top — shoulders with gentle feminine curve */}
      <path
        d="M0 100 L0 89 Q0 80 12 77 L43 73 L57 73 L88 77 Q100 80 100 89 L100 100Z"
        fill={shirt}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Shoulder depth shading */}
      <path d="M0 89 Q0 80 12 77 L24 75.5 Q8 81 8 90 L8 100 L0 100Z" fill={shirtShadow} stroke="none" opacity={0.45} />
      <path d="M100 89 Q100 80 88 77 L76 75.5 Q92 81 92 90 L92 100 L100 100Z" fill={shirtShadow} stroke="none" opacity={0.45} />
      {/* Elegant V-neck */}
      <path d="M43 73 L50 86 L57 73" fill={neckShade} stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Collarbone hint */}
      <path d="M34 76 Q43 73 50 74 Q57 73 66 76" fill="none" stroke="#000" strokeWidth={1} opacity={0.2} strokeLinecap="round" />
      {/* Shirt drape lines */}
      <line x1="44" y1="84" x2="42" y2="100" stroke={shirtShadow} strokeWidth={1.5} opacity={0.25} />
      <line x1="56" y1="84" x2="58" y2="100" stroke={shirtShadow} strokeWidth={1.5} opacity={0.25} />
    </g>
  );
}

export const BODY_PARTS = {
  male: Male,
  female: Female,
} as const;

export type BodyPart = keyof typeof BODY_PARTS;
