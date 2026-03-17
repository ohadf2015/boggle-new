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

function MonocleEye() {
  return (
    <g>
      {/* Normal left eye */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      {/* Right eye with monocle */}
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="63" cy="41" r="2.5" fill="#000" />
      <circle cx="62" cy="42" r="8" fill="none" stroke="#FFD700" strokeWidth={S} />
      {/* Chain dangling */}
      <path d="M70 42 Q74 52 72 62 Q70 68 68 65" stroke="#FFD700" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* Raised eyebrow */}
      <path d="M55 32 Q62 28 70 33" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function CrossEyed() {
  return (
    <g>
      {/* Eyes looking inward */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Pupils pointing toward nose */}
      <circle cx="42" cy="42" r="2.5" fill="#000" />
      <circle cx="58" cy="42" r="2.5" fill="#000" />
    </g>
  );
}

function Laser() {
  return (
    <g>
      {/* Glowing red eyes */}
      <circle cx="38" cy="42" r="5" fill="#FF0000" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#FF0000" stroke="#000" strokeWidth={S} />
      {/* Bright centers */}
      <circle cx="38" cy="42" r="2" fill="#FFD700" />
      <circle cx="62" cy="42" r="2" fill="#FFD700" />
      {/* Laser beams shooting out */}
      <line x1="33" y1="42" x2="10" y2="42" stroke="#FF0000" strokeWidth={2} opacity="0.6" />
      <line x1="67" y1="42" x2="90" y2="42" stroke="#FF0000" strokeWidth={2} opacity="0.6" />
      {/* Glow effect */}
      <circle cx="38" cy="42" r="7" fill="#FF0000" opacity="0.15" />
      <circle cx="62" cy="42" r="7" fill="#FF0000" opacity="0.15" />
    </g>
  );
}

function Hypno() {
  return (
    <g>
      {/* Spiral hypnotic eyes */}
      <circle cx="38" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Spirals */}
      <path d="M38 42 m0,-5 a5,5 0 1,1 0,10 a3,3 0 1,0 0,-6 a1,1 0 1,1 0,2" fill="none" stroke="#8B5CF6" strokeWidth={1.5} />
      <path d="M62 42 m0,-5 a5,5 0 1,1 0,10 a3,3 0 1,0 0,-6 a1,1 0 1,1 0,2" fill="none" stroke="#8B5CF6" strokeWidth={1.5} />
    </g>
  );
}

function Money() {
  return (
    <g>
      {/* Dollar sign eyes */}
      <circle cx="38" cy="42" r="7" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      <text x="34" y="46" fontSize="10" fontWeight="bold" fill="#228B22" fontFamily="Arial">$</text>
      <text x="58" y="46" fontSize="10" fontWeight="bold" fill="#228B22" fontFamily="Arial">$</text>
    </g>
  );
}

function Alien() {
  return (
    <g>
      {/* Big almond-shaped alien eyes */}
      <ellipse cx="36" cy="42" rx="10" ry="7" fill="#000" stroke="#00FF00" strokeWidth={S} transform="rotate(-10 36 42)" />
      <ellipse cx="64" cy="42" rx="10" ry="7" fill="#000" stroke="#00FF00" strokeWidth={S} transform="rotate(10 64 42)" />
      {/* Glowing pupils */}
      <ellipse cx="38" cy="42" rx="3" ry="4" fill="#00FF00" opacity="0.7" />
      <ellipse cx="62" cy="42" rx="3" ry="4" fill="#00FF00" opacity="0.7" />
      {/* Reflection */}
      <circle cx="35" cy="40" r="1.5" fill="#fff" opacity="0.4" />
      <circle cx="61" cy="40" r="1.5" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Crying() {
  return (
    <g>
      {/* Sad round eyes */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="43" r="2.5" fill="#000" />
      <circle cx="63" cy="43" r="2.5" fill="#000" />
      {/* Sad eyebrows */}
      <path d="M33 36 Q38 34 43 37" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 37 Q62 34 67 36" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Tear drops */}
      <path d="M34 48 Q33 54 34 58 Q36 60 38 58 Q39 54 38 48" fill="#87CEEB" stroke="#000" strokeWidth={1} opacity="0.7" />
      <path d="M62 48 Q61 54 62 58 Q64 60 66 58 Q67 54 66 48" fill="#87CEEB" stroke="#000" strokeWidth={1} opacity="0.7" />
    </g>
  );
}

function Galaxy() {
  return (
    <g>
      <defs>
        <radialGradient id="galaxyEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E040FB" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#1A237E" />
        </radialGradient>
      </defs>
      {/* Nebula eyes */}
      <circle cx="38" cy="42" r="7" fill="url(#galaxyEyeGrad)" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="url(#galaxyEyeGrad)" stroke="#000" strokeWidth={S} />
      {/* Tiny stars */}
      <circle cx="36" cy="40" r="1" fill="#fff" opacity="0.9" />
      <circle cx="40" cy="43" r="0.7" fill="#fff" opacity="0.7" />
      <circle cx="60" cy="40" r="1" fill="#fff" opacity="0.9" />
      <circle cx="64" cy="43" r="0.7" fill="#fff" opacity="0.7" />
      {/* Center glow */}
      <circle cx="38" cy="42" r="2" fill="#fff" opacity="0.5" />
      <circle cx="62" cy="42" r="2" fill="#fff" opacity="0.5" />
    </g>
  );
}

function FlameEyes() {
  return (
    <g>
      <defs>
        <linearGradient id="flameEyeGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF6D00" />
          <stop offset="50%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
      </defs>
      {/* Fire-shaped eyes */}
      <path d="M38 48 C32 44 32 38 38 34 C44 38 44 44 38 48Z" fill="url(#flameEyeGrad)" stroke="#000" strokeWidth={1.5} />
      <path d="M62 48 C56 44 56 38 62 34 C68 38 68 44 62 48Z" fill="url(#flameEyeGrad)" stroke="#000" strokeWidth={1.5} />
      {/* Inner flame */}
      <path d="M38 45 C36 43 36 40 38 38 C40 40 40 43 38 45Z" fill="#fff" opacity="0.6" />
      <path d="M62 45 C60 43 60 40 62 38 C64 40 64 43 62 45Z" fill="#fff" opacity="0.6" />
    </g>
  );
}

function Robot() {
  return (
    <g>
      {/* Rectangular screen eyes */}
      <rect x="31" y="37" width="14" height="10" rx="2" fill="#0D47A1" stroke="#000" strokeWidth={S} />
      <rect x="55" y="37" width="14" height="10" rx="2" fill="#0D47A1" stroke="#000" strokeWidth={S} />
      {/* Scan lines */}
      <line x1="33" y1="40" x2="43" y2="40" stroke="#00E5FF" strokeWidth={0.8} opacity="0.6" />
      <line x1="33" y1="43" x2="43" y2="43" stroke="#00E5FF" strokeWidth={0.8} opacity="0.6" />
      <line x1="57" y1="40" x2="67" y2="40" stroke="#00E5FF" strokeWidth={0.8} opacity="0.6" />
      <line x1="57" y1="43" x2="67" y2="43" stroke="#00E5FF" strokeWidth={0.8} opacity="0.6" />
      {/* Glowing pupils */}
      <circle cx="38" cy="42" r="2.5" fill="#00E5FF" />
      <circle cx="62" cy="42" r="2.5" fill="#00E5FF" />
      {/* Reflection */}
      <circle cx="37" cy="41" r="1" fill="#fff" opacity="0.5" />
      <circle cx="61" cy="41" r="1" fill="#fff" opacity="0.5" />
    </g>
  );
}

function Void() {
  return (
    <g>
      <defs>
        <radialGradient id="voidEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" />
          <stop offset="70%" stopColor="#1A0033" />
          <stop offset="100%" stopColor="#4A0080" />
        </radialGradient>
      </defs>
      {/* Bottomless void eyes */}
      <circle cx="38" cy="42" r="7" fill="url(#voidEyeGrad)" stroke="#4A0080" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="url(#voidEyeGrad)" stroke="#4A0080" strokeWidth={S} />
      {/* Spiral hints */}
      <path d="M38 42 Q36 39 38 37 Q40 39 38 42" fill="none" stroke="#7C4DFF" strokeWidth={0.8} opacity="0.5" />
      <path d="M62 42 Q60 39 62 37 Q64 39 62 42" fill="none" stroke="#7C4DFF" strokeWidth={0.8} opacity="0.5" />
      {/* Tiny pinprick of light in center */}
      <circle cx="38" cy="42" r="0.8" fill="#E040FB" />
      <circle cx="62" cy="42" r="0.8" fill="#E040FB" />
    </g>
  );
}

// ==================== LEGENDARY: Infinity Eyes ====================
function Infinity() {
  return (
    <g>
      <defs>
        <radialGradient id="infinityRing1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" />
          <stop offset="30%" stopColor="#1A0033" />
          <stop offset="60%" stopColor="#4A00E0" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id="infinityRainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF0000" />
          <stop offset="25%" stopColor="#FF8C00" />
          <stop offset="50%" stopColor="#00FF88" />
          <stop offset="75%" stopColor="#0088FF" />
          <stop offset="100%" stopColor="#8B00FF" />
        </linearGradient>
      </defs>
      {/* Outer rainbow ring — left */}
      <circle cx="38" cy="42" r="8" fill="none" stroke="url(#infinityRainbow)" strokeWidth={2} />
      <circle cx="38" cy="42" r="6" fill="none" stroke="url(#infinityRainbow)" strokeWidth={1} opacity="0.5" />
      {/* Inner void — left */}
      <circle cx="38" cy="42" r="5" fill="url(#infinityRing1)" />
      {/* Orbiting particles — left */}
      <circle cx="32" cy="38" r="0.8" fill="#FF0000" opacity="0.8" />
      <circle cx="44" cy="39" r="0.8" fill="#00FF88" opacity="0.8" />
      <circle cx="36" cy="48" r="0.6" fill="#0088FF" opacity="0.7" />
      {/* Center singularity — left */}
      <circle cx="38" cy="42" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="38" cy="42" r="0.5" fill="#fff" />
      {/* Outer rainbow ring — right */}
      <circle cx="62" cy="42" r="8" fill="none" stroke="url(#infinityRainbow)" strokeWidth={2} />
      <circle cx="62" cy="42" r="6" fill="none" stroke="url(#infinityRainbow)" strokeWidth={1} opacity="0.5" />
      {/* Inner void — right */}
      <circle cx="62" cy="42" r="5" fill="url(#infinityRing1)" />
      {/* Orbiting particles — right */}
      <circle cx="56" cy="38" r="0.8" fill="#8B00FF" opacity="0.8" />
      <circle cx="68" cy="39" r="0.8" fill="#FF8C00" opacity="0.8" />
      <circle cx="60" cy="48" r="0.6" fill="#FF0000" opacity="0.7" />
      {/* Center singularity — right */}
      <circle cx="62" cy="42" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="62" cy="42" r="0.5" fill="#fff" />
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
  monocleEye: MonocleEye,
  crossEyed: CrossEyed,
  laser: Laser,
  hypno: Hypno,
  money: Money,
  alien: Alien,
  crying: Crying,
  galaxy: Galaxy,
  flame: FlameEyes,
  robot: Robot,
  void: Void,
  infinity: Infinity,
} as const;

export type EyePart = keyof typeof EYE_PARTS;
