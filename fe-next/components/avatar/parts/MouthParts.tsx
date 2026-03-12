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
} as const;

export type MouthPart = keyof typeof MOUTH_PARTS;
