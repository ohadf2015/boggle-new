/**
 * Avatar Eye Parts
 * 8 eye styles, positioned at y≈38 within viewBox 0 0 100 100
 */

const S = 2.5;

function Round() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      <circle cx="63" cy="41" r="2.5" fill="#000" />
    </g>
  );
}

function Sleepy() {
  return (
    <g>
      <path d="M33 42 Q38 46 43 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 42 Q62 46 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Star() {
  return (
    <g>
      {/* Left star */}
      <polygon points="38,37 39.5,40.5 43,41 40.5,43.5 41,47 38,45 35,47 35.5,43.5 33,41 36.5,40.5" fill="#FFE135" stroke="#000" strokeWidth={1.5} />
      {/* Right star */}
      <polygon points="62,37 63.5,40.5 67,41 64.5,43.5 65,47 62,45 59,47 59.5,43.5 57,41 60.5,40.5" fill="#FFE135" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Wink() {
  return (
    <g>
      {/* Open eye (left) */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      {/* Winking eye (right) */}
      <path d="M57 42 Q62 38 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Happy() {
  return (
    <g>
      <path d="M33 44 Q38 38 43 44" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 44 Q62 38 67 44" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function Angry() {
  return (
    <g>
      {/* Angry brows */}
      <line x1="33" y1="35" x2="43" y2="37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="67" y1="35" x2="57" y2="37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="38" cy="43" r="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="43" r="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="43" r="2" fill="#000" />
      <circle cx="63" cy="43" r="2" fill="#000" />
    </g>
  );
}

function Cool() {
  return (
    <g>
      {/* Sunglasses bridge */}
      <path d="M44 41 L56 41" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Left lens */}
      <rect x="29" y="37" width="16" height="10" rx="3" fill="#1a1a2e" stroke="#000" strokeWidth={S} />
      {/* Right lens */}
      <rect x="55" y="37" width="16" height="10" rx="3" fill="#1a1a2e" stroke="#000" strokeWidth={S} />
      {/* Reflection */}
      <line x1="32" y1="40" x2="36" y2="40" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.6" />
      <line x1="58" y1="40" x2="62" y2="40" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" opacity="0.6" />
    </g>
  );
}

function Sparkle() {
  return (
    <g>
      {/* Big sparkle eyes */}
      <circle cx="38" cy="42" r="6" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="6" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Pupils */}
      <circle cx="39" cy="41" r="3" fill="#000" />
      <circle cx="63" cy="41" r="3" fill="#000" />
      {/* Sparkle highlights */}
      <circle cx="36" cy="39" r="1.5" fill="#fff" />
      <circle cx="60" cy="39" r="1.5" fill="#fff" />
      <circle cx="41" cy="43" r="0.8" fill="#fff" />
      <circle cx="65" cy="43" r="0.8" fill="#fff" />
    </g>
  );
}

function Hearts() {
  return (
    <g>
      <path d="M38 38 C36 35 32 35 32 39 C32 43 38 46 38 46 C38 46 44 43 44 39 C44 35 40 35 38 38Z" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
      <path d="M62 38 C60 35 56 35 56 39 C56 43 62 46 62 46 C62 46 68 43 68 39 C68 35 64 35 62 38Z" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function Dizzy() {
  return (
    <g>
      <g transform="translate(38,42) rotate(15)"><line x1="-4" y1="-4" x2="4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /><line x1="4" y1="-4" x2="-4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /></g>
      <g transform="translate(62,42) rotate(-15)"><line x1="-4" y1="-4" x2="4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /><line x1="4" y1="-4" x2="-4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /></g>
    </g>
  );
}

function Cyclops() {
  return (
    <g>
      <circle cx="50" cy="42" r="8" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="51" cy="41" r="4" fill="#000" />
      <circle cx="48" cy="39" r="2" fill="#fff" />
    </g>
  );
}

function Lashes() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      <circle cx="63" cy="41" r="2.5" fill="#000" />
      {/* Lashes */}
      <line x1="34" y1="37" x2="32" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="37" y1="36" x2="36" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="40" y1="36" x2="41" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="58" y1="37" x2="56" y2="34" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="61" y1="36" x2="60" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="64" y1="36" x2="65" y2="33" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

export const EYE_PARTS = {
  round: Round,
  sleepy: Sleepy,
  star: Star,
  wink: Wink,
  happy: Happy,
  angry: Angry,
  cool: Cool,
  sparkle: Sparkle,
  hearts: Hearts,
  dizzy: Dizzy,
  cyclops: Cyclops,
  lashes: Lashes,
} as const;

export type EyePart = keyof typeof EYE_PARTS;
