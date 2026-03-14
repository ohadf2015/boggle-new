/**
 * Avatar Mouth Parts
 * 8 mouth styles, positioned at y≈58 within viewBox 0 0 100 100
 */

const S = 2.5;

function Smile() {
  return (
    <path d="M40 60 Q50 68 60 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
  );
}

function Grin() {
  return (
    <g>
      <path d="M37 58 Q50 70 63 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M37 58 Q50 62 63 58" fill="none" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Tongue() {
  return (
    <g>
      <path d="M38 58 Q50 68 62 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <ellipse cx="50" cy="66" rx="5" ry="4" fill="#FF6B6B" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Oh() {
  return (
    <ellipse cx="50" cy="62" rx="5" ry="7" fill="#fff" stroke="#000" strokeWidth={S} />
  );
}

function Smirk() {
  return (
    <path d="M42 60 Q52 66 58 58" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
  );
}

function Flat() {
  return (
    <line x1="40" y1="62" x2="60" y2="62" stroke="#000" strokeWidth={S} strokeLinecap="round" />
  );
}

function Teeth() {
  return (
    <g>
      <rect x="39" y="57" width="22" height="10" rx="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="45" y1="57" x2="45" y2="67" stroke="#000" strokeWidth={1} />
      <line x1="50" y1="57" x2="50" y2="67" stroke="#000" strokeWidth={1} />
      <line x1="55" y1="57" x2="55" y2="67" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Cat() {
  return (
    <g>
      {/* w-shaped cat mouth */}
      <path d="M38 60 L44 64 L50 58 L56 64 L62 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Vampire() {
  return (
    <g>
      <path d="M38 58 Q50 68 62 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Fangs */}
      <path d="M42 58 L42 65" stroke="#fff" strokeWidth={2} />
      <path d="M42 58 L40 66" fill="#fff" stroke="#000" strokeWidth={1} />
      <path d="M42 58 L44 66" fill="#fff" stroke="#000" strokeWidth={1} />
      <path d="M58 58 L56 66" fill="#fff" stroke="#000" strokeWidth={1} />
      <path d="M58 58 L60 66" fill="#fff" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Kiss() {
  return (
    <g>
      <ellipse cx="50" cy="62" rx="6" ry="4" fill="#FF1493" stroke="#000" strokeWidth={S} />
      <ellipse cx="48" cy="61" rx="2" ry="1.5" fill="#FF69B4" opacity="0.5" />
    </g>
  );
}

function Braces() {
  return (
    <g>
      <rect x="39" y="57" width="22" height="10" rx="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="45" y1="57" x2="45" y2="67" stroke="#000" strokeWidth={1} />
      <line x1="50" y1="57" x2="50" y2="67" stroke="#000" strokeWidth={1} />
      <line x1="55" y1="57" x2="55" y2="67" stroke="#000" strokeWidth={1} />
      {/* Braces wire */}
      <line x1="40" y1="62" x2="60" y2="62" stroke="#00BFFF" strokeWidth={1.5} />
      <circle cx="43" cy="62" r="1" fill="#00BFFF" />
      <circle cx="50" cy="62" r="1" fill="#00BFFF" />
      <circle cx="57" cy="62" r="1" fill="#00BFFF" />
    </g>
  );
}

function Drool() {
  return (
    <g>
      <path d="M40 60 Q50 68 60 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Drool drop */}
      <path d="M56 62 Q58 70 56 74 Q54 76 52 74 Q50 70 52 62" fill="#87CEEB" stroke="#000" strokeWidth={1} opacity="0.8" />
    </g>
  );
}

function GoldTooth() {
  return (
    <g>
      {/* Big grin showing teeth */}
      <rect x="39" y="57" width="22" height="10" rx="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="45" y1="57" x2="45" y2="67" stroke="#000" strokeWidth={1} />
      <line x1="50" y1="57" x2="50" y2="67" stroke="#000" strokeWidth={1} />
      <line x1="55" y1="57" x2="55" y2="67" stroke="#000" strokeWidth={1} />
      {/* Gold tooth — bling! */}
      <rect x="50" y="57" width="5" height="10" rx="1" fill="#FFD700" stroke="#000" strokeWidth={1} />
      <rect x="51" y="58" width="2" height="3" rx="0.5" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Mustache() {
  return (
    <g>
      {/* Subtle smile underneath */}
      <path d="M42 62 Q50 66 58 62" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      {/* Handlebar mustache */}
      <path d="M50 56 Q44 58 36 55 Q30 52 26 54" fill="#2C1B18" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M50 56 Q56 58 64 55 Q70 52 74 54" fill="#2C1B18" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Curl tips */}
      <circle cx="26" cy="53" r="2" fill="#2C1B18" stroke="#000" strokeWidth={1} />
      <circle cx="74" cy="53" r="2" fill="#2C1B18" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Whistle() {
  return (
    <g>
      {/* Puckered lips */}
      <ellipse cx="50" cy="60" rx="4" ry="3" fill="#FF6B6B" stroke="#000" strokeWidth={S} />
      {/* Musical notes floating out */}
      <text x="58" y="52" fontSize="8" fill="#000" opacity="0.6" fontFamily="serif">&#9835;</text>
      <text x="66" y="48" fontSize="6" fill="#000" opacity="0.4" fontFamily="serif">&#9834;</text>
    </g>
  );
}

function Zipper() {
  return (
    <g>
      {/* Zipped shut mouth */}
      <line x1="38" y1="62" x2="62" y2="62" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Zipper teeth */}
      <line x1="40" y1="60" x2="40" y2="64" stroke="#888" strokeWidth={1.5} />
      <line x1="44" y1="60" x2="44" y2="64" stroke="#888" strokeWidth={1.5} />
      <line x1="48" y1="60" x2="48" y2="64" stroke="#888" strokeWidth={1.5} />
      <line x1="52" y1="60" x2="52" y2="64" stroke="#888" strokeWidth={1.5} />
      <line x1="56" y1="60" x2="56" y2="64" stroke="#888" strokeWidth={1.5} />
      <line x1="60" y1="60" x2="60" y2="64" stroke="#888" strokeWidth={1.5} />
      {/* Zipper pull */}
      <rect x="36" y="60" width="4" height="4" rx="1" fill="#FFD700" stroke="#000" strokeWidth={1} />
    </g>
  );
}

function Blowfish() {
  return (
    <g>
      {/* Puffed-out cheeks */}
      <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FFB6C1" stroke="#000" strokeWidth={S} />
      {/* Tiny pursed lips in center */}
      <ellipse cx="50" cy="60" rx="3" ry="2" fill="#FF6B6B" stroke="#000" strokeWidth={1.5} />
      {/* Air puff lines */}
      <line x1="66" y1="58" x2="72" y2="56" stroke="#000" strokeWidth={1} opacity="0.3" />
      <line x1="66" y1="62" x2="74" y2="62" stroke="#000" strokeWidth={1} opacity="0.2" />
      <line x1="66" y1="66" x2="72" y2="68" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function Gap() {
  return (
    <g>
      {/* Big smile with gap tooth */}
      <path d="M37 58 Q50 70 63 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M37 58 Q50 62 63 58" fill="none" stroke="#000" strokeWidth={1} />
      {/* Gap — black rectangle in center */}
      <rect x="48" y="58" width="4" height="6" fill="#000" />
    </g>
  );
}

function Pipe() {
  return (
    <g>
      {/* Subtle closed-mouth smile */}
      <path d="M42 60 Q50 64 54 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Smoking pipe */}
      <path d="M54 60 L68 56 L70 48" fill="none" stroke="#8B4513" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* Pipe bowl */}
      <rect x="66" y="40" width="8" height="10" rx="2" fill="#8B4513" stroke="#000" strokeWidth={S} />
      {/* Smoke puffs */}
      <circle cx="70" cy="34" r="3" fill="#ddd" opacity="0.5" />
      <circle cx="74" cy="28" r="4" fill="#ddd" opacity="0.35" />
      <circle cx="72" cy="20" r="3" fill="#ddd" opacity="0.2" />
    </g>
  );
}

export const MOUTH_PARTS = {
  smile: Smile,
  grin: Grin,
  tongue: Tongue,
  oh: Oh,
  smirk: Smirk,
  flat: Flat,
  teeth: Teeth,
  cat: Cat,
  vampire: Vampire,
  kiss: Kiss,
  braces: Braces,
  drool: Drool,
  goldTooth: GoldTooth,
  mustache: Mustache,
  whistle: Whistle,
  zipper: Zipper,
  blowfish: Blowfish,
  gap: Gap,
  pipe: Pipe,
} as const;

export type MouthPart = keyof typeof MOUTH_PARTS;
