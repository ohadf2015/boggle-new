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

function Hoodie({ fill, shirtColor }: BodyPartProps) {
  const hoodie = shirtColor || '#6B7280';
  const hoodieShadow = darken(hoodie);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Neck — gender-neutral */}
      <rect x="40" y="68" width="20" height="12" rx="3" fill={neckShade} stroke="#000" strokeWidth={S} />
      {/* Hood behind neck — peeks behind head at y≈66, safely below face zone */}
      <path
        d="M28 74 Q28 68 38 66 L62 66 Q72 68 72 74 L72 80 L28 80Z"
        fill={hoodieShadow}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Hood curve at top */}
      <path d="M28 74 Q28 70 38 68 Q50 65 62 68 Q72 70 72 74" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.3" />
      {/* Main hoodie body — wide relaxed shoulders */}
      <path
        d="M0 100 L0 88 Q0 78 10 75 L36 71 L64 71 L90 75 Q100 78 100 88 L100 100Z"
        fill={hoodie}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Shoulder shading */}
      <path d="M0 88 Q0 78 10 75 L22 73 Q6 79 6 90 L6 100 L0 100Z" fill={hoodieShadow} stroke="none" opacity={0.45} />
      <path d="M100 88 Q100 78 90 75 L78 73 Q94 79 94 90 L94 100 L100 100Z" fill={hoodieShadow} stroke="none" opacity={0.45} />
      {/* Drawstrings */}
      <line x1="46" y1="75" x2="44" y2="88" stroke="#000" strokeWidth={1.2} opacity={0.4} />
      <line x1="54" y1="75" x2="56" y2="88" stroke="#000" strokeWidth={1.2} opacity={0.4} />
      {/* Drawstring tips */}
      <circle cx="44" cy="88" r="1.5" fill="#000" opacity={0.35} />
      <circle cx="56" cy="88" r="1.5" fill="#000" opacity={0.35} />
      {/* Front pocket line */}
      <path d="M34 88 Q50 92 66 88" fill="none" stroke="#000" strokeWidth={1.5} opacity={0.25} />
      <path d="M34 88 L34 100 M66 88 L66 100" stroke="#000" strokeWidth={1} opacity={0.15} />
    </g>
  );
}

function Suit({ fill, shirtColor }: BodyPartProps) {
  const tie = shirtColor || '#C0392B';
  const jacket = darken(shirtColor || '#2C3E50');
  const jacketShadow = darken(jacket);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Neck */}
      <rect x="40" y="68" width="20" height="14" rx="3" fill={neckShade} stroke="#000" strokeWidth={S} />
      {/* Jacket body — structured shoulders */}
      <path
        d="M0 100 L0 86 Q0 76 14 74 L38 71 L62 71 L86 74 Q100 76 100 86 L100 100Z"
        fill={jacket}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Shoulder shading */}
      <path d="M0 86 Q0 76 14 74 L26 73 Q10 78 10 88 L10 100 L0 100Z" fill={jacketShadow} stroke="none" opacity={0.5} />
      <path d="M100 86 Q100 76 86 74 L74 73 Q90 78 90 88 L90 100 L100 100Z" fill={jacketShadow} stroke="none" opacity={0.5} />
      {/* White shirt collar peeking out */}
      <path d="M42 72 L50 80 L58 72" fill="#FFFFFF" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Left lapel */}
      <path d="M38 71 L42 72 L44 84 L38 100 L26 100 L30 82Z" fill={jacket} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Right lapel */}
      <path d="M62 71 L58 72 L56 84 L62 100 L74 100 L70 82Z" fill={jacket} stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
      {/* Lapel inner edge highlight */}
      <path d="M42 72 L44 84" stroke="#000" strokeWidth={0.8} opacity={0.3} />
      <path d="M58 72 L56 84" stroke="#000" strokeWidth={0.8} opacity={0.3} />
      {/* Tie */}
      <path d="M48 76 L50 72 L52 76 L51 96 L50 100 L49 96Z" fill={tie} stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      {/* Tie knot */}
      <path d="M48 74 Q50 70 52 74 Q50 76 48 74Z" fill={darken(tie)} stroke="#000" strokeWidth={1} />
      {/* Button */}
      <circle cx="50" cy="92" r="1.5" fill="#000" opacity={0.4} />
    </g>
  );
}

function Turtleneck({ fill, shirtColor }: BodyPartProps) {
  const sweater = shirtColor || '#5B4A6F';
  const sweaterShadow = darken(sweater);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Neck behind turtleneck — slightly visible */}
      <rect x="40" y="68" width="20" height="8" rx="3" fill={neckShade} stroke="none" />
      {/* Main sweater body */}
      <path
        d="M0 100 L0 87 Q0 77 12 75 L38 71 L62 71 L88 75 Q100 77 100 87 L100 100Z"
        fill={sweater}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Shoulder shading */}
      <path d="M0 87 Q0 77 12 75 L24 73 Q8 79 8 89 L8 100 L0 100Z" fill={sweaterShadow} stroke="none" opacity={0.45} />
      <path d="M100 87 Q100 77 88 75 L76 73 Q92 79 92 89 L92 100 L100 100Z" fill={sweaterShadow} stroke="none" opacity={0.45} />
      {/* High turtleneck — top at y=64, safely below mouth zone (y≈60) */}
      <path
        d="M38 72 L38 66 Q38 64 42 64 L58 64 Q62 64 62 66 L62 72Z"
        fill={sweater}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Turtleneck fold shadow */}
      <path d="M38 69 Q50 71 62 69" fill="none" stroke={sweaterShadow} strokeWidth={1.5} opacity={0.5} />
      {/* Ribbed texture lines at neck */}
      <line x1="39" y1="65" x2="61" y2="65" stroke="#000" strokeWidth={0.7} opacity={0.15} />
      <line x1="38" y1="67" x2="62" y2="67" stroke="#000" strokeWidth={0.7} opacity={0.15} />
      <line x1="38" y1="69" x2="62" y2="69" stroke="#000" strokeWidth={0.7} opacity={0.12} />
      <line x1="38" y1="71" x2="62" y2="71" stroke="#000" strokeWidth={0.7} opacity={0.1} />
      {/* Sweater body crease lines */}
      <line x1="42" y1="82" x2="40" y2="100" stroke={sweaterShadow} strokeWidth={1.5} opacity={0.2} />
      <line x1="58" y1="82" x2="60" y2="100" stroke={sweaterShadow} strokeWidth={1.5} opacity={0.2} />
    </g>
  );
}

function OffShoulder({ fill, shirtColor }: BodyPartProps) {
  const top = shirtColor || '#E85D9B';
  const topShadow = darken(top);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Slender neck */}
      <rect x="43" y="68" width="14" height="14" rx="3" fill={neckShade} stroke="#000" strokeWidth={S} />
      {/* Exposed shoulders — skin visible above neckline */}
      <path d="M0 100 L0 89 Q0 80 12 77 L43 73 L57 73 L88 77 Q100 80 100 89 L100 100Z"
        fill={neckShade} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Off-shoulder top — dropped neckline exposing collarbone area */}
      <path d="M0 100 L0 89 Q0 82 8 80 L28 78 Q36 82 50 82 Q64 82 72 78 L92 80 Q100 82 100 89 L100 100Z"
        fill={top} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Shoulder shading */}
      <path d="M0 89 Q0 82 8 80 L18 79 Q4 84 4 92 L4 100 L0 100Z" fill={topShadow} stroke="none" opacity={0.45} />
      <path d="M100 89 Q100 82 92 80 L82 79 Q96 84 96 92 L96 100 L100 100Z" fill={topShadow} stroke="none" opacity={0.45} />
      {/* Collarbone detail — visible above dropped neckline */}
      <path d="M30 77 Q43 73 50 74 Q57 73 70 77" fill="none" stroke="#000" strokeWidth={1} opacity={0.15} strokeLinecap="round" />
      {/* Draped neckline edge */}
      <path d="M28 78 Q36 82 50 82 Q64 82 72 78" fill="none" stroke={topShadow} strokeWidth={1.5} opacity={0.4} />
      {/* Fabric drape lines */}
      <line x1="44" y1="86" x2="42" y2="100" stroke={topShadow} strokeWidth={1.5} opacity={0.2} />
      <line x1="56" y1="86" x2="58" y2="100" stroke={topShadow} strokeWidth={1.5} opacity={0.2} />
    </g>
  );
}

function CropTop({ fill, shirtColor }: BodyPartProps) {
  const top = shirtColor || '#FF6B35';
  const topShadow = darken(top);
  const neckShade = darken(fill, 0.25);
  return (
    <g>
      {/* Slender neck */}
      <rect x="43" y="68" width="14" height="14" rx="3" fill={neckShade} stroke="#000" strokeWidth={S} />
      {/* Midriff — skin visible at bottom */}
      <path d="M0 100 L0 89 Q0 80 12 77 L43 73 L57 73 L88 77 Q100 80 100 89 L100 100Z"
        fill={neckShade} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Crop top — ends above waist, scoop neck */}
      <path d="M8 92 L8 83 Q8 78 16 76 L43 73 L57 73 L84 76 Q92 78 92 83 L92 92 Q80 94 50 94 Q20 94 8 92Z"
        fill={top} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Shoulder shading */}
      <path d="M8 83 Q8 78 16 76 L26 75 Q12 80 12 86 L12 92 L8 92Z" fill={topShadow} stroke="none" opacity={0.45} />
      <path d="M92 83 Q92 78 84 76 L74 75 Q88 80 88 86 L88 92 L92 92Z" fill={topShadow} stroke="none" opacity={0.45} />
      {/* Scoop neckline */}
      <path d="M43 73 Q50 80 57 73" fill={neckShade} stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      {/* Crop bottom edge detail */}
      <path d="M12 92 Q30 94 50 94 Q70 94 88 92" fill="none" stroke={topShadow} strokeWidth={1.2} opacity={0.35} />
      {/* Shirt crease */}
      <line x1="46" y1="82" x2="44" y2="92" stroke={topShadow} strokeWidth={1} opacity={0.2} />
      <line x1="54" y1="82" x2="56" y2="92" stroke={topShadow} strokeWidth={1} opacity={0.2} />
    </g>
  );
}

export const BODY_PARTS = {
  male: Male,
  female: Female,
  hoodie: Hoodie,
  suit: Suit,
  turtleneck: Turtleneck,
  offShoulder: OffShoulder,
  cropTop: CropTop,
} as const;

export type BodyPart = keyof typeof BODY_PARTS;
