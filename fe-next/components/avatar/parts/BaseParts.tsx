/**
 * Avatar Base (Face Shape) Parts
 * 12 face shapes, all centered on viewBox 0 0 100 100
 */

import { STROKE_OUTER } from './avatarDesignConstants';

const S = STROKE_OUTER;

interface BasePartProps {
  fill: string;
}

const Nose = () => (
  <g>
    {/* Kawaii button nose — soft rounded shape with highlight */}
    <ellipse cx="50" cy="55" rx="3.5" ry="2.8" fill="#000" opacity="0.1" />
    <path d="M47.5 53 C48 56.5 50 58 50 58 C50 58 52 56.5 52.5 53" fill="none" stroke="#000" strokeWidth={1.8} opacity="0.45" strokeLinecap="round" />
    {/* Nose highlight for 3D feel */}
    <ellipse cx="49" cy="54" rx="1.5" ry="1" fill="#fff" opacity="0.15" />
    {/* Soft nostril hints */}
    <ellipse cx="48" cy="56" rx="1" ry="0.6" fill="#000" opacity="0.15" />
    <ellipse cx="52" cy="56" rx="1" ry="0.6" fill="#000" opacity="0.15" />
  </g>
);

function Round({ fill }: BasePartProps) {
  return (
    <g>
      <circle cx="50" cy="52" r="30" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Ear bumps peeking out */}
      <ellipse cx="19" cy="52" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="52" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      {/* Inner ear shadow */}
      <ellipse cx="19.5" cy="53" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="53" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      {/* Forehead shine arc */}
      <path d="M36 34 Q50 28 64 34" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.18" strokeLinecap="round" />
      {/* Chin softness */}
      <path d="M40 72 Q50 78 60 72" fill="#fff" opacity="0.08" />
      <Nose />
    </g>
  );
}

function Square({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="19" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="19.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      {/* Softer rounded square — more rx for kawaii feel */}
      <rect x="20" y="22" width="60" height="60" rx="12" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine */}
      <path d="M32 30 Q50 24 68 30" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Jaw shadow */}
      <path d="M28 72 Q50 78 72 72" fill="#000" opacity="0.05" />
      <Nose />
    </g>
  );
}

function Oval({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="21" cy="50" rx="4" ry="6.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="79" cy="50" rx="4" ry="6.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="21.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="78.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="50" cy="52" rx="28" ry="33" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine */}
      <path d="M38 30 Q50 24 62 30" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.16" strokeLinecap="round" />
      {/* Soft cheek contours */}
      <ellipse cx="32" cy="50" rx="4" ry="6" fill="#000" opacity="0.03" />
      <ellipse cx="68" cy="50" rx="4" ry="6" fill="#000" opacity="0.03" />
      {/* Chin */}
      <path d="M44 78 Q50 84 56 78" fill="#fff" opacity="0.06" />
      <Nose />
    </g>
  );
}

function Heart({ fill }: BasePartProps) {
  return (
    <g>
      <defs>
        <radialGradient id="heartGlow" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.03" />
        </radialGradient>
      </defs>
      {/* Plumper heart shape — wider lobes, softer chin */}
      <path d="M50 80 C28 66 14 50 22 36 C28 26 40 26 50 36 C60 26 72 26 78 36 C86 50 72 66 50 80Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M50 80 C28 66 14 50 22 36 C28 26 40 26 50 36 C60 26 72 26 78 36 C86 50 72 66 50 80Z"
        fill="url(#heartGlow)" />
      {/* Lobe highlights — makes them look round and plump */}
      <ellipse cx="34" cy="36" rx="6" ry="5" fill="#fff" opacity="0.12" />
      <ellipse cx="66" cy="36" rx="6" ry="5" fill="#fff" opacity="0.12" />
      {/* Cleft hint at top */}
      <path d="M47 36 Q50 32 53 36" fill="none" stroke="#000" strokeWidth={1} opacity="0.12" />
      <Nose />
    </g>
  );
}

function Diamond({ fill }: BasePartProps) {
  return (
    <g>
      {/* Wider diamond to contain eyes at x=38/62 */}
      <path d="M50 14 L82 50 L50 86 L18 50Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Facet lines */}
      <path d="M50 14 L34 50 M50 14 L66 50" stroke="#fff" strokeWidth={0.7} opacity="0.2" />
      <path d="M18 50 L34 50 L50 86 M82 50 L66 50 L50 86" stroke="#fff" strokeWidth={0.7} opacity="0.15" />
      <path d="M34 50 L66 50" stroke="#fff" strokeWidth={0.5} opacity="0.12" />
      {/* Top facet highlight */}
      <ellipse cx="42" cy="40" rx="5" ry="7" fill="#fff" opacity="0.08" />
      <Nose />
    </g>
  );
}

function Hexagon({ fill }: BasePartProps) {
  return (
    <g>
      {/* Wider hexagon to fully contain eyes (x=30-70) and mouth (y=58) */}
      <polygon points="50,14 82,30 82,72 50,88 18,72 18,30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <polygon points="50,19 77,33 77,69 50,83 23,69 23,33" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" />
      <polygon points="50,24 72,36 72,66 50,78 28,66 28,36" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.06" />
      <Nose />
    </g>
  );
}

function Blob({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="17" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="83" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M50 20 C70 18 84 30 82 50 C84 70 72 84 52 82 C32 86 16 72 18 52 C14 32 30 18 50 20Z"
        fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine — follows blob asymmetry */}
      <path d="M38 30 Q52 24 66 32" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.16" strokeLinecap="round" />
      {/* Chin */}
      <path d="M42 74 Q52 80 60 74" fill="#fff" opacity="0.06" />
      <Nose />
    </g>
  );
}

function Skull({ fill }: BasePartProps) {
  return (
    <g>
      {/* Cranium — tall dome, wider jaw for teeth */}
      <path d="M20 56 C20 26 30 14 50 14 C70 14 80 26 80 56 C80 64 76 72 68 74 L64 82 L58 74 L42 74 L36 82 L32 74 C24 72 20 64 20 56Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Cranium top highlight */}
      <path d="M30 20 Q50 12 70 20" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.2" />
      {/* Deep eye sockets — sized to frame composable eyes at cx=38/62 y=42 */}
      <ellipse cx="38" cy="42" rx="10" ry="10" fill="#000" opacity="0.3" />
      <ellipse cx="62" cy="42" rx="10" ry="10" fill="#000" opacity="0.3" />
      {/* Cheekbone ridges */}
      <path d="M24 50 Q30 46 36 50" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      <path d="M64 50 Q70 46 76 50" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.35" />
      {/* Nasal cavity (replaces standard nose) */}
      <path d="M45 53 L50 59 L55 53Z" fill="#000" opacity="0.45" stroke="#000" strokeWidth={1} />
      {/* Jaw teeth — prominent zigzag */}
      <path d="M33 72 L35 78 L37 72 L39 78 L41 72 L43 78 L45 72 L47 78 L49 72 L51 78 L53 72 L55 78 L57 72 L59 78 L61 72 L63 78 L65 72 L67 78"
        fill="#fff" stroke="#000" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M32 72 L68 72" stroke="#000" strokeWidth={1.5} />
      {/* Temple cracks */}
      <path d="M26 32 L22 26 M24 34 L19 30" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <path d="M74 32 L78 26 M76 34 L81 30" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      {/* Forehead suture lines */}
      <path d="M50 14 L50 28" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <path d="M36 18 Q50 22 64 18" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function Shield({ fill }: BasePartProps) {
  return (
    <g>
      {/* Shield wider at top to contain eyes at x=38/62 */}
      <path d="M16 20 L50 14 L84 20 L84 56 Q84 80 50 90 Q16 80 16 56Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Gold border */}
      <path d="M21 24 L50 19 L79 24 L79 54 Q79 76 50 85 Q21 76 21 54Z"
        fill="none" stroke="#FFD700" strokeWidth={1.5} />
      {/* Cross lines */}
      <path d="M50 26 L50 80" stroke="#FFD700" strokeWidth={0.7} />
      <path d="M26 42 L74 42" stroke="#FFD700" strokeWidth={0.7} />
      {/* Corner rivets */}
      <circle cx="26" cy="28" r="2.5" fill="#FFD700" />
      <circle cx="74" cy="28" r="2.5" fill="#FFD700" />
      <circle cx="50" cy="80" r="2.5" fill="#FFD700" />
      <Nose />
    </g>
  );
}


function DragonHead({ fill }: BasePartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="dragonScaleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="60%" stopColor={fill} />
          <stop offset="100%" stopColor="#1A1A2E" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="dragonHornGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#5D4037" />
          <stop offset="50%" stopColor="#8D6E63" />
          <stop offset="100%" stopColor="#D7CCC8" />
        </linearGradient>
      </defs>

      {/* Main head shape */}
      <path d="M20 58 C16 46 18 32 26 24 C32 18 40 14 50 14 C60 14 68 18 74 24 C82 32 84 46 80 58 L76 66 Q68 74 50 74 Q32 74 24 66Z"
        fill="url(#dragonScaleGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />

      {/* Big curved horns */}
      <path d="M28 26 C24 18 18 8 12 -2 C16 2 20 4 22 0 C20 10 24 18 30 22"
        fill="url(#dragonHornGrad)" stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M72 26 C76 18 82 8 88 -2 C84 2 80 4 78 0 C80 10 76 18 70 22"
        fill="url(#dragonHornGrad)" stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      {/* Horn ridges */}
      <path d="M24 20 L20 12 M22 16 L16 6" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <path d="M76 20 L80 12 M78 16 L84 6" stroke="#000" strokeWidth={0.8} opacity="0.2" />

      {/* Brow ridges above eye zone */}
      <path d="M26 34 Q36 28 44 34" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M56 34 Q64 28 74 34" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />

      {/* Scale pattern on forehead */}
      <path d="M38 22 L42 18 L46 22 L50 18 L54 22 L58 18 L62 22" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <path d="M42 26 L46 22 L50 26 L54 22 L58 26" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />

      {/* Scale texture on cheeks */}
      <path d="M24 42 L28 44 L24 46 M26 46 L30 48 L26 50" stroke="#000" strokeWidth={0.7} opacity="0.18" />
      <path d="M76 42 L72 44 L76 46 M74 46 L70 48 L74 50" stroke="#000" strokeWidth={0.7} opacity="0.18" />

      {/* Nostrils (below nose zone, above mouth zone) */}
      <ellipse cx="44" cy="54" rx="2.5" ry="2" fill="#000" opacity="0.4" />
      <ellipse cx="56" cy="54" rx="2.5" ry="2" fill="#000" opacity="0.4" />
      {/* Nostril glow */}
      <ellipse cx="44" cy="54" rx="1.5" ry="1" fill="#FF4500">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="56" cy="54" rx="1.5" ry="1" fill="#FF4500">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" begin="0.5s" repeatCount="indefinite" />
      </ellipse>

      {/* Smoke wisps */}
      <circle cx="43" cy="52" r="1" fill="#888">
        <animate attributeName="cy" values="52;44;36" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.1;0" dur="3s" repeatCount="indefinite" />
        <animate attributeName="r" values="1;2;3" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Jaw spikes */}
      <polygon points="22,60 16,66 24,64" fill={fill} stroke="#000" strokeWidth={1.2} />
      <polygon points="78,60 84,66 76,64" fill={fill} stroke="#000" strokeWidth={1.2} />
      <polygon points="26,64 20,72 28,68" fill={fill} stroke="#000" strokeWidth={1} />
      <polygon points="74,64 80,72 72,68" fill={fill} stroke="#000" strokeWidth={1} />

      {/* No standard nose — dragon has its own nostrils above */}
    </g>
  );
}

function Triangle({ fill }: BasePartProps) {
  return (
    <g>
      {/* Inverted triangle — wide forehead, pointed chin */}
      <path
        d="M14 24 L86 24 L50 86Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Inner highlight contour */}
      <path d="M20 28 L80 28 L50 80Z" fill="none" stroke="#fff" strokeWidth={1} opacity="0.1" />
      {/* Forehead shine */}
      <ellipse cx="50" cy="32" rx="16" ry="4" fill="#fff" opacity="0.08" />
      {/* Cheekbone lines */}
      <path d="M24 30 Q32 38 36 48" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      <path d="M76 30 Q68 38 64 48" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.1" />
      {/* Chin shadow */}
      <path d="M40 70 L50 82 L60 70" fill="#000" opacity="0.06" />
      <Nose />
    </g>
  );
}

function CatFace({ fill }: BasePartProps) {
  return (
    <g>
      {/* Cat face — rounded top with ear bumps, wide cheeks, pointed chin */}
      <path
        d={[
          'M50 84',          // chin point
          'C36 80 22 68 20 52', // left jaw to cheek
          'C18 40 20 30 26 22', // left cheek up to ear base
          'L22 12',            // left ear tip
          'C26 18 30 20 34 22', // left ear inner curve
          'C38 16 44 14 50 14', // forehead left to center
          'C56 14 62 16 66 22', // forehead center to right
          'C70 20 74 18 78 12', // right ear inner curve
          'L74 22',            // right ear tip
          'C80 30 82 40 80 52', // right ear base to cheek
          'C78 68 64 80 50 84', // right jaw to chin
          'Z',
        ].join(' ')}
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Inner ear triangles */}
      <path d="M24 16 C27 20 30 22 33 23 L27 24 C23 22 22 18 24 16Z" fill="#000" opacity="0.12" />
      <path d="M76 16 C73 20 70 22 67 23 L73 24 C77 22 78 18 76 16Z" fill="#000" opacity="0.12" />
      {/* Cheek fluff */}
      <ellipse cx="28" cy="52" rx="5" ry="6" fill="#fff" opacity="0.06" />
      <ellipse cx="72" cy="52" rx="5" ry="6" fill="#fff" opacity="0.06" />
      {/* Whiskers — thin lines radiating from cheeks */}
      <line x1="30" y1="54" x2="14" y2="50" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="30" y1="57" x2="12" y2="58" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="30" y1="60" x2="14" y2="64" stroke="#000" strokeWidth={1} opacity="0.15" strokeLinecap="round" />
      <line x1="70" y1="54" x2="86" y2="50" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="70" y1="57" x2="88" y2="58" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <line x1="70" y1="60" x2="86" y2="64" stroke="#000" strokeWidth={1} opacity="0.15" strokeLinecap="round" />
      {/* Whisker dots at base */}
      <circle cx="34" cy="56" r="1.2" fill="#000" opacity="0.18" />
      <circle cx="66" cy="56" r="1.2" fill="#000" opacity="0.18" />
      {/* Chin shadow */}
      <path d="M44 76 Q50 82 56 76" fill="#000" opacity="0.06" />
      <Nose />
    </g>
  );
}

/** Oblong — tall narrow face, high forehead, narrow chin */
function Oblong({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="25" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="75" cy="50" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="25.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="74.5" cy="51" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="50" cy="50" rx="24" ry="36" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Forehead shine */}
      <path d="M40 26 Q50 20 60 26" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Chin */}
      <path d="M44 78 Q50 84 56 78" fill="#fff" opacity="0.06" />
      <Nose />
    </g>
  );
}

/** Rectangular — strong jawline, wide forehead, angular */
function Rectangular({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps */}
      <ellipse cx="19" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="48" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="19.5" cy="49" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="49" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <path d="M22 22 Q22 18 28 18 L72 18 Q78 18 78 22 L80 68 Q80 82 66 84 L50 86 L34 84 Q20 82 20 68Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Forehead shine */}
      <path d="M34 26 Q50 20 66 26" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Jaw shadow */}
      <path d="M24 68 Q30 74 50 78 Q70 74 76 68" fill="#000" opacity="0.05" />
      <Nose />
    </g>
  );
}

/** Pear — narrow forehead, wide cheeks/jaw */
function Pear({ fill }: BasePartProps) {
  return (
    <g>
      {/* Ear bumps — placed wider to match pear's wide cheeks */}
      <ellipse cx="19" cy="54" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="81" cy="54" rx="4" ry="6" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="19.5" cy="55" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <ellipse cx="80.5" cy="55" rx="2" ry="3.5" fill="#000" opacity="0.08" />
      <path d="M34 20 Q42 14 50 14 Q58 14 66 20 Q78 30 80 48 Q82 64 74 74 Q66 82 50 84 Q34 82 26 74 Q18 64 20 48 Q22 30 34 20Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Forehead shine */}
      <path d="M38 22 Q50 16 62 22" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.14" strokeLinecap="round" />
      {/* Soft cheek contours */}
      <ellipse cx="28" cy="58" rx="4" ry="6" fill="#000" opacity="0.03" />
      <ellipse cx="72" cy="58" rx="4" ry="6" fill="#000" opacity="0.03" />
      {/* Jaw */}
      <path d="M30 72 Q40 80 50 82 Q60 80 70 72" fill="#000" opacity="0.04" />
      <Nose />
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
  dragonHead: DragonHead,
  triangle: Triangle,
  catFace: CatFace,
  oblong: Oblong,
  rectangular: Rectangular,
  pear: Pear,
} as const;

export type BasePart = keyof typeof BASE_PARTS;
