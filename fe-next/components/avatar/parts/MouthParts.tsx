/**
 * Avatar Mouth Parts
 * 27 mouth styles, positioned at y≈58 within viewBox 0 0 100 100
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_INNER;

function Smile() {
  return (
    <g>
      <path d="M37 60 Q50 70 63 60" fill="#E85D75" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Inner lip highlight */}
      <path d="M39 61.5 Q50 68 61 61.5" fill="#FF8FA3" opacity="0.5" />
      {/* Lip shine */}
      <path d="M41 60.5 Q50 64 59 60.5" fill="none" stroke="#fff" strokeWidth={1} opacity="0.45" strokeLinecap="round" />
      {/* Dimple hints at corners */}
      <circle cx="37" cy="60.5" r="0.8" fill="#000" opacity="0.15" />
      <circle cx="63" cy="60.5" r="0.8" fill="#000" opacity="0.15" />
    </g>
  );
}

function Grin() {
  return (
    <g>
      <path d="M34 58 Q50 72 66 58" fill="#8B0000" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M34 58 Q50 63 66 58" fill="#fff" stroke="#000" strokeWidth={1.2} />
      <line x1="41" y1="58" x2="41" y2="61.5" stroke="#000" strokeWidth={0.7} />
      <line x1="47" y1="58" x2="47" y2="63" stroke="#000" strokeWidth={0.7} />
      <line x1="53" y1="58" x2="53" y2="63" stroke="#000" strokeWidth={0.7} />
      <line x1="59" y1="58" x2="59" y2="61.5" stroke="#000" strokeWidth={0.7} />
      <path d="M36 59 Q50 62 64 59" fill="none" stroke="#FF9999" strokeWidth={1} opacity="0.5" />
      <ellipse cx="50" cy="68" rx="6" ry="3.5" fill="#FF6B6B" opacity="0.6" />
    </g>
  );
}

function Tongue() {
  return (
    <g>
      <path d="M38 58 Q50 68 62 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M38 59 Q50 61 62 59" fill="none" stroke="#E8A0A0" strokeWidth={0.8} />
      <ellipse cx="50" cy="66" rx="6" ry="5" fill="#FF6B6B" stroke="#000" strokeWidth={1.5} />
      <path d="M50 63 L50 69" fill="none" stroke="#CC4444" strokeWidth={0.8} opacity="0.6" />
      <path d="M47 65 Q50 67 53 65" fill="none" stroke="#CC4444" strokeWidth={0.6} opacity="0.5" />
      <ellipse cx="48" cy="65" rx="1.5" ry="1" fill="#fff" opacity="0.3" />
    </g>
  );
}

function Oh() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}ohShadow`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#333" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="5" ry="7" fill={`url(#${u}ohShadow)`} stroke="#000" strokeWidth={S} />
      <ellipse cx="50" cy="62" rx="5.8" ry="7.8" fill="none" stroke="#E88" strokeWidth={1} opacity="0.4" />
      <path d="M46 56 Q44 54 45 53" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
      <path d="M54 56 Q56 54 55 53" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
    </g>
  );
}

function Smirk() {
  return (
    <g>
      <path d="M38 62 Q50 68 62 56" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M39 63 Q50 67 60 58" fill="#E85D75" opacity="0.35" />
      <circle cx="63" cy="57" r="1.2" fill="#000" opacity="0.3" />
      <path d="M64 55 Q66.5 57.5 64 60" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
    </g>
  );
}

function Flat() {
  return (
    <g>
      <line x1="37" y1="62" x2="63" y2="62" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M38 60.5 Q50 59.5 62 60.5" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <line x1="39" y1="64" x2="42" y2="64" stroke="#000" strokeWidth={0.7} opacity="0.2" />
      <line x1="58" y1="64" x2="61" y2="64" stroke="#000" strokeWidth={0.7} opacity="0.2" />
    </g>
  );
}

function Teeth() {
  return (
    <g>
      <path d="M39 57 Q39 55 41 55 L59 55 Q61 55 61 57" fill="#FF9999" stroke="#000" strokeWidth={1.2} />
      <rect x="39" y="57" width="22" height="10" rx="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M39 58 L41 60 L44 58 L47 60 L50 58 L53 60 L56 58 L59 60 L61 58" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.3" />
      <line x1="44" y1="57" x2="44" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="50" y1="57" x2="50" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="55.5" y1="57" x2="55.5" y2="67" stroke="#000" strokeWidth={0.8} />
      <path d="M37 58 Q39 56 39 58" fill="none" stroke="#000" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M63 58 Q61 56 61 58" fill="none" stroke="#000" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

function Cat() {
  return (
    <g>
      {/* No triangle nose here — BaseParts already renders one */}
      <path d="M38 61 L44 65 L50 59 L56 65 L62 61" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 58 L50 61" fill="none" stroke="#000" strokeWidth={1} />
      <circle cx="34" cy="60" r="0.8" fill="#000" />
      <circle cx="32" cy="58" r="0.8" fill="#000" />
      <circle cx="32" cy="62" r="0.8" fill="#000" />
      <circle cx="66" cy="60" r="0.8" fill="#000" />
      <circle cx="68" cy="58" r="0.8" fill="#000" />
      <circle cx="68" cy="62" r="0.8" fill="#000" />
    </g>
  );
}

function Vampire() {
  return (
    <g>
      <path d="M38 58 Q50 68 62 58" fill="#4A0000" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M40 58 Q50 62 60 58" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <polygon points="41,58 43,67 39,67" fill="#fff" stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <polygon points="59,58 61,67 57,67" fill="#fff" stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <path d="M41 58 L41.5 61" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.4" />
      <path d="M59 58 L59.5 61" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.4" />
      {/* Blood drop removed for "Designed for Families" compliance — cute fangs only. */}
    </g>
  );
}

function Kiss() {
  return (
    <g>
      <ellipse cx="50" cy="62" rx="6" ry="4.5" fill="#FF1493" stroke="#000" strokeWidth={S} />
      <path d="M45 61 Q50 59 55 61" fill="none" stroke="#CC0066" strokeWidth={0.6} />
      <path d="M45 63 Q50 65 55 63" fill="none" stroke="#CC0066" strokeWidth={0.6} />
      <path d="M46 62 Q50 60.5 54 62" fill="none" stroke="#CC0066" strokeWidth={0.5} opacity="0.4" />
      <ellipse cx="47" cy="61" rx="2" ry="1.5" fill="#FF69B4" opacity="0.5" />
      <ellipse cx="53" cy="61" rx="1.2" ry="0.8" fill="#fff" opacity="0.35" />
      <path d="M53 52 L54 50 L53.5 51 L55 50 L54 52 L54.5 50.5" fill="#FF1493" stroke="#CC0066" strokeWidth={0.6} />
    </g>
  );
}

function Braces() {
  return (
    <g>
      <rect x="39" y="57" width="22" height="10" rx="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="44" y1="57" x2="44" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="50" y1="57" x2="50" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="55.5" y1="57" x2="55.5" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="40" y1="62" x2="60" y2="62" stroke="#C0C0C0" strokeWidth={1.8} />
      <rect x="41.5" y="61" width="2" height="2" rx="0.3" fill="#C0C0C0" stroke="#888" strokeWidth={0.5} />
      <rect x="48.5" y="61" width="2" height="2" rx="0.3" fill="#C0C0C0" stroke="#888" strokeWidth={0.5} />
      <rect x="54" y="61" width="2" height="2" rx="0.3" fill="#C0C0C0" stroke="#888" strokeWidth={0.5} />
      <circle cx="43" cy="62" r="0.8" fill="#FF4081" />
      <circle cx="50" cy="62" r="0.8" fill="#448AFF" />
      <circle cx="55.5" cy="62" r="0.8" fill="#69F0AE" />
    </g>
  );
}

function Drool() {
  return (
    <g>
      <path d="M40 60 Q50 68 60 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M55 63 Q57 70 55 75 Q53 77 51 75 Q49 70 51 63" fill="#87CEEB" stroke="#000" strokeWidth={1} opacity="0.8" />
      <path d="M53 64 Q54 68 53 72" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.5" />
      <path d="M58 64 Q60 68 59 71 Q58 72 57 71 Q56 68 57 64" fill="#87CEEB" stroke="#000" strokeWidth={0.8} opacity="0.6" />
      <path d="M48 65 Q49 68 48 70 Q47.5 71 47 70 Q46.5 68 47 65" fill="#87CEEB" stroke="#000" strokeWidth={0.6} opacity="0.5" />
      <ellipse cx="54" cy="74" rx="1.5" ry="1.5" fill="#B0E0FF" stroke="#87CEEB" strokeWidth={0.5} opacity="0.7" />
      <ellipse cx="53.5" cy="73.5" rx="0.5" ry="0.5" fill="#fff" opacity="0.6" />
    </g>
  );
}

function GoldTooth() {
  return (
    <g>
      <rect x="39" y="57" width="22" height="10" rx="4" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="44" y1="57" x2="44" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="50" y1="57" x2="50" y2="67" stroke="#000" strokeWidth={0.8} />
      <line x1="55.5" y1="57" x2="55.5" y2="67" stroke="#000" strokeWidth={0.8} />
      <rect x="50" y="57" width="5.5" height="10" rx="1" fill="#FFD700" stroke="#000" strokeWidth={1} />
      <rect x="51" y="58" width="2" height="3" rx="0.5" fill="#fff" opacity="0.4" />
      <line x1="52" y1="54" x2="52" y2="56" stroke="#FFD700" strokeWidth={0.8} />
      <line x1="49" y1="55" x2="50.5" y2="56.5" stroke="#FFD700" strokeWidth={0.8} />
      <line x1="56" y1="55" x2="55" y2="56.5" stroke="#FFD700" strokeWidth={0.8} />
      <circle cx="53" cy="55" r="0.6" fill="#FFD700" />
    </g>
  );
}

function Mustache() {
  return (
    <g>
      <path d="M42 62 Q50 66 58 62" fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M50 56 Q44 58 36 55 Q30 52 26 54" fill="#2C1B18" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M50 56 Q56 58 64 55 Q70 52 74 54" fill="#2C1B18" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M50 55 Q44 56.5 38 54.5" fill="none" stroke="#4A3328" strokeWidth={0.8} opacity="0.5" />
      <path d="M50 55 Q56 56.5 62 54.5" fill="none" stroke="#4A3328" strokeWidth={0.8} opacity="0.5" />
      <path d="M50 57 Q46 58 40 56" fill="none" stroke="#1A0F0A" strokeWidth={0.6} opacity="0.4" />
      <path d="M50 57 Q54 58 60 56" fill="none" stroke="#1A0F0A" strokeWidth={0.6} opacity="0.4" />
      <circle cx="26" cy="53" r="2.5" fill="#2C1B18" stroke="#000" strokeWidth={1.2} />
      <circle cx="74" cy="53" r="2.5" fill="#2C1B18" stroke="#000" strokeWidth={1.2} />
      <path d="M25 52 Q26 50 27 52" fill="none" stroke="#000" strokeWidth={0.8} />
      <path d="M73 52 Q74 50 75 52" fill="none" stroke="#000" strokeWidth={0.8} />
    </g>
  );
}

function Whistle() {
  return (
    <g>
      <ellipse cx="50" cy="60" rx="4.5" ry="3.5" fill="#FF6B6B" stroke="#000" strokeWidth={S} />
      <path d="M46.5 59 Q50 57.5 53.5 59" fill="none" stroke="#CC4444" strokeWidth={0.6} />
      <path d="M47 61 Q50 62.5 53 61" fill="none" stroke="#CC4444" strokeWidth={0.6} />
      <ellipse cx="48" cy="59.5" rx="1.2" ry="0.8" fill="#FF9999" opacity="0.5" />
      <path d="M56 58 Q58 56 60 58" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M58 56 Q60 54 62 56" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      {/* Music notes as SVG paths — cross-font reliable */}
      <g opacity="0.5">
        <circle cx="59" cy="52" r="1.5" fill="#000" /><path d="M60.5 52 L60.5 46" stroke="#000" strokeWidth={0.8} /><path d="M60.5 46 Q62 45 63 46" stroke="#000" strokeWidth={0.8} fill="none" />
      </g>
      <g opacity="0.35">
        <circle cx="66" cy="48" r="1.2" fill="#000" /><path d="M67.2 48 L67.2 43" stroke="#000" strokeWidth={0.7} />
      </g>
      <g opacity="0.25">
        <circle cx="63" cy="44" r="1" fill="#000" /><path d="M64 44 L64 40" stroke="#000" strokeWidth={0.6} />
      </g>
    </g>
  );
}

function Zipper() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}zipperMetal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DDD" />
          <stop offset="50%" stopColor="#999" />
          <stop offset="100%" stopColor="#666" />
        </linearGradient>
      </defs>
      <line x1="38" y1="62" x2="62" y2="62" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M39 60.5 Q50 59 61 60.5" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.15" />
      {[40, 44, 48, 52, 56, 60].map(x => (
        <rect key={x} x={x - 1} y={60} width={2} height={4} rx={0.3} fill={`url(#${u}zipperMetal)`} stroke="#555" strokeWidth={0.5} />
      ))}
      <rect x="35" y="59.5" width="5" height="5" rx="1.5" fill="#FFD700" stroke="#000" strokeWidth={1.2} />
      <rect x="36.5" y="61" width="2" height="1.5" rx="0.5" fill="#FFF" opacity="0.3" />
    </g>
  );
}

function Blowfish() {
  return (
    <g>
      <ellipse cx="50" cy="66" rx="14" ry="9" fill="#FFB6C1" stroke="#000" strokeWidth={S} />
      <path d="M40 58 Q42 60 40 62" fill="none" stroke="#E8899A" strokeWidth={0.6} opacity="0.5" />
      <path d="M60 58 Q58 60 60 62" fill="none" stroke="#E8899A" strokeWidth={0.6} opacity="0.5" />
      <path d="M44 64 Q46 66 44 68" fill="none" stroke="#E8899A" strokeWidth={0.5} opacity="0.4" />
      <path d="M56 64 Q54 66 56 68" fill="none" stroke="#E8899A" strokeWidth={0.5} opacity="0.4" />
      <ellipse cx="50" cy="64" rx="3.5" ry="2.5" fill="#FF6B6B" stroke="#000" strokeWidth={1.5} />
      <ellipse cx="49" cy="63.5" rx="1" ry="0.6" fill="#FF9999" opacity="0.5" />
      <path d="M66 57 L73 55" stroke="#000" strokeWidth={1} opacity="0.25" strokeLinecap="round" />
      <path d="M66 61 L75 61" stroke="#000" strokeWidth={1} opacity="0.2" strokeLinecap="round" />
      <path d="M66 65 L73 67" stroke="#000" strokeWidth={1} opacity="0.25" strokeLinecap="round" />
      <path d="M68 58 L71 58" stroke="#000" strokeWidth={0.6} opacity="0.15" strokeLinecap="round" />
      <path d="M69 64 L72 65" stroke="#000" strokeWidth={0.6} opacity="0.15" strokeLinecap="round" />
    </g>
  );
}

function Gap() {
  return (
    <g>
      {/* Open smile showing teeth */}
      <path d="M37 58 Q50 70 63 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M37 58 Q50 62 63 58" fill="none" stroke="#000" strokeWidth={1} />
      {/* Gap between front teeth — wider and darker for visibility */}
      <rect x="47.5" y="58" width="5" height="8" fill="#3D0000" rx="0.5" />
      {/* Gum line hint */}
      <path d="M38 59 Q50 61 62 59" fill="none" stroke="#FF9999" strokeWidth={0.8} opacity="0.4" />
      {/* Tongue peek */}
      <ellipse cx="50" cy="67" rx="3" ry="2.5" fill="#FF6B6B" opacity="0.7" />
    </g>
  );
}

function Dragon() {
  return (
    <g>
      <path d="M35 58 Q50 72 65 58" fill="#4A0000" stroke="#000" strokeWidth={S} />
      <path d="M38 60 Q50 64 62 60" fill="none" stroke="#200" strokeWidth={0.8} opacity="0.5" />
      <polygon points="39,58 42,66 36,66" fill="#fff" stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <polygon points="61,58 64,66 58,66" fill="#fff" stroke="#000" strokeWidth={1} strokeLinejoin="round" />
      <polygon points="46,58 48,63 44,63" fill="#fff" stroke="#000" strokeWidth={0.8} />
      <polygon points="54,58 56,63 52,63" fill="#fff" stroke="#000" strokeWidth={0.8} />
      {/* Red tongue (black outline). Blood/venom drips removed for "Designed
          for Families" compliance — fire-breathing dragon, no gore. */}
      <path d="M48 64 Q50 70 52 64" fill="#FF3333" stroke="#000" strokeWidth={0.8} />
      <path d="M40 68 Q42 60 45 68 Q47 58 50 68 Q53 58 55 68 Q58 60 60 68" fill="none" stroke="#FF6D00" strokeWidth={2}>
        <animate attributeName="opacity" values="0.8;0.4;0.9;0.6;0.8" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M43 70 Q45 63 48 70 Q50 62 52 70 Q55 63 57 70" fill="none" stroke="#FFD600" strokeWidth={1.2}>
        <animate attributeName="opacity" values="0.6;0.9;0.3;0.7;0.6" dur="3.5s" repeatCount="indefinite" />
      </path>
      <path d="M46 71 Q48 66 50 72 Q52 66 54 71" fill="none" stroke="#FFF176" strokeWidth={0.8}>
        <animate attributeName="opacity" values="0.4;0.7;0.2;0.5;0.4" dur="4s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function DiamondMouth() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}diamondMouthGrad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0F7FA" />
          <stop offset="50%" stopColor="#80DEEA" />
          <stop offset="100%" stopColor="#00ACC1" />
        </linearGradient>
      </defs>
      <path d="M37 58 Q50 68 63 58" fill="#fff" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <polygon points="41,58 43,64 39,64" fill={`url(#${u}diamondMouthGrad)`} stroke="#000" strokeWidth={0.8} />
      <polygon points="47,59 49,65 45,65" fill={`url(#${u}diamondMouthGrad)`} stroke="#000" strokeWidth={0.8} />
      <polygon points="53,59 55,65 51,65" fill={`url(#${u}diamondMouthGrad)`} stroke="#000" strokeWidth={0.8} />
      <polygon points="59,58 61,64 57,64" fill={`url(#${u}diamondMouthGrad)`} stroke="#000" strokeWidth={0.8} />
      <line x1="41" y1="60" x2="43" y2="64" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.5" />
      <line x1="47" y1="61" x2="49" y2="65" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.5" />
      <line x1="53" y1="61" x2="55" y2="65" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.5" />
      <line x1="59" y1="60" x2="61" y2="64" fill="none" stroke="#fff" strokeWidth={0.4} opacity="0.5" />
      {[42, 48, 54, 60].map(x => (
        <g key={x}>
          <line x1={x} y1={58} x2={x} y2={56} stroke="#fff" strokeWidth={0.5} opacity="0.6" />
          <line x1={x - 1.5} y1={59} x2={x - 2.5} y2={58} stroke="#fff" strokeWidth={0.5} opacity="0.4" />
          <line x1={x + 1.5} y1={59} x2={x + 2.5} y2={58} stroke="#fff" strokeWidth={0.5} opacity="0.4" />
        </g>
      ))}
      <path d="M44 56 Q50 54 56 56" fill="none" stroke="#FF7043" strokeWidth={0.4} opacity="0.3" />
      <path d="M46 55 Q50 53 54 55" fill="none" stroke="#AB47BC" strokeWidth={0.4} opacity="0.3" />
    </g>
  );
}

function Glitch() {
  return (
    <g>
      <rect x="38" y="57" width="24" height="5" rx="1" fill="#000" />
      {/* Glitch offset slices — slower, less frantic */}
      <rect x="36" y="56" width="10" height="2" fill="#FF0000">
        <animate attributeName="opacity" values="0.3;0;0;0.3;0.4;0" dur="2s" repeatCount="indefinite" />
        <animate attributeName="x" values="36;38;35;36" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <rect x="54" y="60" width="10" height="2" fill="#00FFFF">
        <animate attributeName="opacity" values="0;0.35;0.4;0;0;0.3" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="x" values="54;52;55;54" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="42" y="59" width="6" height="1" fill="#FF00FF">
        <animate attributeName="opacity" values="0;0;0.3;0;0;0.25;0" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="40" y="57" width="8" height="5" rx="1" fill="#FF0000" opacity="0.25" transform="translate(2, -1)">
        <animate attributeName="opacity" values="0.25;0;0;0.3;0;0.25" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="52" y="57" width="8" height="5" rx="1" fill="#00FFFF" opacity="0.25" transform="translate(-2, 1)">
        <animate attributeName="opacity" values="0;0.3;0;0;0.25;0" dur="2.5s" repeatCount="indefinite" />
      </rect>
      {/* Pixel teeth */}
      <rect x="41" y="57" width="3" height="2.5" fill="#fff" />
      <rect x="46" y="57" width="3" height="2.5" fill="#fff" />
      <rect x="51" y="57" width="3" height="2.5" fill="#fff" />
      <rect x="56" y="57" width="3" height="2.5" fill="#fff" />
      {/* Scan lines */}
      <line x1="38" y1="58.5" x2="62" y2="58.5" stroke="#fff" strokeWidth={0.3} opacity="0.15" />
      <line x1="38" y1="60" x2="62" y2="60" stroke="#fff" strokeWidth={0.3} opacity="0.1" />
      <rect x="44" y="56" width="4" height="1" fill="#0F0">
        <animate attributeName="opacity" values="0;0;0.2;0;0;0.15;0" dur="3.5s" repeatCount="indefinite" />
      </rect>
      <rect x="52" y="62" width="5" height="1" fill="#F0F">
        <animate attributeName="opacity" values="0;0.2;0;0;0;0.15" dur="3s" repeatCount="indefinite" />
      </rect>
    </g>
  );
}

function Frown() {
  return (
    <g>
      <path d="M40 64 Q50 58 60 64" fill="#E85D75" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Inner lip highlight */}
      <path d="M42 63.5 Q50 59.5 58 63.5" fill="#FF8FA3" opacity="0.5" />
      {/* Lip shine */}
      <path d="M44 64 Q50 61 56 64" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.45" strokeLinecap="round" />
      {/* Dimple hints at corners */}
      <circle cx="40" cy="63.5" r="0.6" fill="#000" opacity="0.12" />
      <circle cx="60" cy="63.5" r="0.6" fill="#000" opacity="0.12" />
      {/* Subtle downturned crease lines */}
      <path d="M38 64 Q37 65 36 65.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" strokeLinecap="round" />
      <path d="M62 64 Q63 65 64 65.5" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

function Pout() {
  return (
    <g>
      {/* Upper lip */}
      <path d="M42 60 Q46 57 50 59 Q54 57 58 60" fill="#E85D75" stroke="#000" strokeWidth={S} strokeLinecap="round" strokeLinejoin="round" />
      {/* Lower lip — plump */}
      <path d="M42 60 Q50 67 58 60" fill="#D14D67" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Upper lip cupid's bow highlight */}
      <path d="M44 59 Q47 57.5 50 59 Q53 57.5 56 59" fill="none" stroke="#FF8FA3" strokeWidth={0.7} opacity="0.5" />
      {/* Lower lip shine */}
      <ellipse cx="50" cy="63" rx="4" ry="1.5" fill="#FF8FA3" opacity="0.4" />
      {/* Center highlight */}
      <ellipse cx="50" cy="62" rx="2" ry="0.8" fill="#fff" opacity="0.3" />
      {/* Lip line */}
      <path d="M43 60 Q50 61.5 57 60" fill="none" stroke="#B33D55" strokeWidth={0.5} opacity="0.4" />
    </g>
  );
}

function BubbleGum() {
  return (
    <g>
      {/* Open smile */}
      <path d="M40 60 Q50 68 60 60" fill="#E85D75" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Inner lip highlight */}
      <path d="M42 61 Q50 66 58 61" fill="#FF8FA3" opacity="0.5" />
      {/* Teeth row */}
      <path d="M42 60 Q50 62 58 60" fill="#fff" stroke="#000" strokeWidth={0.8} />
      {/* Bubble — inflating from mouth center */}
      <circle cx="50" cy="72" r="7" fill="#FF69B4" stroke="#000" strokeWidth={1.5} />
      {/* Bubble inner gradient highlight */}
      <circle cx="50" cy="72" r="6" fill="none" stroke="#FFB6D9" strokeWidth={0.8} opacity="0.4" />
      {/* Bubble shine — top left */}
      <ellipse cx="47" cy="69" rx="2.5" ry="1.8" fill="#fff" opacity="0.5" transform="rotate(-20 47 69)" />
      {/* Bubble secondary highlight */}
      <circle cx="53" cy="74" r="0.8" fill="#fff" opacity="0.3" />
      {/* Connection to mouth */}
      <path d="M48 66 Q49 68 48 70" fill="none" stroke="#FF69B4" strokeWidth={1} opacity="0.6" />
      <path d="M52 66 Q51 68 52 70" fill="none" stroke="#FF69B4" strokeWidth={1} opacity="0.6" />
    </g>
  );
}

function BuckTeeth() {
  return (
    <g>
      {/* Open smile */}
      <path d="M38 58 Q50 68 62 58" fill="#8B0000" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Gum line */}
      <path d="M38 58 Q50 62 62 58" fill="#FF9999" stroke="#000" strokeWidth={0.8} />
      {/* Regular teeth row */}
      <rect x="39" y="58" width="5" height="4" rx="0.5" fill="#fff" stroke="#000" strokeWidth={0.6} />
      <rect x="56" y="58" width="5" height="4" rx="0.5" fill="#fff" stroke="#000" strokeWidth={0.6} />
      {/* Two prominent buck teeth — taller and wider */}
      <rect x="44.5" y="58" width="5" height="7" rx="1" fill="#fff" stroke="#000" strokeWidth={1} />
      <rect x="50" y="58" width="5" height="7" rx="1" fill="#fff" stroke="#000" strokeWidth={1} />
      {/* Tooth divider line */}
      <line x1="50" y1="58" x2="50" y2="65" stroke="#000" strokeWidth={0.6} />
      {/* Tooth shine */}
      <rect x="45.5" y="59" width="1.5" height="2.5" rx="0.5" fill="#fff" opacity="0.5" />
      <rect x="51" y="59" width="1.5" height="2.5" rx="0.5" fill="#fff" opacity="0.5" />
      {/* Tongue peek behind */}
      <ellipse cx="50" cy="65" rx="4" ry="2.5" fill="#FF6B6B" opacity="0.5" />
    </g>
  );
}

function SideSmile() {
  return (
    <g>
      {/* Asymmetric mouth — left corner neutral, right corner up */}
      <path d="M40 62 Q48 63 52 61 Q56 58 60 56" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Subtle lip fill on the curved side */}
      <path d="M48 62 Q52 60 56 58" fill="#E85D75" opacity="0.25" />
      {/* Right corner uptick emphasis */}
      <circle cx="60" cy="56.5" r="0.7" fill="#000" opacity="0.3" />
      {/* Dimple at the raised corner */}
      <path d="M61 55 Q63 56 61 58" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.25" />
      {/* Left corner — flat, subtle mark */}
      <circle cx="40" cy="62.5" r="0.5" fill="#000" opacity="0.15" />
      {/* Subtle lower lip shadow */}
      <path d="M42 64 Q48 65 54 63" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.12" />
    </g>
  );
}

function Lipstick() {
  const u = useAvatarUid();
  return (
    <g>
      {/* Full lipstick — bold colored lips */}
      <defs>
        <linearGradient id={`${u}lipstickGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4264F" />
          <stop offset="100%" stopColor="#A01B3A" />
        </linearGradient>
      </defs>
      {/* Upper lip — cupid's bow */}
      <path d="M40 59 Q44 56 48 58 L50 56 L52 58 Q56 56 60 59 Q50 61 40 59Z"
        fill={`url(#${u}lipstickGrad)`} stroke="#8B1538" strokeWidth={1} />
      {/* Lower lip — fuller bottom */}
      <path d="M40 59 Q50 67 60 59 Q50 61 40 59Z"
        fill={`url(#${u}lipstickGrad)`} stroke="#8B1538" strokeWidth={1} />
      {/* Lip highlight — glossy top */}
      <path d="M44 58 Q48 56.5 52 58" fill="none" stroke="#FF6B8A" strokeWidth={1} opacity="0.5" strokeLinecap="round" />
      {/* Lower lip shine */}
      <ellipse cx="50" cy="62.5" rx="4" ry="1.5" fill="#fff" opacity="0.2" />
      {/* Dimples */}
      <circle cx="39" cy="59.5" r="0.5" fill="#000" opacity="0.12" />
      <circle cx="61" cy="59.5" r="0.5" fill="#000" opacity="0.12" />
    </g>
  );
}

function LipGloss() {
  return (
    <g>
      {/* Lip gloss — natural lips with high shine */}
      {/* Upper lip — soft natural shape */}
      <path d="M41 59.5 Q44 57 48 58.5 L50 57 L52 58.5 Q56 57 59 59.5 Q50 61 41 59.5Z"
        fill="#E87C9E" stroke="#C4607A" strokeWidth={0.8} />
      {/* Lower lip */}
      <path d="M41 59.5 Q50 66 59 59.5 Q50 61 41 59.5Z"
        fill="#E87C9E" stroke="#C4607A" strokeWidth={0.8} />
      {/* Glossy shine — multiple reflections for wet look */}
      <ellipse cx="47" cy="58.5" rx="3" ry="1" fill="#fff" opacity="0.45" />
      <ellipse cx="53" cy="58.5" rx="2.5" ry="0.8" fill="#fff" opacity="0.35" />
      <ellipse cx="50" cy="62" rx="5" ry="2" fill="#fff" opacity="0.3" />
      {/* Tiny highlight dots */}
      <circle cx="45" cy="58" r="0.6" fill="#fff" opacity="0.6" />
      <circle cx="55" cy="58" r="0.5" fill="#fff" opacity="0.5" />
    </g>
  );
}

/** Closed smile — subtle, lips together, gentle content expression */
function ClosedSmile() {
  return (
    <g>
      {/* Upper lip */}
      <path d="M40 60 Q44 58 50 58 Q56 58 60 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Lower lip — slight smile curve */}
      <path d="M40 60 Q44 63 50 64 Q56 63 60 60" fill="#C0625A" opacity="0.35" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Cupid's bow */}
      <path d="M46 58 Q48 57 50 58 Q52 57 54 58" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.2" />
      {/* Lip shine */}
      <path d="M46 61 Q50 62 54 61" fill="none" stroke="#fff" strokeWidth={0.5} opacity="0.15" />
    </g>
  );
}

/** Thin lips — neutral/serious, straight, minimal */
function ThinLips() {
  return (
    <g>
      {/* Lip line — barely curved, thin */}
      <path d="M40 61 Q50 60.5 60 61" fill="none" stroke="#000" strokeWidth={1.8} strokeLinecap="round" />
      {/* Subtle lower lip shadow */}
      <path d="M42 63 Q50 64 58 63" fill="none" stroke="#000" strokeWidth={0.6} opacity="0.12" />
      {/* Corner marks */}
      <circle cx="40" cy="61.5" r="0.4" fill="#000" opacity="0.2" />
      <circle cx="60" cy="61.5" r="0.4" fill="#000" opacity="0.2" />
    </g>
  );
}

function None() { return <g />; }

/** Cute smile with two little vampire fangs (VIP). */
function Fangs() {
  return (
    <g>
      <path d="M37 59 Q50 68 63 59" fill="#7A1F2B" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M39 60 Q50 66 61 60" fill="#C0394B" opacity="0.6" />
      <path d="M43 60 L45 66 L47 60Z" fill="#fff" stroke="#000" strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M53 60 L55 66 L57 60Z" fill="#fff" stroke="#000" strokeWidth={0.8} strokeLinejoin="round" />
    </g>
  );
}

/** Tongue out, striped rainbow (VIP, funny). */
function RainbowTongue() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}rbtongue`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF1493" />
          <stop offset="50%" stopColor="#FFD93B" />
          <stop offset="100%" stopColor="#00FFE0" />
        </linearGradient>
      </defs>
      <path d="M38 59 Q50 67 62 59" fill="#7A1F2B" stroke="#000" strokeWidth={S} />
      <path d="M44 62 Q44 74 50 74 Q56 74 56 62Z" fill={`url(#${u}rbtongue)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M50 64 V72" stroke="#000" strokeWidth={0.8} opacity="0.3" />
    </g>
  );
}

/** Mechanical speaker-grille robot mouth (VIP). */
function RobotMouth() {
  return (
    <g>
      <rect x="40" y="56" width="20" height="9" rx="2" fill="#2A2A3E" stroke="#000" strokeWidth={S} />
      <path d="M43 58 V63 M47 58 V63 M51 58 V63 M55 58 V63 M59 58 V63" stroke="#00FFE0" strokeWidth={1.4} />
      <rect x="40" y="56" width="20" height="2" fill="#fff" opacity="0.15" />
    </g>
  );
}

/** Gold grillz with diamond accents (Epic). */
function Grillz() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}grillz`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF1A8" />
          <stop offset="100%" stopColor="#E0A000" />
        </linearGradient>
      </defs>
      <path d="M38 58 Q50 66 62 58 Q50 62 38 58Z" fill="#7A1F2B" stroke="#000" strokeWidth={S} />
      <rect x="40" y="58" width="20" height="6" rx="1" fill={`url(#${u}grillz)`} stroke="#000" strokeWidth={1} />
      <path d="M44 58 V64 M48 58 V64 M52 58 V64 M56 58 V64" stroke="#000" strokeWidth={0.6} opacity="0.4" />
      <path d="M46 60 l1 1.5 -1 1.5 -1 -1.5Z" fill="#fff" />
      <path d="M54 60 l1 1.5 -1 1.5 -1 -1.5Z" fill="#00FFE0" />
    </g>
  );
}

/** Glowing neon-outline smile (Epic). */
function NeonSmile() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}neonm`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00FFE0" />
          <stop offset="100%" stopColor="#FF1493" />
        </linearGradient>
      </defs>
      <path d="M36 59 Q50 71 64 59" fill="none" stroke={`url(#${u}neonm)`} strokeWidth={5} opacity="0.35" strokeLinecap="round" />
      <path d="M36 59 Q50 71 64 59" fill="none" stroke={`url(#${u}neonm)`} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="44" cy="63.5" r="1" fill="#fff" />
      <circle cx="50" cy="65" r="1" fill="#fff" />
      <circle cx="56" cy="63.5" r="1" fill="#fff" />
    </g>
  );
}

export const MOUTH_PARTS = {
  none: None,
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
  // 'pipe' (a tobacco smoking pipe) removed for Google Play "Designed for
  // Families" compliance. Kept in the schema enum so legacy saved configs still
  // validate, but it now renders a plain smile — no tobacco is ever depicted.
  pipe: Smile,
  dragon: Dragon,
  diamond: DiamondMouth,
  glitch: Glitch,
  frown: Frown,
  pout: Pout,
  bubbleGum: BubbleGum,
  buckTeeth: BuckTeeth,
  sideSmile: SideSmile,
  lipstick: Lipstick,
  lipGloss: LipGloss,
  closedSmile: ClosedSmile,
  thinLips: ThinLips,
  fangs: Fangs,
  rainbowTongue: RainbowTongue,
  robotMouth: RobotMouth,
  grillz: Grillz,
  neonSmile: NeonSmile,
} as const;

export type MouthPart = keyof typeof MOUTH_PARTS;
