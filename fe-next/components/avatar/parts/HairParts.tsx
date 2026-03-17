/** Avatar Hair Parts — viewBox 0 0 100 100. Face: cx=50 cy=52 r=30. */

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
        d="M22 32 L28 6 L36 26 L42 3 L50 22 L55 0 L60 20 L66 8 L74 28 L78 32"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M22 32 Q50 18 78 32" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Curly({ fill }: HairPartProps) {
  return (
    <g>
      <circle cx="18" cy="28" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="37" cy="14" r="15" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="58" cy="12" r="15" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="78" cy="26" r="14" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="8" cy="44" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="92" cy="44" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="6" cy="62" r="9" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="62" r="9" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Buzz({ fill }: HairPartProps) {
  return (
    <path
      d="M22 34 Q22 12 50 10 Q78 12 78 34"
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
        d="M40 30 L40 2 Q50 -2 60 2 L60 30"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M22 32 Q22 26 40 30" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M78 32 Q78 26 60 30" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
    </g>
  );
}

function Topknot({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M26 32 Q26 18 50 16 Q74 18 74 32" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="6" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="15" rx="6" ry="2" fill="#000" opacity="0.3" />
    </g>
  );
}

function Ponytail({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 32 Q20 10 50 8 Q80 10 80 32" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M20 32 Q22 26 33 28" fill={fill} stroke="#000" strokeWidth={1.5} />

      <path
        d="M70 26 Q90 20 94 40 Q96 60 86 74 Q82 80 77 70 Q84 54 80 36"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="72" cy="26" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Combover({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M28 32 Q28 26 40 24 Q36 20 50 18 Q64 20 60 24 Q72 26 72 32" fill={fill} stroke="#000" strokeWidth={S} opacity="0.4" />
      <path d="M18 34 Q16 18 28 12 Q38 8 50 12 Q58 16 63 26 Q56 20 46 18 Q33 16 23 26 Q20 32 22 38" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 32 Q18 48 20 54" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M82 32 Q82 48 80 54" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Elvis({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 32 Q20 12 50 8 Q80 12 80 32" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M28 28 Q26 6 40 0 Q50 -2 54 6 Q56 12 50 20 Q44 26 38 28" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M34 12 Q40 4 46 8" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <rect x="18" y="32" width="5" height="20" rx="2" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="77" y="32" width="5" height="20" rx="2" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Ramen({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M18 24 Q18 34 50 36 Q82 34 82 24" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M18 24 Q50 16 82 24" fill="#fff" stroke="#000" strokeWidth={S} />

      <path d="M22 24 Q50 18 78 24 Q78 30 50 32 Q22 30 22 24Z" fill="#F5DEB3" stroke="none" />

      <path d="M28 26 Q33 22 38 26 Q43 30 48 26 Q53 22 58 26 Q63 30 68 26 Q73 22 78 26" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" />

      <ellipse cx="62" cy="24" rx="5" ry="4" fill="#fff" stroke="#000" strokeWidth={1} />
      <circle cx="62" cy="24" r="2" fill="#FFD700" />

      <line x1="40" y1="22" x2="34" y2="2" stroke="#8B6E4E" strokeWidth={2} strokeLinecap="round" />
      <line x1="44" y1="22" x2="42" y2="2" stroke="#8B6E4E" strokeWidth={2} strokeLinecap="round" />

      <path d="M33 18 Q31 12 34 8" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.4" />
      <path d="M53 16 Q51 10 54 6" fill="none" stroke="#ddd" strokeWidth={1.5} opacity="0.4" />
    </g>
  );
}

function Long({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M10 32 Q10 8 50 4 Q90 8 90 32 L92 68 Q90 84 82 90 Q78 94 75 84 L74 42 Q50 26 26 42 L25 84 Q22 94 18 90 Q10 84 8 68Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Bob({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M10 32 Q10 10 50 8 Q90 10 90 32 L90 58 Q88 66 80 62 L80 36 Q50 22 20 36 L20 62 Q12 66 10 58Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Afro({ fill }: HairPartProps) {
  return (
    <g>
      <ellipse cx="50" cy="28" rx="45" ry="34" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="32" cy="16" r="2.5" fill="#000" opacity="0.12" />
      <circle cx="54" cy="10" r="2.5" fill="#000" opacity="0.12" />
      <circle cx="72" cy="20" r="2.5" fill="#000" opacity="0.12" />
      <circle cx="20" cy="30" r="2.5" fill="#000" opacity="0.12" />
      <circle cx="80" cy="32" r="2.5" fill="#000" opacity="0.12" />
      <circle cx="42" cy="8" r="2" fill="#000" opacity="0.1" />
    </g>
  );
}

function Wavy({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M10 34 Q10 10 50 6 Q90 10 90 34 L92 52 Q90 62 82 56 Q78 50 80 62 Q78 74 70 68 L70 38 Q50 22 30 38 L30 68 Q22 74 20 62 Q22 50 18 56 Q10 62 8 52Z"
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
      <path d="M16 30 Q16 8 50 6 Q84 8 84 30" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="6" x2="50" y2="24" stroke="#000" strokeWidth={1} opacity="0.25" />
      <circle cx="6" cy="40" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="4" cy="56" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="6" cy="70" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="40" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="96" cy="56" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="94" cy="70" r="8" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="16" cy="30" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
      <circle cx="84" cy="30" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Sideshave({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M18 34 Q18 22 28 18" fill="none" stroke={fill} strokeWidth={1} opacity="0.35" />
      <circle cx="20" cy="28" r="1.5" fill={fill} opacity="0.35" />
      <circle cx="23" cy="24" r="1.5" fill={fill} opacity="0.35" />
      <circle cx="27" cy="21" r="1.5" fill={fill} opacity="0.35" />

      <path d="M32 16 Q60 4 92 26 L94 62 Q92 72 86 68 L86 36 Q66 12 36 20Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function Dreads({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M8 28 Q8 8 50 6 Q92 8 92 28" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="6" y="28" width="7" height="46" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="16" y="26" width="7" height="50" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="26" y="24" width="7" height="48" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="36" y="22" width="7" height="44" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="46" y="21" width="7" height="42" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="56" y="22" width="7" height="46" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="66" y="24" width="7" height="48" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="76" y="26" width="7" height="44" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="86" y="28" width="7" height="40" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Braids({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M8 30 Q8 6 50 4 Q92 6 92 30" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="4" x2="50" y2="24" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path
        d="M14 36 L10 48 L16 54 L10 62 L16 68 L10 78 L14 86"
        fill="none" stroke={fill} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M14 36 L10 48 L16 54 L10 62 L16 68 L10 78 L14 86"
        fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M86 36 L90 48 L84 54 L90 62 L84 68 L90 78 L86 86"
        fill="none" stroke={fill} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M86 36 L90 48 L84 54 L90 62 L84 68 L90 78 L86 86"
        fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="14" cy="88" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
      <circle cx="86" cy="88" r="4" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Bun({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M10 32 Q10 8 50 4 Q90 8 90 32 Q84 22 50 20 Q16 22 10 32Z" fill={fill} stroke="#000" strokeWidth={S} />

      <circle cx="50" cy="2" r="16" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M44 -2 Q50 4 56 -2 Q54 6 46 6 Q42 4 44 -2" fill="none" stroke="#000" strokeWidth={1.5} opacity="0.3" />

      <path d="M36 24 Q38 14 41 8" fill={fill} stroke="#000" strokeWidth={2} />
      <path d="M64 24 Q62 14 59 8" fill={fill} stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Bangs({ fill }: HairPartProps) {
  return (
    <g>
      <path
        d="M8 28 Q8 6 50 2 Q92 6 92 28 L92 60 Q90 68 82 64 L82 36 Q50 18 18 36 L18 64 Q10 68 8 60Z"
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
      <path d="M12 30 Q12 6 50 4 Q88 6 88 30" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="50" y1="4" x2="50" y2="22" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path
        d="M14 34 Q4 42 2 58 Q0 78 6 90 Q12 98 18 86 Q10 70 14 54 Q16 44 22 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      <path
        d="M86 34 Q96 42 98 58 Q100 78 94 90 Q88 98 82 86 Q90 70 86 54 Q84 44 78 38"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round"
      />
      <circle cx="16" cy="30" r="5" fill="#FF1493" stroke="#000" strokeWidth={2} />
      <circle cx="84" cy="30" r="5" fill="#FF1493" stroke="#000" strokeWidth={2} />
    </g>
  );
}

function Mullet({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M16 30 Q16 10 50 8 Q84 10 84 30" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M82 32 Q94 36 96 58 Q98 80 90 92 Q84 96 80 84 Q88 66 84 46" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 32 Q6 36 4 58 Q2 80 10 92 Q16 96 20 84 Q12 66 16 46" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function FlameHair({ fill }: HairPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="flameHairGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={fill} />
          <stop offset="40%" stopColor="#FF6D00" />
          <stop offset="70%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
      </defs>
      {/* Main flame mass */}
      <path d="M22 45 C20 30 25 18 35 10 C30 20 35 15 40 5 C38 18 45 12 50 2 C55 12 62 18 60 5 C65 15 70 20 65 10 C75 18 80 30 78 45"
        fill="url(#flameHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Inner flame detail */}
      <path d="M30 40 C32 30 38 22 42 15 C40 25 45 20 48 12" fill="none" stroke="#FFD600" strokeWidth={1} opacity="0.5" />
      <path d="M70 40 C68 30 62 22 58 15 C60 25 55 20 52 12" fill="none" stroke="#FFD600" strokeWidth={1} opacity="0.5" />
    </g>
  );
}

function GalaxyHair({ fill }: HairPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="galaxyHairGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A237E" />
          <stop offset="33%" stopColor="#4A148C" />
          <stop offset="66%" stopColor="#880E4F" />
          <stop offset="100%" stopColor={fill} />
        </linearGradient>
      </defs>
      {/* Flowing cosmic hair */}
      <path d="M22 40 C18 28 28 14 50 14 C72 14 82 28 78 40 L78 55 Q70 48 62 52 Q55 48 50 55 Q45 48 38 52 Q30 48 22 55Z"
        fill="url(#galaxyHairGrad)" stroke="#000" strokeWidth={S} />
      {/* Embedded stars */}
      <circle cx="32" cy="28" r="1.2" fill="#fff" opacity="0.8" />
      <circle cx="45" cy="20" r="0.8" fill="#fff" opacity="0.6" />
      <circle cx="58" cy="22" r="1" fill="#fff" opacity="0.7" />
      <circle cx="68" cy="30" r="1.2" fill="#fff" opacity="0.8" />
      <circle cx="38" cy="35" r="0.6" fill="#E040FB" opacity="0.5" />
      <circle cx="62" cy="34" r="0.6" fill="#00BCD4" opacity="0.5" />
    </g>
  );
}

function NeonHair({ fill }: HairPartProps) {
  return (
    <g>
      <defs>
        <linearGradient id="neonHairGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF00FF" />
          <stop offset="50%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor={fill} />
        </linearGradient>
      </defs>
      {/* Spiky neon hair */}
      <path d="M22 40 L28 10 L35 30 L42 5 L50 25 L58 5 L65 30 L72 10 L78 40"
        fill="url(#neonHairGrad)" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Glow lines */}
      <path d="M30 35 L33 18" stroke="#fff" strokeWidth={1} opacity="0.4" />
      <path d="M50 30 L50 15" stroke="#fff" strokeWidth={1} opacity="0.4" />
      <path d="M70 35 L67 18" stroke="#fff" strokeWidth={1} opacity="0.4" />
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
  flame: FlameHair,
  galaxy: GalaxyHair,
  neon: NeonHair,
} as const;

export type HairPart = keyof typeof HAIR_PARTS;

function BangsFront({ fill }: HairPartProps) {
  return (
    <g>

      <path
        d="M16 30 Q16 8 50 4 Q84 8 84 30 L78 38 L70 34 L62 40 L50 34 L38 40 L30 34 L22 38Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
    </g>
  );
}

function LongFront({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M12 28 Q10 24 12 36 L14 54 Q12 60 10 54 L8 36 Q8 24 12 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M88 28 Q90 24 88 36 L86 54 Q88 60 90 54 L92 36 Q92 24 88 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />

      <path d="M42 26 Q50 20 58 26" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
    </g>
  );
}

function BobFront({ fill }: HairPartProps) {
  return (<g>
    <path d="M10 28 L12 50 Q14 56 18 52 L16 34 Q14 26 10 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M90 28 L88 50 Q86 56 82 52 L84 34 Q86 26 90 28Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
  </g>);
}

function WavyFront({ fill }: HairPartProps) {
  return (<g>
    <path d="M10 30 Q8 38 10 48 Q12 54 14 48 Q12 40 12 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M90 30 Q92 38 90 48 Q88 54 86 48 Q88 40 88 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
  </g>);
}

function SideshaveFront({ fill }: HairPartProps) {
  return (<g>
    <path d="M88 26 Q90 32 90 44 Q88 50 86 44 L86 30Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
    <path d="M50 22 Q66 18 80 26" fill={fill} stroke="#000" strokeWidth={2} opacity="0.6" />
  </g>);
}

function AfroFront({ fill }: HairPartProps) {
  return (
    <g>

      <circle cx="30" cy="28" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="24" r="11" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="70" cy="28" r="10" fill={fill} stroke="#000" strokeWidth={S} />

      <circle cx="42" cy="22" r="1.5" fill="#000" opacity="0.1" />
      <circle cx="58" cy="20" r="1.5" fill="#000" opacity="0.1" />
    </g>
  );
}

function DreadsFront({ fill }: HairPartProps) {
  return (
    <g>

      <rect x="32" y="22" width="7" height="20" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="44" y="20" width="7" height="18" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
      <rect x="58" y="22" width="7" height="19" rx="3.5" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function PigtailsFront({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M22 30 Q28 22 40 24 Q50 18 60 24 Q72 22 78 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="18" x2="50" y2="28" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function BraidsFront({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M20 30 Q26 20 40 22 Q50 16 60 22 Q74 20 80 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="16" x2="50" y2="26" stroke="#000" strokeWidth={1} opacity="0.25" />
    </g>
  );
}

function BunFront({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M18 32 Q22 22 38 22 Q50 18 62 22 Q78 22 82 32" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function TwintailsFront({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M18 30 Q24 18 38 20 Q50 14 62 20 Q76 18 82 30 L76 36 L68 32 L60 38 L50 32 L40 38 L32 32 L24 36Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function MulletFront({ fill }: HairPartProps) {
  return (
    <g>

      <path d="M20 30 Q26 22 40 22 Q50 18 60 22 Q74 22 80 30 L74 34 L66 30 L58 34 L50 30 L42 34 L34 30 L26 34Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

/** Front-layer hair parts — rendered ON TOP of face */
export const HAIR_FRONT_PARTS: Partial<Record<keyof typeof HAIR_PARTS, React.FC<HairPartProps>>> = {
  bangs: BangsFront,
  long: LongFront,
  bob: BobFront,
  wavy: WavyFront,
  sideshave: SideshaveFront,
  afro: AfroFront,
  dreads: DreadsFront,
  pigtails: PigtailsFront,
  braids: BraidsFront,
  bun: BunFront,
  twintails: TwintailsFront,
  mullet: MulletFront,
};
