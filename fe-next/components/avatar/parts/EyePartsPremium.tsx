/**
 * Premium overhaul eye designs.
 * All positioned at the standard eye line (cx≈38/62, cy≈42).
 * Visually distinct from free parts: radial iris depth, soft outer glow,
 * dual-layer speculars, and brand-palette accents.
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';
import { useEyeColor, useEyeColorDark } from '../AvatarEyeColorContext';
import { RimLight } from './sharedShading';

const S = STROKE_INNER;

function CatEye() {
  const iris = useEyeColor();
  const dark = useEyeColorDark();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}catIris`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="35%" stopColor={iris} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <filter id={`${u}catGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Soft outer glow — premium read */}
      <path d="M28 42 Q38 32 48 42 Q38 52 28 42Z" fill={iris} opacity="0.22" filter={`url(#${u}catGlow)`} />
      <path d="M52 42 Q62 32 72 42 Q62 52 52 42Z" fill={iris} opacity="0.22" filter={`url(#${u}catGlow)`} />
      <path d="M28 42 Q38 32 48 42 Q38 52 28 42Z" fill={`url(#${u}catIris)`} stroke="#000" strokeWidth={S} />
      <path d="M52 42 Q62 32 72 42 Q62 52 52 42Z" fill={`url(#${u}catIris)`} stroke="#000" strokeWidth={S} />
      <ellipse cx="38" cy="42" rx="3" ry="7" fill="#000" />
      <ellipse cx="62" cy="42" rx="3" ry="7" fill="#000" />
      <circle cx="40" cy="39" r="1.6" fill="#fff" />
      <circle cx="36" cy="44" r="0.7" fill="#fff" opacity="0.55" />
      <circle cx="64" cy="39" r="1.6" fill="#fff" />
      <circle cx="60" cy="44" r="0.7" fill="#fff" opacity="0.55" />
      {/* Eyeliner flick */}
      <path d="M28 42 L24 40 M72 42 L76 40" stroke="#000" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

function StarEye() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}starEyeGrad`} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFFDE7" />
          <stop offset="40%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF6D00" />
        </radialGradient>
        <filter id={`${u}starGlow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="38" cy="42" r="8.5" fill="#FFD700" opacity="0.2" filter={`url(#${u}starGlow)`} />
      <circle cx="62" cy="42" r="8.5" fill="#FFD700" opacity="0.2" filter={`url(#${u}starGlow)`} />
      <circle cx="38" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <path
        d="M38 35 L40 40 L45 40 L41 43 L42 48 L38 45 L34 48 L35 43 L31 40 L36 40Z"
        fill={`url(#${u}starEyeGrad)`}
        filter={`url(#${u}starGlow)`}
      />
      <path
        d="M62 35 L64 40 L69 40 L65 43 L66 48 L62 45 L58 48 L59 43 L55 40 L60 40Z"
        fill={`url(#${u}starEyeGrad)`}
        filter={`url(#${u}starGlow)`}
      />
      <circle cx="40" cy="39" r="1.3" fill="#fff" />
      <circle cx="64" cy="39" r="1.3" fill="#fff" />
      {/* Tiny sparkle dots */}
      <circle cx="33" cy="36" r="0.7" fill="#FFF9C4" opacity="0.85" />
      <circle cx="57" cy="36" r="0.7" fill="#FFF9C4" opacity="0.85" />
    </g>
  );
}

function HeartEye() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}heartGrad`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FF8AC9" />
          <stop offset="55%" stopColor="#FF1493" />
          <stop offset="100%" stopColor="#C2185B" />
        </radialGradient>
        <filter id={`${u}heartGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="38" cy="42" r="8" fill="#2A0A12" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#2A0A12" stroke="#000" strokeWidth={S} />
      <path
        d="M38 47 C32 42 32 37 38 37 C44 37 44 42 38 47Z"
        fill={`url(#${u}heartGrad)`}
        filter={`url(#${u}heartGlow)`}
      />
      <path
        d="M62 47 C56 42 56 37 62 37 C68 37 68 42 62 47Z"
        fill={`url(#${u}heartGrad)`}
        filter={`url(#${u}heartGlow)`}
      />
      <circle cx="40" cy="39" r="1.3" fill="#fff" />
      <circle cx="64" cy="39" r="1.3" fill="#fff" />
      <circle cx="36" cy="40" r="0.6" fill="#fff" opacity="0.5" />
      <circle cx="60" cy="40" r="0.6" fill="#fff" opacity="0.5" />
    </g>
  );
}

function DiamondEye() {
  const iris = useEyeColor();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}diamondEyeGrad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#E0F7FA" />
          <stop offset="100%" stopColor={iris} />
        </linearGradient>
        <filter id={`${u}diaGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        points="38,34 46,42 38,50 30,42"
        fill={`url(#${u}diamondEyeGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
        filter={`url(#${u}diaGlow)`}
      />
      <polygon
        points="62,34 70,42 62,50 54,42"
        fill={`url(#${u}diamondEyeGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
        filter={`url(#${u}diaGlow)`}
      />
      <polygon points="38,37 42,42 38,47 34,42" fill="#fff" opacity="0.65" />
      <polygon points="62,37 66,42 62,47 58,42" fill="#fff" opacity="0.65" />
      <line x1="34" y1="40" x2="42" y2="40" stroke="#fff" strokeWidth={0.5} opacity="0.45" />
      <line x1="58" y1="40" x2="66" y2="40" stroke="#fff" strokeWidth={0.5} opacity="0.45" />
      <circle cx="36" cy="39" r="1" fill="#fff" />
      <circle cx="60" cy="39" r="1" fill="#fff" />
    </g>
  );
}

function SleepyEye() {
  return (
    <g>
      <path d="M30 42 Q38 37 46 42" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M54 42 Q62 37 70 42" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="38" cy="45" r="2.2" fill="#000" />
      <circle cx="62" cy="45" r="2.2" fill="#000" />
      <circle cx="39" cy="44" r="0.7" fill="#fff" opacity="0.35" />
      <circle cx="63" cy="44" r="0.7" fill="#fff" opacity="0.35" />
      <path d="M32 46 Q38 48 44 46" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
      <path d="M56 46 Q62 48 68 46" fill="none" stroke="#000" strokeWidth={1} opacity="0.3" />
    </g>
  );
}

function LaserEye() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}laserGrad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF0000" />
          <stop offset="50%" stopColor="#FF6D00" />
          <stop offset="100%" stopColor="#FFEA00" />
        </linearGradient>
        <filter id={`${u}laserGlow`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="1.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="38" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <line
        x1="38" y1="42" x2="78" y2="42"
        stroke={`url(#${u}laserGrad)`}
        strokeWidth={3.2}
        strokeLinecap="round"
        filter={`url(#${u}laserGlow)`}
      >
        <animate attributeName="opacity" values="0.75;1;0.75" dur="1.1s" repeatCount="indefinite" />
      </line>
      <line
        x1="22" y1="42" x2="38" y2="42"
        stroke={`url(#${u}laserGrad)`}
        strokeWidth={3.2}
        strokeLinecap="round"
        filter={`url(#${u}laserGlow)`}
      >
        <animate attributeName="opacity" values="0.75;1;0.75" dur="1.1s" repeatCount="indefinite" />
      </line>
      <circle cx="38" cy="42" r="3.2" fill="#FFEA00" filter={`url(#${u}laserGlow)`} />
      <circle cx="62" cy="42" r="3.2" fill="#FFEA00" filter={`url(#${u}laserGlow)`} />
      <circle cx="38" cy="42" r="1.2" fill="#fff" />
      <circle cx="62" cy="42" r="1.2" fill="#fff" />
    </g>
  );
}

function AnimeEye() {
  const iris = useEyeColor();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}animeIris`} cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="35%" stopColor={iris} />
          <stop offset="100%" stopColor="#1A1A2E" />
        </radialGradient>
      </defs>
      <path d="M28 42 Q38 34 48 42 Q38 50 28 42Z" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M52 42 Q62 34 72 42 Q62 50 52 42Z" fill="#fff" stroke="#000" strokeWidth={S} />
      <ellipse cx="38" cy="42" rx="5.2" ry="6.2" fill={`url(#${u}animeIris)`} />
      <ellipse cx="62" cy="42" rx="5.2" ry="6.2" fill={`url(#${u}animeIris)`} />
      <circle cx="38" cy="42" r="2.5" fill="#000" />
      <circle cx="62" cy="42" r="2.5" fill="#000" />
      {/* Large anime highlights */}
      <circle cx="36" cy="39" r="2.6" fill="#fff" />
      <circle cx="34" cy="43" r="1.2" fill="#fff" opacity="0.75" />
      <circle cx="60" cy="39" r="2.6" fill="#fff" />
      <circle cx="58" cy="43" r="1.2" fill="#fff" opacity="0.75" />
      <RimLight cx={38} cy={42} radius={7} opacity={0.2} />
      <RimLight cx={62} cy={42} radius={7} opacity={0.2} />
      {/* Upper lash */}
      <path d="M28 42 Q38 32 48 42" fill="none" stroke="#000" strokeWidth={1.5} />
      <path d="M52 42 Q62 32 72 42" fill="none" stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function CyberEye() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}cyberGrad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#FF00FF" />
        </linearGradient>
        <filter id={`${u}cyberGlow`} x="-40%" y="-80%" width="180%" height="260%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="30" y="38" width="16" height="8" rx="2" fill="#0A0A1A" stroke="#000" strokeWidth={S} />
      <rect x="54" y="38" width="16" height="8" rx="2" fill="#0A0A1A" stroke="#000" strokeWidth={S} />
      <rect
        x="32" y="40" width="12" height="4" rx="1"
        fill={`url(#${u}cyberGrad)`}
        opacity="0.95"
        filter={`url(#${u}cyberGlow)`}
      >
        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <rect
        x="56" y="40" width="12" height="4" rx="1"
        fill={`url(#${u}cyberGrad)`}
        opacity="0.95"
        filter={`url(#${u}cyberGlow)`}
      >
        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite" />
      </rect>
      <line x1="30" y1="42" x2="26" y2="42" stroke="#00FFFF" strokeWidth={1.2} filter={`url(#${u}cyberGlow)`} />
      <line x1="70" y1="42" x2="74" y2="42" stroke="#00FFFF" strokeWidth={1.2} filter={`url(#${u}cyberGlow)`} />
      <circle cx="35" cy="40" r="1" fill="#fff" />
      <circle cx="59" cy="40" r="1" fill="#fff" />
    </g>
  );
}

function GemEye() {
  const iris = useEyeColor();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}gemGrad`} cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="28%" stopColor={iris} />
          <stop offset="100%" stopColor="#1A1A2E" />
        </radialGradient>
        <filter id={`${u}gemGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="38" cy="42" r="9" fill={iris} opacity="0.18" filter={`url(#${u}gemGlow)`} />
      <circle cx="62" cy="42" r="9" fill={iris} opacity="0.18" filter={`url(#${u}gemGlow)`} />
      <circle cx="38" cy="42" r="8" fill={`url(#${u}gemGrad)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill={`url(#${u}gemGrad)`} stroke="#000" strokeWidth={S} />
      <polygon points="38,36 41,42 38,48 35,42" fill="#fff" opacity="0.55" />
      <polygon points="62,36 65,42 62,48 59,42" fill="#fff" opacity="0.55" />
      <circle cx="40" cy="39" r="1.6" fill="#fff" />
      <circle cx="64" cy="39" r="1.6" fill="#fff" />
      <circle cx="35" cy="44" r="0.7" fill="#fff" opacity="0.45" />
      <circle cx="59" cy="44" r="0.7" fill="#fff" opacity="0.45" />
    </g>
  );
}

function MoonEye() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}moonSclera`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2A2A55" />
          <stop offset="100%" stopColor="#0E0E28" />
        </radialGradient>
        <filter id={`${u}moonGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="38" cy="42" r="8" fill={`url(#${u}moonSclera)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill={`url(#${u}moonSclera)`} stroke="#000" strokeWidth={S} />
      <path
        d="M42 42 A4 4 0 1 1 34 42 A4 4 0 1 1 42 42Z"
        fill="#E8E8FF"
        filter={`url(#${u}moonGlow)`}
      />
      <path d="M34 42 A4 4 0 1 1 42 42Z" fill="#1A1A3E" />
      <path
        d="M66 42 A4 4 0 1 1 58 42 A4 4 0 1 1 66 42Z"
        fill="#E8E8FF"
        filter={`url(#${u}moonGlow)`}
      />
      <path d="M58 42 A4 4 0 1 1 66 42Z" fill="#1A1A3E" />
      <circle cx="40" cy="39" r="1.2" fill="#fff" />
      <circle cx="64" cy="39" r="1.2" fill="#fff" />
      {/* Crater dots */}
      <circle cx="36" cy="40" r="0.6" fill="#A0A0C0" opacity="0.35" />
      <circle cx="60" cy="40" r="0.6" fill="#A0A0C0" opacity="0.35" />
    </g>
  );
}

export const EYE_PARTS_PREMIUM = {
  catEye: CatEye,
  starEye: StarEye,
  heartEye: HeartEye,
  diamondEye: DiamondEye,
  sleepyEye: SleepyEye,
  laserEye: LaserEye,
  animeEye: AnimeEye,
  cyberEye: CyberEye,
  gemEye: GemEye,
  moonEye: MoonEye,
} as const;

export type PremiumEyePart = keyof typeof EYE_PARTS_PREMIUM;
