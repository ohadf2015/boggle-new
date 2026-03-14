/**
 * Avatar Accessory Parts
 * 10 accessories, positioned within viewBox 0 0 100 100
 */

const S = 2.5;

interface AccessoryPartProps {
  fill: string;
}

function None() {
  return null;
}

function Glasses({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="38" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <path d="M47 42 L53 42" stroke={fill} strokeWidth={S} />
      <path d="M29 42 L22 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M71 42 L78 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Sunglasses({ fill }: AccessoryPartProps) {
  return (
    <g>
      <rect x="27" y="36" width="18" height="12" rx="3" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="55" y="36" width="18" height="12" rx="3" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M45 42 L55 42" stroke="#000" strokeWidth={S} />
      <path d="M27 40 L20 37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M73 40 L80 37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Reflection */}
      <line x1="31" y1="39" x2="36" y2="39" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
      <line x1="59" y1="39" x2="64" y2="39" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.4" />
    </g>
  );
}

function Hat({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Hat brim */}
      <ellipse cx="50" cy="24" rx="38" ry="5" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Hat dome */}
      <path d="M28 24 Q28 6 50 4 Q72 6 72 24" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Hat band */}
      <rect x="28" y="20" width="44" height="4" fill="#000" opacity="0.3" />
    </g>
  );
}

function Cap({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Cap dome */}
      <path d="M25 28 Q25 10 50 8 Q75 10 75 28" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Visor */}
      <path d="M25 28 L15 32 Q14 34 18 34 L25 30" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Button on top */}
      <circle cx="50" cy="8" r="2.5" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Headband({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 32 Q50 26 78 32" fill="none" stroke={fill} strokeWidth={5} strokeLinecap="round" />
      <path d="M22 32 Q50 26 78 32" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function Crown({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path
        d="M26 28 L30 10 L38 22 L50 4 L62 22 L70 10 L74 28Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Gems */}
      <circle cx="38" cy="22" r="2" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="14" r="2.5" fill="#00FFFF" stroke="#000" strokeWidth={1} />
      <circle cx="62" cy="22" r="2" fill="#BFFF00" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Earring({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left earring */}
      <circle cx="18" cy="52" r="4" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="18" cy="52" r="1.5" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Bandana({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Wrap around forehead */}
      <path d="M20 30 Q50 22 80 30" fill="none" stroke={fill} strokeWidth={7} strokeLinecap="round" />
      <path d="M20 30 Q50 22 80 30" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Tie knot on side */}
      <path d="M78 30 L88 38 M78 30 L86 44" stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <path d="M78 30 L88 38 M78 30 L86 44" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

function Horns({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Left horn */}
      <path
        d="M30 30 Q22 15 28 5 Q32 10 35 25"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Right horn */}
      <path
        d="M70 30 Q78 15 72 5 Q68 10 65 25"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      {/* Horn ridges */}
      <path d="M29 22 L33 20" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M28 16 L32 15" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M71 22 L67 20" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M72 16 L68 15" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function Monocle({ fill }: AccessoryPartProps) {
  return (
    <g>
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <line x1="71" y1="42" x2="78" y2="60" stroke={fill} strokeWidth={1.5} />
    </g>
  );
}

function Eyepatch({ fill }: AccessoryPartProps) {
  return (
    <g>
      <ellipse cx="38" cy="42" rx="9" ry="7" fill={fill} stroke="#000" strokeWidth={S} />
      <line x1="29" y1="38" x2="20" y2="30" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="47" y1="38" x2="80" y2="30" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Tiara({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M30 26 L35 16 L40 22 L45 12 L50 20 L55 12 L60 22 L65 16 L70 26" fill="none" stroke={fill} strokeWidth={S} strokeLinejoin="round" />
      <circle cx="45" cy="14" r="2" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="55" cy="14" r="2" fill="#00FFFF" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Antenna({ fill }: AccessoryPartProps) {
  return (
    <g>
      <line x1="50" y1="20" x2="50" y2="2" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <circle cx="50" cy="0" r="4" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Halo({ fill }: AccessoryPartProps) {
  return (
    <ellipse cx="50" cy="12" rx="22" ry="6" fill="none" stroke={fill} strokeWidth={S} opacity="0.9" />
  );
}

function Mask({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M26 36 Q50 30 74 36 L74 48 Q50 54 26 48Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <ellipse cx="38" cy="42" rx="7" ry="5" fill="#000" />
      <ellipse cx="62" cy="42" rx="7" ry="5" fill="#000" />
    </g>
  );
}

function Scarf({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M22 72 Q50 65 78 72 Q80 78 78 82 Q50 75 22 82 Q20 78 22 72Z" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M40 80 L36 95 Q38 97 42 95 L44 82" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
    </g>
  );
}

function Bowtie({ fill }: AccessoryPartProps) {
  return (
    <g>
      <path d="M38 78 L50 72 L62 78 L50 84Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <circle cx="50" cy="78" r="3" fill="#000" opacity="0.3" />
    </g>
  );
}

function Keffiyeh({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Headwrap */}
      <path d="M18 28 Q18 10 50 6 Q82 10 82 28 L84 40 Q82 45 78 42 L78 30 Q50 18 22 30 L22 42 Q18 45 16 40Z" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Agal (black rope ring) */}
      <ellipse cx="50" cy="22" rx="30" ry="4" fill="none" stroke="#000" strokeWidth={3} />
      {/* Draping sides */}
      <path d="M22 36 L18 70 Q20 75 24 72 L26 42" fill={fill} stroke="#000" strokeWidth={S} />
      <path d="M78 36 L82 70 Q80 75 76 72 L74 42" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function Fez({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Fez body — flat top cylinder */}
      <path d="M35 26 L35 10 Q50 6 65 10 L65 26" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="26" rx="15" ry="4" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Tassel */}
      <line x1="50" y1="8" x2="50" y2="4" stroke="#000" strokeWidth={1.5} />
      <circle cx="50" cy="4" r="2" fill="#000" />
      <path d="M50 4 Q55 8 58 18" stroke="#000" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <path d="M58 18 Q60 22 62 20" stroke="#000" strokeWidth={1} fill="none" />
    </g>
  );
}

function MustacheGlasses({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Groucho glasses + nose + mustache combo */}
      <circle cx="38" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <circle cx="62" cy="42" r="9" fill="none" stroke={fill} strokeWidth={S} />
      <path d="M47 42 L53 42" stroke={fill} strokeWidth={S} />
      <path d="M29 42 L22 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M71 42 L78 38" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      {/* Big fake nose */}
      <ellipse cx="50" cy="52" rx="5" ry="6" fill="#F8D5C2" stroke="#000" strokeWidth={S} />
      {/* Bushy mustache */}
      <path d="M36 58 Q43 62 50 56 Q57 62 64 58" fill="#2C1B18" stroke="#000" strokeWidth={1.5} />
      <path d="M38 58 Q43 65 50 58 Q57 65 62 58" fill="#2C1B18" stroke="#000" strokeWidth={1} />
      {/* Bushy eyebrows */}
      <path d="M30 35 Q38 30 46 35" fill="#2C1B18" stroke="#000" strokeWidth={1.5} />
      <path d="M54 35 Q62 30 70 35" fill="#2C1B18" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Sombrero({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Huge brim */}
      <ellipse cx="50" cy="26" rx="46" ry="8" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Dome */}
      <path d="M32 26 Q32 6 50 2 Q68 6 68 26" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Decorative bands */}
      <path d="M34 20 Q50 16 66 20" fill="none" stroke="#FF6B35" strokeWidth={2} />
      <path d="M36 14 Q50 10 64 14" fill="none" stroke="#BFFF00" strokeWidth={2} />
      {/* Pompoms on brim edge */}
      <circle cx="12" cy="30" r="3" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <circle cx="88" cy="30" r="3" fill="#BFFF00" stroke="#000" strokeWidth={1} />
      <circle cx="30" cy="33" r="3" fill="#00FFFF" stroke="#000" strokeWidth={1} />
      <circle cx="70" cy="33" r="3" fill="#FF6B35" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Turban({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Turban wrap layers */}
      <path d="M22 32 Q22 8 50 4 Q78 8 78 32" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Wrap folds */}
      <path d="M28 28 Q40 12 50 20 Q60 12 72 28" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M32 24 Q50 10 68 24" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M26 30 Q50 18 74 30" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Jewel centerpiece */}
      <circle cx="50" cy="18" r="4" fill="#FF1493" stroke="#FFD700" strokeWidth={2} />
      <circle cx="50" cy="18" r="1.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function NoseRing({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Septum ring */}
      <path d="M46 56 Q50 62 54 56" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      {/* Small gem dangling */}
      <circle cx="50" cy="62" r="2" fill={fill} stroke="#000" strokeWidth={1} />
    </g>
  );
}

function ClownNose() {
  return (
    <g>
      {/* Big red clown nose */}
      <circle cx="50" cy="52" r="7" fill="#FF0000" stroke="#000" strokeWidth={S} />
      {/* Shine */}
      <circle cx="47" cy="49" r="2.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function PartyHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Cone */}
      <path d="M30 28 L50 -2 L70 28Z" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Stripes */}
      <path d="M36 20 L50 2 L64 20" fill="none" stroke="#FF1493" strokeWidth={2} opacity="0.5" />
      <path d="M40 14 L50 2 L60 14" fill="none" stroke="#00FFFF" strokeWidth={2} opacity="0.5" />
      {/* Pompom on top */}
      <circle cx="50" cy="-2" r="5" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      {/* Elastic string */}
      <path d="M30 28 Q25 50 22 58" stroke="#000" strokeWidth={1} fill="none" opacity="0.4" />
      <path d="M70 28 Q75 50 78 58" stroke="#000" strokeWidth={1} fill="none" opacity="0.4" />
    </g>
  );
}

function PropellerHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Beanie dome */}
      <path d="M28 28 Q28 10 50 6 Q72 10 72 28" fill={fill} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="28" rx="22" ry="3" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Propeller stick */}
      <line x1="50" y1="6" x2="50" y2="0" stroke="#000" strokeWidth={2} />
      {/* Propeller blades */}
      <ellipse cx="40" cy="-2" rx="12" ry="3" fill="#FF1493" stroke="#000" strokeWidth={1.5} transform="rotate(-20 50 0)" />
      <ellipse cx="60" cy="-2" rx="12" ry="3" fill="#00FFFF" stroke="#000" strokeWidth={1.5} transform="rotate(20 50 0)" />
      {/* Center cap */}
      <circle cx="50" cy="0" r="3" fill="#FFD700" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Viking({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Helmet dome */}
      <path d="M24 32 Q24 10 50 6 Q76 10 76 32" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Nose guard */}
      <path d="M48 32 L50 52 L52 32" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Horns — big curved */}
      <path d="M24 26 Q14 18 8 4 Q12 8 18 10 Q20 16 24 22" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M76 26 Q86 18 92 4 Q88 8 82 10 Q80 16 76 22" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Rivets */}
      <circle cx="34" cy="28" r="2" fill="#888" stroke="#000" strokeWidth={1} />
      <circle cx="50" cy="26" r="2" fill="#888" stroke="#000" strokeWidth={1} />
      <circle cx="66" cy="28" r="2" fill="#888" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function DevilHorns() {
  return (
    <g>
      {/* Red devil horns — curvy */}
      <path d="M28 28 Q20 12 24 0 Q30 8 34 22" fill="#CC0000" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M72 28 Q80 12 76 0 Q70 8 66 22" fill="#CC0000" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Devil tail behind (peeking from back) */}
      <path d="M50 98 Q55 90 60 92 Q65 88 62 82" stroke="#CC0000" strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* Arrow tip */}
      <path d="M60 80 L62 82 L64 78" fill="#CC0000" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Headphones({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Headband arc */}
      <path d="M18 42 Q18 10 50 4 Q82 10 82 42" fill="none" stroke={fill} strokeWidth={4} />
      <path d="M18 42 Q18 10 50 4 Q82 10 82 42" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Left ear cup */}
      <rect x="12" y="38" width="12" height="16" rx="4" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="14" y="42" width="4" height="8" rx="2" fill="#000" opacity="0.3" />
      {/* Right ear cup */}
      <rect x="76" y="38" width="12" height="16" rx="4" fill={fill} stroke="#000" strokeWidth={S} />
      <rect x="82" y="42" width="4" height="8" rx="2" fill="#000" opacity="0.3" />
    </g>
  );
}

function ChefHat({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Puffy top — cloud of dough */}
      <circle cx="38" cy="8" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="8" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="4" r="13" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="44" cy="14" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="56" cy="14" r="10" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Hat band/base */}
      <rect x="30" y="20" width="40" height="8" rx="2" fill={fill} stroke="#000" strokeWidth={S} />
    </g>
  );
}

function CucumberFace() {
  return (
    <g>
      {/* Spa cucumber slices on eyes */}
      <ellipse cx="38" cy="42" rx="8" ry="6" fill="#7CCD7C" stroke="#228B22" strokeWidth={S} transform="rotate(-10 38 42)" />
      <ellipse cx="62" cy="42" rx="8" ry="6" fill="#7CCD7C" stroke="#228B22" strokeWidth={S} transform="rotate(10 62 42)" />
      {/* Seed details */}
      <ellipse cx="36" cy="41" rx="2" ry="1" fill="#228B22" opacity="0.4" />
      <ellipse cx="40" cy="43" rx="2" ry="1" fill="#228B22" opacity="0.4" />
      <ellipse cx="60" cy="41" rx="2" ry="1" fill="#228B22" opacity="0.4" />
      <ellipse cx="64" cy="43" rx="2" ry="1" fill="#228B22" opacity="0.4" />
    </g>
  );
}

function MonkeyEars({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Big round monkey ears */}
      <circle cx="10" cy="42" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="10" cy="42" r="7" fill="#F8D5C2" stroke="#000" strokeWidth={1.5} />
      <circle cx="90" cy="42" r="12" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="90" cy="42" r="7" fill="#F8D5C2" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Plunger({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Plunger stuck on head */}
      <line x1="50" y1="18" x2="50" y2="-4" stroke="#8B6E4E" strokeWidth={3} strokeLinecap="round" />
      {/* Rubber cup */}
      <path d="M38 18 Q38 10 50 8 Q62 10 62 18 Q62 24 50 26 Q38 24 38 18Z" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Suction marks */}
      <circle cx="50" cy="22" r="3" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
    </g>
  );
}

export const ACCESSORY_PARTS = {
  none: None,
  glasses: Glasses,
  sunglasses: Sunglasses,
  hat: Hat,
  cap: Cap,
  headband: Headband,
  crown: Crown,
  earring: Earring,
  bandana: Bandana,
  horns: Horns,
  monocle: Monocle,
  eyepatch: Eyepatch,
  tiara: Tiara,
  antenna: Antenna,
  halo: Halo,
  mask: Mask,
  scarf: Scarf,
  bowtie: Bowtie,
  keffiyeh: Keffiyeh,
  fez: Fez,
  mustacheGlasses: MustacheGlasses,
  sombrero: Sombrero,
  turban: Turban,
  noseRing: NoseRing,
  clownNose: ClownNose,
  partyHat: PartyHat,
  propellerHat: PropellerHat,
  viking: Viking,
  devilHorns: DevilHorns,
  headphones: Headphones,
  chefHat: ChefHat,
  cucumberFace: CucumberFace,
  monkeyEars: MonkeyEars,
  plunger: Plunger,
} as const;

export type AccessoryPart = keyof typeof ACCESSORY_PARTS;
