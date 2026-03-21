/**
 * Avatar Eye Parts
 * 32 eye styles, positioned at y≈38 within viewBox 0 0 100 100
 */

import { STROKE_INNER } from './avatarDesignConstants';

const S = STROKE_INNER;

function Round() {
  return (
    <g>
      {/* Sclera with subtle upper lid shadow */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M33 40 Q38 37.5 43 40" fill="#000" opacity="0.06" />
      <path d="M57 40 Q62 37.5 67 40" fill="#000" opacity="0.06" />
      {/* Iris — two-tone for depth */}
      <circle cx="39" cy="41" r="3.2" fill="#4A6FA5" />
      <circle cx="63" cy="41" r="3.2" fill="#4A6FA5" />
      <circle cx="39" cy="42" r="2.8" fill="#3A5A8A" opacity="0.4" />
      <circle cx="63" cy="42" r="2.8" fill="#3A5A8A" opacity="0.4" />
      {/* Pupil */}
      <circle cx="39" cy="41" r="2" fill="#000" />
      <circle cx="63" cy="41" r="2" fill="#000" />
      {/* Catchlight — two reflections for liveliness */}
      <circle cx="37.5" cy="39.5" r="1.2" fill="#fff" />
      <circle cx="61.5" cy="39.5" r="1.2" fill="#fff" />
      <circle cx="40" cy="42.5" r="0.5" fill="#fff" opacity="0.5" />
      <circle cx="64" cy="42.5" r="0.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

function Sleepy() {
  return (
    <g>
      <path d="M33 40.5 Q36 41.5 39 40.5" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <path d="M61 40.5 Q64 41.5 67 40.5" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <path d="M33 42 Q38 46 43 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 42 Q62 46 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="33" y1="44" x2="34" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
      <line x1="43" y1="44" x2="42" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
      <line x1="57" y1="44" x2="58" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
      <line x1="67" y1="44" x2="66" y2="45.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

function Star() {
  return (
    <g>
      <defs>
        <linearGradient id="starEyeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      <polygon points="38,37 39.5,40.5 43,41 40.5,43.5 41,47 38,45 35,47 35.5,43.5 33,41 36.5,40.5" fill="url(#starEyeGrad)" stroke="#000" strokeWidth={1.5} />
      <polygon points="62,37 63.5,40.5 67,41 64.5,43.5 65,47 62,45 59,47 59.5,43.5 57,41 60.5,40.5" fill="url(#starEyeGrad)" stroke="#000" strokeWidth={1.5} />
      <polygon points="38,39.5 38.8,41 40,41.3 39,42.3 39.2,43.5 38,42.8 36.8,43.5 37,42.3 36,41.3 37.2,41" fill="#fff" opacity="0.45" />
      <polygon points="62,39.5 62.8,41 64,41.3 63,42.3 63.2,43.5 62,42.8 60.8,43.5 61,42.3 60,41.3 61.2,41" fill="#fff" opacity="0.45" />
    </g>
  );
}

function Wink() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="3.2" fill="#4A6FA5" />
      <circle cx="39" cy="41" r="2" fill="#000" />
      <circle cx="37.5" cy="39.5" r="1.2" fill="#fff" />
      <path d="M57 42 Q62 38 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="59" y1="40" x2="58" y2="38" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <line x1="65" y1="40" x2="66" y2="38" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function Happy() {
  return (
    <g>
      <path d="M33 44 Q38 38 43 44" fill="none" stroke="#000" strokeWidth={3} strokeLinecap="round" />
      <path d="M57 44 Q62 38 67 44" fill="none" stroke="#000" strokeWidth={3} strokeLinecap="round" />
      <line x1="32" y1="43" x2="30" y2="42" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
      <line x1="32" y1="44.5" x2="30" y2="45" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
      <line x1="68" y1="43" x2="70" y2="42" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
      <line x1="68" y1="44.5" x2="70" y2="45" stroke="#000" strokeWidth={1.2} strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

function Angry() {
  return (
    <g>
      <line x1="33" y1="35" x2="43" y2="37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="67" y1="35" x2="57" y2="37" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <circle cx="38" cy="43" r="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="43" r="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="63" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="39" cy="43" r="1.5" fill="#000" />
      <circle cx="63" cy="43" r="1.5" fill="#000" />
      <circle cx="37.8" cy="41.8" r="0.8" fill="#fff" />
      <circle cx="61.8" cy="41.8" r="0.8" fill="#fff" />
    </g>
  );
}

function Cool() {
  return (
    <g>
      <defs>
        <linearGradient id="coolLensGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a4e" />
          <stop offset="100%" stopColor="#0a0a18" />
        </linearGradient>
      </defs>
      <path d="M44 40 Q50 43 56 40" stroke="#000" strokeWidth={2} fill="none" strokeLinecap="round" />
      <rect x="29" y="37" width="16" height="10" rx="3" fill="url(#coolLensGrad)" stroke="#000" strokeWidth={S} />
      <rect x="55" y="37" width="16" height="10" rx="3" fill="url(#coolLensGrad)" stroke="#000" strokeWidth={S} />
      <line x1="32" y1="39.5" x2="37" y2="39.5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity="0.5" />
      <line x1="58" y1="39.5" x2="63" y2="39.5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity="0.5" />
      <line x1="32" y1="41.5" x2="34" y2="41.5" stroke="#fff" strokeWidth={1} strokeLinecap="round" opacity="0.25" />
      <line x1="58" y1="41.5" x2="60" y2="41.5" stroke="#fff" strokeWidth={1} strokeLinecap="round" opacity="0.25" />
    </g>
  );
}

function Sparkle() {
  return (
    <g>
      {/* Larger eyes for kawaii feel */}
      <circle cx="38" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Upper lid shadow */}
      <path d="M31 39 Q38 35 45 39" fill="#000" opacity="0.05" />
      <path d="M55 39 Q62 35 69 39" fill="#000" opacity="0.05" />
      {/* Two-tone iris */}
      <circle cx="39" cy="41" r="4" fill="#4A6FA5" />
      <circle cx="63" cy="41" r="4" fill="#4A6FA5" />
      <circle cx="39" cy="42.5" r="3.5" fill="#3A5080" opacity="0.3" />
      <circle cx="63" cy="42.5" r="3.5" fill="#3A5080" opacity="0.3" />
      {/* Pupil */}
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      <circle cx="63" cy="41" r="2.5" fill="#000" />
      {/* Triple catchlights — big, medium, small for depth */}
      <circle cx="36" cy="39" r="2" fill="#fff" />
      <circle cx="60" cy="39" r="2" fill="#fff" />
      <circle cx="41" cy="43" r="1" fill="#fff" />
      <circle cx="65" cy="43" r="1" fill="#fff" />
      <circle cx="37" cy="44" r="0.5" fill="#fff" opacity="0.7" />
      <circle cx="61" cy="44" r="0.5" fill="#fff" opacity="0.7" />
      {/* 4-point sparkle stars */}
      <path d="M34 37 L34.5 35.5 L35 37 L36.5 37.5 L35 38 L34.5 39.5 L34 38 L32.5 37.5Z" fill="#FFE135" stroke="#FFC107" strokeWidth={0.3} />
      <path d="M66 37 L66.5 35.5 L67 37 L68.5 37.5 L67 38 L66.5 39.5 L66 38 L64.5 37.5Z" fill="#FFE135" stroke="#FFC107" strokeWidth={0.3} />
      {/* Smaller accent sparkles */}
      <path d="M43 36 L43.3 35.2 L43.6 36 L44.4 36.3 L43.6 36.6 L43.3 37.4 L43 36.6 L42.2 36.3Z" fill="#FFE135" opacity="0.6" />
      <path d="M57 36 L57.3 35.2 L57.6 36 L58.4 36.3 L57.6 36.6 L57.3 37.4 L57 36.6 L56.2 36.3Z" fill="#FFE135" opacity="0.6" />
    </g>
  );
}

function Hearts() {
  return (
    <g>
      <circle cx="38" cy="42" r="8" fill="#FF1493" opacity="0.1" />
      <circle cx="62" cy="42" r="8" fill="#FF1493" opacity="0.1" />
      <path d="M38 38 C36 35 32 35 32 39 C32 43 38 46 38 46 C38 46 44 43 44 39 C44 35 40 35 38 38Z" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
      <path d="M62 38 C60 35 56 35 56 39 C56 43 62 46 62 46 C62 46 68 43 68 39 C68 35 64 35 62 38Z" fill="#FF1493" stroke="#000" strokeWidth={1.5} />
      <path d="M36 37.5 C35 36.5 33.5 37 34 38.5" fill="none" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity="0.6" />
      <path d="M60 37.5 C59 36.5 57.5 37 58 38.5" fill="none" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity="0.6" />
    </g>
  );
}

function Dizzy() {
  return (
    <g>
      <circle cx="38" cy="42" r="6" fill="none" stroke="#000" strokeWidth={0.8} strokeDasharray="2 2" opacity="0.3" />
      <circle cx="62" cy="42" r="6" fill="none" stroke="#000" strokeWidth={0.8} strokeDasharray="2 2" opacity="0.3" />
      <g transform="translate(38,42) rotate(15)"><line x1="-4" y1="-4" x2="4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /><line x1="4" y1="-4" x2="-4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /></g>
      <g transform="translate(62,42) rotate(-15)"><line x1="-4" y1="-4" x2="4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /><line x1="4" y1="-4" x2="-4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /></g>
      <path d="M32 38 Q34 36 33 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M44 38 Q42 36 43 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M56 38 Q58 36 57 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M68 38 Q66 36 67 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
    </g>
  );
}

function Cyclops() {
  return (
    <g>
      <path d="M42 38 Q50 35 58 38" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <circle cx="50" cy="42" r="8" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="51" cy="41" r="5" fill="#4A6FA5" />
      <circle cx="51" cy="41" r="3" fill="#000" />
      <circle cx="48.5" cy="39" r="2" fill="#fff" />
      <circle cx="52" cy="43" r="0.8" fill="#fff" opacity="0.5" />
    </g>
  );
}

function Lashes() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="3.2" fill="#5D4037" />
      <circle cx="63" cy="41" r="3.2" fill="#5D4037" />
      <circle cx="39" cy="41" r="2" fill="#000" />
      <circle cx="63" cy="41" r="2" fill="#000" />
      <circle cx="37.5" cy="39.5" r="1" fill="#fff" />
      <circle cx="61.5" cy="39.5" r="1" fill="#fff" />
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
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      <circle cx="37.5" cy="39.5" r="1" fill="#fff" />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="63" cy="41" r="2.5" fill="#000" />
      <circle cx="61.5" cy="39.5" r="1" fill="#fff" />
      <circle cx="62" cy="42" r="8" fill="none" stroke="#FFD700" strokeWidth={S} />
      <path d="M70 42 Q74 52 72 62 Q70 68 68 65" stroke="#FFD700" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <path d="M55 32 Q62 28 70 33" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

function CrossEyed() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="42" cy="42" r="3" fill="#4A6FA5" />
      <circle cx="58" cy="42" r="3" fill="#4A6FA5" />
      <circle cx="42" cy="42" r="1.8" fill="#000" />
      <circle cx="58" cy="42" r="1.8" fill="#000" />
      <circle cx="41" cy="40.5" r="0.9" fill="#fff" />
      <circle cx="57" cy="40.5" r="0.9" fill="#fff" />
    </g>
  );
}

function Laser() {
  return (
    <g>
      <circle cx="38" cy="42" r="8" fill="#FF0000" opacity="0.12" />
      <circle cx="62" cy="42" r="8" fill="#FF0000" opacity="0.12" />
      <circle cx="38" cy="42" r="5" fill="#FF0000" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#FF0000" stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="2" fill="#FFD700" />
      <circle cx="62" cy="42" r="2" fill="#FFD700" />
      <circle cx="38" cy="42" r="0.8" fill="#fff" />
      <circle cx="62" cy="42" r="0.8" fill="#fff" />
      <polygon points="33,40.5 10,41.5 10,42.5 33,43.5" fill="#FF0000" opacity="0.5" />
      <polygon points="67,40.5 90,41.5 90,42.5 67,43.5" fill="#FF0000" opacity="0.5" />
      <line x1="33" y1="42" x2="10" y2="42" stroke="#FF6666" strokeWidth={1} opacity="0.8" />
      <line x1="67" y1="42" x2="90" y2="42" stroke="#FF6666" strokeWidth={1} opacity="0.8" />
      <circle cx="20" cy="42" r="1.5" fill="none" stroke="#FF0000" strokeWidth={0.5} opacity="0.4" />
      <circle cx="80" cy="42" r="1.5" fill="none" stroke="#FF0000" strokeWidth={0.5} opacity="0.4" />
    </g>
  );
}

function Hypno() {
  return (
    <g>
      <circle cx="38" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="6" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="38" cy="42" r="4" fill="none" stroke="#D946EF" strokeWidth={1.2} />
      <circle cx="38" cy="42" r="2" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="38" cy="42" r="0.6" fill="#000" />
      <circle cx="62" cy="42" r="6" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="62" cy="42" r="4" fill="none" stroke="#D946EF" strokeWidth={1.2} />
      <circle cx="62" cy="42" r="2" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="62" cy="42" r="0.6" fill="#000" />
    </g>
  );
}

function Money() {
  return (
    <g>
      <circle cx="38" cy="42" r="7" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#BFFF00" stroke="#000" strokeWidth={S} />
      <path d="M36 39 Q36 37.5 38 37.5 Q40 37.5 40 39 Q40 40 38 40.5 Q36 41 36 42.5 Q36 44.5 38 44.5 Q40 44.5 40 43" fill="none" stroke="#228B22" strokeWidth={1.8} strokeLinecap="round" />
      <line x1="38" y1="36" x2="38" y2="46" stroke="#228B22" strokeWidth={1} />
      <path d="M60 39 Q60 37.5 62 37.5 Q64 37.5 64 39 Q64 40 62 40.5 Q60 41 60 42.5 Q60 44.5 62 44.5 Q64 44.5 64 43" fill="none" stroke="#228B22" strokeWidth={1.8} strokeLinecap="round" />
      <line x1="62" y1="36" x2="62" y2="46" stroke="#228B22" strokeWidth={1} />
      <circle cx="35" cy="39" r="1" fill="#fff" opacity="0.4" />
      <circle cx="59" cy="39" r="1" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Alien() {
  return (
    <g>
      {/* Outer glow ring for contrast on dark bases */}
      <ellipse cx="36" cy="42" rx="11" ry="8" fill="none" stroke="#00FF00" strokeWidth={0.8} opacity="0.25" transform="rotate(-10 36 42)" />
      <ellipse cx="64" cy="42" rx="11" ry="8" fill="none" stroke="#00FF00" strokeWidth={0.8} opacity="0.25" transform="rotate(10 64 42)" />
      <ellipse cx="36" cy="42" rx="10" ry="7" fill="#0a2a0a" stroke="#00FF00" strokeWidth={S} transform="rotate(-10 36 42)" />
      <ellipse cx="64" cy="42" rx="10" ry="7" fill="#0a2a0a" stroke="#00FF00" strokeWidth={S} transform="rotate(10 64 42)" />
      <ellipse cx="36" cy="42" rx="9" ry="6" fill="none" stroke="#00FF00" strokeWidth={0.5} opacity="0.25" transform="rotate(-10 36 42)" />
      <path d="M30 40 Q33 42 30 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <path d="M42 40 Q39 42 42 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <path d="M58 40 Q61 42 58 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <path d="M70 40 Q67 42 70 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <ellipse cx="38" cy="42" rx="3" ry="4" fill="#00FF00" opacity="0.8" />
      <ellipse cx="62" cy="42" rx="3" ry="4" fill="#00FF00" opacity="0.8" />
      <ellipse cx="38" cy="42" rx="1.5" ry="3" fill="#88FF88" opacity="0.4" />
      <ellipse cx="62" cy="42" rx="1.5" ry="3" fill="#88FF88" opacity="0.4" />
      <circle cx="35" cy="39.5" r="1.5" fill="#fff" opacity="0.4" />
      <circle cx="61" cy="39.5" r="1.5" fill="#fff" opacity="0.4" />
    </g>
  );
}

function Crying() {
  return (
    <g>
      <path d="M33 36 Q38 34 43 37" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 37 Q62 34 67 36" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M33 40 Q38 38 43 40" fill="#FFCCCC" opacity="0.4" />
      <path d="M57 40 Q62 38 67 40" fill="#FFCCCC" opacity="0.4" />
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="39" cy="43" r="2.5" fill="#000" />
      <circle cx="63" cy="43" r="2.5" fill="#000" />
      <circle cx="37.5" cy="41.5" r="0.8" fill="#fff" />
      <circle cx="61.5" cy="41.5" r="0.8" fill="#fff" />
      <path d="M35 48 Q34 52 35 56 Q36 58 37 56 Q38 52 37 48" fill="#87CEEB" stroke="#5BA3D9" strokeWidth={0.5} opacity="0.7" />
      <path d="M63 48 Q62 52 63 56 Q64 58 65 56 Q66 52 65 48" fill="#87CEEB" stroke="#5BA3D9" strokeWidth={0.5} opacity="0.7" />
      <path d="M37 50 Q36.5 53 37.5 55" fill="none" stroke="#87CEEB" strokeWidth={1} opacity="0.4" strokeLinecap="round" />
      <path d="M65 50 Q64.5 53 65.5 55" fill="none" stroke="#87CEEB" strokeWidth={1} opacity="0.4" strokeLinecap="round" />
      <circle cx="50" cy="52" r="1.5" fill="#FFAAAA" opacity="0.3" />
    </g>
  );
}

function Galaxy() {
  return (
    <g>
      <defs>
        {/* Static nebula gradient — no color cycling */}
        <radialGradient id="galaxyEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E040FB" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#1A237E" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="42" r="7" fill="url(#galaxyEyeGrad)" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="url(#galaxyEyeGrad)" stroke="#000" strokeWidth={S} />
      {/* Slow orbit arcs */}
      <path d="M34 40 Q38 38 42 40" fill="none" stroke="#E040FB" strokeWidth={0.6} opacity="0.3">
        <animateTransform attributeName="transform" type="rotate" from="0 38 42" to="360 38 42" dur="15s" repeatCount="indefinite" />
      </path>
      <path d="M58 40 Q62 38 66 40" fill="none" stroke="#00BCD4" strokeWidth={0.6} opacity="0.3">
        <animateTransform attributeName="transform" type="rotate" from="0 62 42" to="-360 62 42" dur="15s" repeatCount="indefinite" />
      </path>
      {/* Gentle star twinkle */}
      <circle cx="36" cy="40" r="0.8" fill="#fff"><animate attributeName="opacity" values="0.7;0.15;0.7" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="40" cy="43" r="0.5" fill="#fff"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="5s" begin="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="60" cy="40" r="0.8" fill="#fff"><animate attributeName="opacity" values="0.7;0.15;0.7" dur="4.5s" begin="1s" repeatCount="indefinite" /></circle>
      <circle cx="64" cy="43" r="0.5" fill="#fff"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="5s" begin="2.5s" repeatCount="indefinite" /></circle>
      {/* Soft center glow — slow pulse */}
      <circle cx="38" cy="42" r="2" fill="#fff"><animate attributeName="opacity" values="0.4;0.75;0.4" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="2" fill="#fff"><animate attributeName="opacity" values="0.4;0.75;0.4" dur="4s" begin="1.5s" repeatCount="indefinite" /></circle>
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
      <circle cx="38" cy="42" r="9" fill="#FF6D00" opacity="0.08" />
      <circle cx="62" cy="42" r="9" fill="#FF6D00" opacity="0.08" />
      {/* Flame shape — slow gentle breathing instead of fast flicker */}
      <path d="M38 48 C32 44 32 38 38 34 C44 38 44 44 38 48Z" fill="url(#flameEyeGrad)" stroke="#000" strokeWidth={1.5}>
        <animateTransform attributeName="transform" type="scale" values="1 1;1.01 1.04;1 1" dur="3s" repeatCount="indefinite" additive="sum" />
      </path>
      <path d="M62 48 C56 44 56 38 62 34 C68 38 68 44 62 48Z" fill="url(#flameEyeGrad)" stroke="#000" strokeWidth={1.5}>
        <animateTransform attributeName="transform" type="scale" values="1 1;1.01 1.04;1 1" dur="3.5s" repeatCount="indefinite" additive="sum" />
      </path>
      <path d="M38 46 C35 43 35 39 38 37 C41 39 41 43 38 46Z" fill="#FFD600" opacity="0.6" />
      <path d="M62 46 C59 43 59 39 62 37 C65 39 65 43 62 46Z" fill="#FFD600" opacity="0.6" />
      <path d="M38 44 C37 42 37 41 38 40 C39 41 39 42 38 44Z" fill="#fff" opacity="0.7" />
      <path d="M62 44 C61 42 61 41 62 40 C63 41 63 42 62 44Z" fill="#fff" opacity="0.7" />
      {/* Slow gentle embers */}
      <circle cx="36" cy="36" r="0.5" fill="#FFD600"><animate attributeName="cy" values="36;30;24" dur="4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.6;0.25;0" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="64" cy="35" r="0.4" fill="#FF9100"><animate attributeName="cy" values="35;28;22" dur="5s" begin="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;0.2;0" dur="5s" begin="1.5s" repeatCount="indefinite" /></circle>
    </g>
  );
}

function Robot() {
  return (
    <g>
      <rect x="31" y="37" width="14" height="10" rx="2" fill="#0D47A1" stroke="#000" strokeWidth={S} />
      <rect x="55" y="37" width="14" height="10" rx="2" fill="#0D47A1" stroke="#000" strokeWidth={S} />
      <rect x="31" y="37" width="14" height="1.5" rx="1" fill="#1565C0" opacity="0.5" />
      <rect x="55" y="37" width="14" height="1.5" rx="1" fill="#1565C0" opacity="0.5" />
      {/* Slow scan lines */}
      <line x1="33" y1="38" x2="43" y2="38" stroke="#00E5FF" strokeWidth={1} opacity="0.5"><animate attributeName="y1" values="38;46;38" dur="4s" repeatCount="indefinite" /><animate attributeName="y2" values="38;46;38" dur="4s" repeatCount="indefinite" /></line>
      <line x1="57" y1="38" x2="67" y2="38" stroke="#00E5FF" strokeWidth={1} opacity="0.5"><animate attributeName="y1" values="38;46;38" dur="4s" begin="1s" repeatCount="indefinite" /><animate attributeName="y2" values="38;46;38" dur="4s" begin="1s" repeatCount="indefinite" /></line>
      <line x1="33" y1="40" x2="43" y2="40" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <line x1="33" y1="43" x2="43" y2="43" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <line x1="57" y1="40" x2="67" y2="40" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <line x1="57" y1="43" x2="67" y2="43" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <circle cx="38" cy="42" r="3" fill="#00E5FF" opacity="0.3" />
      <circle cx="62" cy="42" r="3" fill="#00E5FF" opacity="0.3" />
      {/* Gentle core pulse */}
      <circle cx="38" cy="42" r="2" fill="#00E5FF"><animate attributeName="r" values="2;2.4;2" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="2" fill="#00E5FF"><animate attributeName="r" values="2;2.4;2" dur="3s" begin="0.7s" repeatCount="indefinite" /></circle>
      <circle cx="37" cy="41" r="0.8" fill="#fff" opacity="0.6" />
      <circle cx="61" cy="41" r="0.8" fill="#fff" opacity="0.6" />
    </g>
  );
}

function Void() {
  const vg = 'url(#voidEyeGrad)';
  return (
    <g>
      <defs>
        <radialGradient id="voidEyeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" /><stop offset="70%" stopColor="#1A0033" /><stop offset="100%" stopColor="#4A0080" />
        </radialGradient>
      </defs>
      {/* Slow eerie breathing */}
      <circle cx="38" cy="42" r="7" fill={vg} stroke="#4A0080" strokeWidth={S}><animate attributeName="r" values="7;7.2;7" dur="5s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="7" fill={vg} stroke="#4A0080" strokeWidth={S}><animate attributeName="r" values="7;7.2;7" dur="5s" begin="1s" repeatCount="indefinite" /></circle>
      {/* Slow vortex rotation */}
      <path d="M38 42 Q36 39 38 37 Q40 39 38 42 Q36 45 38 47" fill="none" stroke="#7C4DFF" strokeWidth={0.8} opacity="0.4"><animateTransform attributeName="transform" type="rotate" from="0 38 42" to="360 38 42" dur="12s" repeatCount="indefinite" /></path>
      <path d="M62 42 Q60 39 62 37 Q64 39 62 42 Q60 45 62 47" fill="none" stroke="#7C4DFF" strokeWidth={0.8} opacity="0.4"><animateTransform attributeName="transform" type="rotate" from="0 62 42" to="-360 62 42" dur="12s" repeatCount="indefinite" /></path>
      {/* Slow matter absorption */}
      <circle cx="32" cy="38" r="0.5" fill="#E040FB" opacity="0.5"><animate attributeName="cx" values="32;38" dur="4s" repeatCount="indefinite" /><animate attributeName="cy" values="38;42" dur="4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;0" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="68" cy="39" r="0.5" fill="#7C4DFF" opacity="0.4"><animate attributeName="cx" values="68;62" dur="5s" begin="1.5s" repeatCount="indefinite" /><animate attributeName="cy" values="39;42" dur="5s" begin="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0" dur="5s" begin="1.5s" repeatCount="indefinite" /></circle>
      {/* Eerie center glow */}
      <circle cx="38" cy="42" r="0.8" fill="#E040FB"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="0.8" fill="#E040FB"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" begin="1s" repeatCount="indefinite" /></circle>
    </g>
  );
}

function Infinity() {
  const rb = 'url(#infinityRainbow)';
  const vo = 'url(#infinityRing1)';
  return (
    <g>
      <defs>
        <radialGradient id="infinityRing1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" /><stop offset="30%" stopColor="#1A0033" /><stop offset="60%" stopColor="#4A00E0" /><stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id="infinityRainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF0000"><animate attributeName="stopColor" values="#FF0000;#FF8C00;#00FF88;#0088FF;#8B00FF;#FF0000" dur="4s" repeatCount="indefinite" /></stop>
          <stop offset="33%" stopColor="#00FF88"><animate attributeName="stopColor" values="#00FF88;#0088FF;#8B00FF;#FF0000;#FF8C00;#00FF88" dur="4s" repeatCount="indefinite" /></stop>
          <stop offset="66%" stopColor="#0088FF"><animate attributeName="stopColor" values="#0088FF;#8B00FF;#FF0000;#FF8C00;#00FF88;#0088FF" dur="4s" repeatCount="indefinite" /></stop>
          <stop offset="100%" stopColor="#8B00FF"><animate attributeName="stopColor" values="#8B00FF;#FF0000;#FF8C00;#00FF88;#0088FF;#8B00FF" dur="4s" repeatCount="indefinite" /></stop>
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="10" fill="#4A00E0" opacity="0.08" /><circle cx="62" cy="42" r="10" fill="#4A00E0" opacity="0.08" />
      <circle cx="38" cy="42" r="8" fill="none" stroke={rb} strokeWidth={2}><animate attributeName="strokeWidth" values="2;2.5;2" dur="2s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="6" fill="none" stroke={rb} strokeWidth={1} opacity="0.5" />
      <circle cx="38" cy="42" r="5" fill={vo} />
      <circle cx="62" cy="42" r="8" fill="none" stroke={rb} strokeWidth={2}><animate attributeName="strokeWidth" values="2;2.5;2" dur="2s" begin="0.5s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="6" fill="none" stroke={rb} strokeWidth={1} opacity="0.5" />
      <circle cx="62" cy="42" r="5" fill={vo} />
      <circle cx="38" cy="34" r="0.8" fill="#FF0000" opacity="0.8"><animateTransform attributeName="transform" type="rotate" from="0 38 42" to="360 38 42" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="46" cy="42" r="0.7" fill="#00FF88" opacity="0.7"><animateTransform attributeName="transform" type="rotate" from="120 38 42" to="480 38 42" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="34" r="0.8" fill="#8B00FF" opacity="0.8"><animateTransform attributeName="transform" type="rotate" from="0 62 42" to="-360 62 42" dur="3.2s" repeatCount="indefinite" /></circle>
      <circle cx="70" cy="42" r="0.7" fill="#FF8C00" opacity="0.7"><animateTransform attributeName="transform" type="rotate" from="120 62 42" to="-240 62 42" dur="3.2s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="1.5" fill="#fff"><animate attributeName="opacity" values="0.8;1;0.6;0.8" dur="1.5s" repeatCount="indefinite" /><animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="0.5" fill="#fff" /><circle cx="62" cy="42" r="0.5" fill="#fff" />
      <circle cx="62" cy="42" r="1.5" fill="#fff"><animate attributeName="opacity" values="0.8;1;0.6;0.8" dur="1.5s" begin="0.3s" repeatCount="indefinite" /><animate attributeName="r" values="1.5;2;1.5" dur="1.5s" begin="0.3s" repeatCount="indefinite" /></circle>
      <path d="M45 42 Q50 36 55 42 Q50 48 45 42" fill="none" stroke={rb} strokeWidth={0.8} opacity="0.4"><animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" /></path>
    </g>
  );
}

/** Side-glancing curious eyes — pupils shifted right */
function Curious() {
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Upper lid shadow */}
      <path d="M33 40 Q38 37.5 43 40" fill="#000" opacity="0.06" />
      <path d="M57 40 Q62 37.5 67 40" fill="#000" opacity="0.06" />
      {/* Iris shifted right — looking to the side */}
      <circle cx="40.5" cy="41.5" r="3.2" fill="#6B8E5A" />
      <circle cx="64.5" cy="41.5" r="3.2" fill="#6B8E5A" />
      <circle cx="40.5" cy="41.5" r="2" fill="#000" />
      <circle cx="64.5" cy="41.5" r="2" fill="#000" />
      <circle cx="39.5" cy="40" r="1" fill="#fff" />
      <circle cx="63.5" cy="40" r="1" fill="#fff" />
      {/* Raised eyebrow on one side for quizzical look */}
      <path d="M33 36 Q38 34 43 36" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M57 34 Q62 32 67 35" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

/** Narrow determined/focused eyes */
function Determined() {
  return (
    <g>
      {/* Flat top eyelid — focused look */}
      <path d="M33 40 L43 40 Q43 47 38 47 Q33 47 33 40Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 40 L67 40 Q67 47 62 47 Q57 47 57 40Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Iris */}
      <circle cx="38" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="62" cy="43" r="2.8" fill="#5D4037" />
      <circle cx="38" cy="43" r="1.6" fill="#000" />
      <circle cx="62" cy="43" r="1.6" fill="#000" />
      <circle cx="37" cy="42" r="0.8" fill="#fff" />
      <circle cx="61" cy="42" r="0.8" fill="#fff" />
      {/* Strong brow line */}
      <path d="M32 37 Q38 34 44 37" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
      <path d="M56 37 Q62 34 68 37" fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/** Soft doe eyes — large, round, innocent */
function Doe() {
  return (
    <g>
      {/* Extra large sclera */}
      <circle cx="38" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Large dark iris */}
      <circle cx="38" cy="42.5" r="5.5" fill="#2C1810" />
      <circle cx="62" cy="42.5" r="5.5" fill="#2C1810" />
      {/* Iris ring */}
      <circle cx="38" cy="42.5" r="4" fill="#4A2820" />
      <circle cx="62" cy="42.5" r="4" fill="#4A2820" />
      {/* Pupil */}
      <circle cx="38" cy="42" r="3" fill="#000" />
      <circle cx="62" cy="42" r="3" fill="#000" />
      {/* Large catchlights */}
      <circle cx="36" cy="40" r="2.2" fill="#fff" />
      <circle cx="60" cy="40" r="2.2" fill="#fff" />
      <circle cx="40" cy="44" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="64" cy="44" r="1.2" fill="#fff" opacity="0.7" />
      {/* Bottom lash line hint */}
      <path d="M31.5 45 Q38 48 44.5 45" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" />
      <path d="M55.5 45 Q62 48 68.5 45" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" />
    </g>
  );
}

/** Peaceful closed eyes — gentle curved lines */
function Closed() {
  return (
    <g>
      {/* Closed eyelid curves — gentle arcs */}
      <path d="M33 42 Q38 45 43 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 42 Q62 45 67 42" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Upper lid crease — subtle shadow */}
      <path d="M34 40 Q38 38 42 40" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
      <path d="M58 40 Q62 38 66 40" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
      {/* Eyelash hints at outer corners */}
      <line x1="33" y1="42.5" x2="31.5" y2="43.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <line x1="67" y1="42.5" x2="68.5" y2="43.5" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      {/* Inner lash hints */}
      <line x1="43" y1="42.5" x2="44" y2="43.5" stroke="#000" strokeWidth={0.8} strokeLinecap="round" opacity="0.3" />
      <line x1="57" y1="42.5" x2="56" y2="43.5" stroke="#000" strokeWidth={0.8} strokeLinecap="round" opacity="0.3" />
    </g>
  );
}

/** Cat/dragon eyes — normal sclera with vertical slit pupils */
function CatPupils() {
  return (
    <g>
      {/* Sclera */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Upper lid shadow */}
      <path d="M33 40 Q38 37.5 43 40" fill="#000" opacity="0.06" />
      <path d="M57 40 Q62 37.5 67 40" fill="#000" opacity="0.06" />
      {/* Iris — amber/yellow for cat feel */}
      <circle cx="38" cy="42" r="3.5" fill="#D4A017" />
      <circle cx="62" cy="42" r="3.5" fill="#D4A017" />
      {/* Iris outer ring */}
      <circle cx="38" cy="42" r="3.5" fill="none" stroke="#8B6914" strokeWidth={0.6} opacity="0.5" />
      <circle cx="62" cy="42" r="3.5" fill="none" stroke="#8B6914" strokeWidth={0.6} opacity="0.5" />
      {/* Vertical slit pupils */}
      <ellipse cx="38" cy="42" rx="1" ry="3.2" fill="#000" />
      <ellipse cx="62" cy="42" rx="1" ry="3.2" fill="#000" />
      {/* Catchlight */}
      <circle cx="36.5" cy="40" r="1" fill="#fff" />
      <circle cx="60.5" cy="40" r="1" fill="#fff" />
      <circle cx="39" cy="43.5" r="0.4" fill="#fff" opacity="0.5" />
      <circle cx="63" cy="43.5" r="0.4" fill="#fff" opacity="0.5" />
    </g>
  );
}

/** Extra large shocked/surprised eyes — tiny irises, maximum white */
function Wide() {
  return (
    <g>
      {/* Large sclera — bigger than normal */}
      <circle cx="38" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7.5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Upper lid pulled high */}
      <path d="M31 38 Q38 34 45 38" fill="#000" opacity="0.05" />
      <path d="M55 38 Q62 34 69 38" fill="#000" opacity="0.05" />
      {/* Tiny iris — maximum white showing */}
      <circle cx="38" cy="42" r="2.2" fill="#4A6FA5" />
      <circle cx="62" cy="42" r="2.2" fill="#4A6FA5" />
      {/* Tiny pupil */}
      <circle cx="38" cy="42" r="1.3" fill="#000" />
      <circle cx="62" cy="42" r="1.3" fill="#000" />
      {/* Catchlight */}
      <circle cx="37" cy="41" r="0.7" fill="#fff" />
      <circle cx="61" cy="41" r="0.7" fill="#fff" />
      {/* Bottom lid line for extra shock */}
      <path d="M31.5 46 Q38 49 44.5 46" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      <path d="M55.5 46 Q62 49 68.5 46" fill="none" stroke="#000" strokeWidth={0.7} opacity="0.15" />
      {/* Raised brow lines for shock */}
      <path d="M32 34 Q38 30 44 34" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M56 34 Q62 30 68 34" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

/** Narrow suspicious squinting eyes */
function Squint() {
  return (
    <g>
      {/* Narrow eye slits — top and bottom lids nearly touching */}
      <path d="M33 42 Q38 39.5 43 42 Q38 44 33 42Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M57 42 Q62 39.5 67 42 Q62 44 57 42Z" fill="#fff" stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Iris peek through the slit */}
      <ellipse cx="38" cy="42" rx="2.5" ry="1.2" fill="#5D4037" />
      <ellipse cx="62" cy="42" rx="2.5" ry="1.2" fill="#5D4037" />
      {/* Pupil — flattened */}
      <ellipse cx="38" cy="42" rx="1.5" ry="0.8" fill="#000" />
      <ellipse cx="62" cy="42" rx="1.5" ry="0.8" fill="#000" />
      {/* Tiny catchlight */}
      <circle cx="37" cy="41.5" r="0.5" fill="#fff" />
      <circle cx="61" cy="41.5" r="0.5" fill="#fff" />
      {/* Lid crease lines — suspicious furrowing */}
      <path d="M33 39 Q38 37 43 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" strokeLinecap="round" />
      <path d="M57 39 Q62 37 67 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" strokeLinecap="round" />
      {/* Lower lid crease */}
      <path d="M34 44.5 Q38 46 42 44.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" strokeLinecap="round" />
      <path d="M58 44.5 Q62 46 66 44.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

/** Downturned sad eyes — droopy outer corners */
function Sad() {
  return (
    <g>
      {/* Sclera */}
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      {/* Droopy upper lid — outer corners sag down */}
      <path d="M33 41 Q36 39 38 39 Q41 39 43 43" fill="#000" opacity="0.08" />
      <path d="M57 43 Q59 39 62 39 Q64 39 67 41" fill="#000" opacity="0.08" />
      {/* Droopy eyelid line */}
      <path d="M33 40 Q36 38 38 38 Q41 38 43 42" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      <path d="M57 42 Q59 38 62 38 Q64 38 67 40" fill="none" stroke="#000" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
      {/* Iris — looking slightly down */}
      <circle cx="38" cy="43" r="3" fill="#4A6FA5" />
      <circle cx="62" cy="43" r="3" fill="#4A6FA5" />
      <circle cx="38" cy="43.5" r="2.5" fill="#3A5A8A" opacity="0.4" />
      <circle cx="62" cy="43.5" r="2.5" fill="#3A5A8A" opacity="0.4" />
      {/* Pupil */}
      <circle cx="38" cy="43" r="1.8" fill="#000" />
      <circle cx="62" cy="43" r="1.8" fill="#000" />
      {/* Catchlight — slightly dimmer for sad mood */}
      <circle cx="36.5" cy="41.5" r="1" fill="#fff" opacity="0.8" />
      <circle cx="60.5" cy="41.5" r="1" fill="#fff" opacity="0.8" />
      <circle cx="39" cy="44" r="0.4" fill="#fff" opacity="0.4" />
      <circle cx="63" cy="44" r="0.4" fill="#fff" opacity="0.4" />
      {/* Downturned eyebrows */}
      <path d="M32 37 Q36 35 40 36 Q42 37 44 38" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M56 38 Q58 37 60 36 Q64 35 68 37" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  );
}

function WingedLiner() {
  return (
    <g>
      {/* Eyes with bold winged eyeliner — cat-eye makeup look */}
      {/* Left eye */}
      <ellipse cx="38" cy="42" rx="6" ry="4.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M32 40 Q38 36 44 40" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1.8} strokeLinecap="round" />
      {/* Wing flick — left */}
      <path d="M44 40 L48 35 L46 39" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1} />
      {/* Iris + pupil */}
      <circle cx="39" cy="42" r="3" fill="#4A6FA5" />
      <circle cx="39" cy="42" r="1.8" fill="#000" />
      <circle cx="37.5" cy="40.5" r="1" fill="#fff" />
      {/* Right eye */}
      <ellipse cx="62" cy="42" rx="6" ry="4.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M56 40 Q62 36 68 40" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1.8} strokeLinecap="round" />
      {/* Wing flick — right */}
      <path d="M68 40 L72 35 L70 39" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1} />
      {/* Iris + pupil */}
      <circle cx="63" cy="42" r="3" fill="#4A6FA5" />
      <circle cx="63" cy="42" r="1.8" fill="#000" />
      <circle cx="61.5" cy="40.5" r="1" fill="#fff" />
      {/* Lower lash line — subtle */}
      <path d="M34 44 Q38 46 42 44" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
      <path d="M58 44 Q62 46 66 44" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
    </g>
  );
}

function SmokyEye() {
  return (
    <g>
      {/* Smoky eye — blended dark shadow around eyes */}
      {/* Shadow halos */}
      <ellipse cx="38" cy="42" rx="9" ry="6" fill="#2D1B4E" opacity="0.25" />
      <ellipse cx="62" cy="42" rx="9" ry="6" fill="#2D1B4E" opacity="0.25" />
      <ellipse cx="38" cy="41" rx="7.5" ry="5" fill="#4A2D6E" opacity="0.2" />
      <ellipse cx="62" cy="41" rx="7.5" ry="5" fill="#4A2D6E" opacity="0.2" />
      {/* Eye whites */}
      <ellipse cx="38" cy="42" rx="5.5" ry="4" fill="#fff" stroke="#2D1B4E" strokeWidth={S} />
      <ellipse cx="62" cy="42" rx="5.5" ry="4" fill="#fff" stroke="#2D1B4E" strokeWidth={S} />
      {/* Thick upper lid line */}
      <path d="M32.5 40 Q38 36.5 43.5 40" fill="none" stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M56.5 40 Q62 36.5 67.5 40" fill="none" stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" />
      {/* Iris — deep blue-gray for dramatic look */}
      <circle cx="39" cy="42" r="3" fill="#3A5A6A" />
      <circle cx="63" cy="42" r="3" fill="#3A5A6A" />
      {/* Pupils */}
      <circle cx="39" cy="42" r="1.8" fill="#000" />
      <circle cx="63" cy="42" r="1.8" fill="#000" />
      {/* Catchlights */}
      <circle cx="37.5" cy="40.5" r="1" fill="#fff" />
      <circle cx="61.5" cy="40.5" r="1" fill="#fff" />
      <circle cx="40" cy="43" r="0.4" fill="#fff" opacity="0.5" />
      <circle cx="64" cy="43" r="0.4" fill="#fff" opacity="0.5" />
    </g>
  );
}

function None() { return <g />; }

export const EYE_PARTS = {
  none: None,
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
  curious: Curious,
  determined: Determined,
  doe: Doe,
  closed: Closed,
  catPupils: CatPupils,
  wide: Wide,
  squint: Squint,
  sad: Sad,
  wingedLiner: WingedLiner,
  smokyEye: SmokyEye,
} as const;

export type EyePart = keyof typeof EYE_PARTS;
