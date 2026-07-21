/**
 * Premium overhaul eye designs.
 * All positioned at the standard eye line (cx≈38/62, cy≈42).
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';
import { useEyeColor, useEyeColorDark } from '../AvatarEyeColorContext';

const S = STROKE_INNER;

function CatEye() {
  const iris = useEyeColor();
  const dark = useEyeColorDark();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}catIris`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={iris} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
      </defs>
      <path d="M28 42 Q38 32 48 42 Q38 52 28 42Z" fill={`url(#${u}catIris)`} stroke="#000" strokeWidth={S} />
      <path d="M52 42 Q62 32 72 42 Q62 52 52 42Z" fill={`url(#${u}catIris)`} stroke="#000" strokeWidth={S} />
      <ellipse cx="38" cy="42" rx="3" ry="7" fill="#000" />
      <ellipse cx="62" cy="42" rx="3" ry="7" fill="#000" />
      <circle cx="40" cy="39" r="1.5" fill="#fff" />
      <circle cx="64" cy="39" r="1.5" fill="#fff" />
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
        <radialGradient id={`${u}starEyeGrad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF8C00" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <path d="M38 35 L40 40 L45 40 L41 43 L42 48 L38 45 L34 48 L35 43 L31 40 L36 40Z" fill={`url(#${u}starEyeGrad)`} />
      <path d="M62 35 L64 40 L69 40 L65 43 L66 48 L62 45 L58 48 L59 43 L55 40 L60 40Z" fill={`url(#${u}starEyeGrad)`} />
      <circle cx="40" cy="39" r="1.2" fill="#fff" />
      <circle cx="64" cy="39" r="1.2" fill="#fff" />
    </g>
  );
}

function HeartEye() {
  return (
    <g>
      <circle cx="38" cy="42" r="8" fill="#2A0A12" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#2A0A12" stroke="#000" strokeWidth={S} />
      <path d="M38 47 C32 42 32 37 38 37 C44 37 44 42 38 47Z" fill="#FF1493" />
      <path d="M62 47 C56 42 56 37 62 37 C68 37 68 42 62 47Z" fill="#FF1493" />
      <circle cx="40" cy="39" r="1.2" fill="#fff" />
      <circle cx="64" cy="39" r="1.2" fill="#fff" />
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
          <stop offset="0%" stopColor="#E0F7FA" />
          <stop offset="100%" stopColor={iris} />
        </linearGradient>
      </defs>
      <polygon points="38,34 46,42 38,50 30,42" fill={`url(#${u}diamondEyeGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <polygon points="62,34 70,42 62,50 54,42" fill={`url(#${u}diamondEyeGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <polygon points="38,37 42,42 38,47 34,42" fill="#fff" opacity="0.6" />
      <polygon points="62,37 66,42 62,47 58,42" fill="#fff" opacity="0.6" />
      <circle cx="36" cy="40" r="1" fill="#fff" />
      <circle cx="60" cy="40" r="1" fill="#fff" />
    </g>
  );
}

function SleepyEye() {
  return (
    <g>
      <path d="M30 42 Q38 37 46 42" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M54 42 Q62 37 70 42" fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="38" cy="45" r="2" fill="#000" />
      <circle cx="62" cy="45" r="2" fill="#000" />
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
          <stop offset="100%" stopColor="#FFEA00" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#1A1A2E" stroke="#000" strokeWidth={S} />
      <line x1="38" y1="42" x2="78" y2="42" stroke={`url(#${u}laserGrad)`} strokeWidth={3} strokeLinecap="round">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.2s" repeatCount="indefinite" />
      </line>
      <line x1="22" y1="42" x2="38" y2="42" stroke={`url(#${u}laserGrad)`} strokeWidth={3} strokeLinecap="round">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="1.2s" repeatCount="indefinite" />
      </line>
      <circle cx="38" cy="42" r="3" fill="#FFEA00" />
      <circle cx="62" cy="42" r="3" fill="#FFEA00" />
    </g>
  );
}

function AnimeEye() {
  const iris = useEyeColor();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}animeIris`} cx="50%" cy="50%" r="55%">
          <stop offset="40%" stopColor={iris} />
          <stop offset="100%" stopColor="#1A1A2E" />
        </radialGradient>
      </defs>
      <path d="M28 42 Q38 34 48 42 Q38 50 28 42Z" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M52 42 Q62 34 72 42 Q62 50 52 42Z" fill="#fff" stroke="#000" strokeWidth={S} />
      <ellipse cx="38" cy="42" rx="5" ry="6" fill={`url(#${u}animeIris)`} />
      <ellipse cx="62" cy="42" rx="5" ry="6" fill={`url(#${u}animeIris)`} />
      <circle cx="38" cy="42" r="2.5" fill="#000" />
      <circle cx="62" cy="42" r="2.5" fill="#000" />
      {/* Large anime highlights */}
      <circle cx="36" cy="39" r="2.5" fill="#fff" />
      <circle cx="34" cy="43" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="60" cy="39" r="2.5" fill="#fff" />
      <circle cx="58" cy="43" r="1.2" fill="#fff" opacity="0.7" />
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
          <stop offset="100%" stopColor="#FF00FF" />
        </linearGradient>
      </defs>
      <rect x="30" y="38" width="16" height="8" rx="2" fill="#0A0A1A" stroke="#000" strokeWidth={S} />
      <rect x="54" y="38" width="16" height="8" rx="2" fill="#0A0A1A" stroke="#000" strokeWidth={S} />
      <rect x="32" y="40" width="12" height="4" rx="1" fill={`url(#${u}cyberGrad)`} opacity="0.9" />
      <rect x="56" y="40" width="12" height="4" rx="1" fill={`url(#${u}cyberGrad)`} opacity="0.9" />
      <line x1="30" y1="42" x2="26" y2="42" stroke="#00FFFF" strokeWidth={1} />
      <line x1="70" y1="42" x2="74" y2="42" stroke="#00FFFF" strokeWidth={1} />
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
        <radialGradient id={`${u}gemGrad`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="30%" stopColor={iris} />
          <stop offset="100%" stopColor="#1A1A2E" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="42" r="8" fill={`url(#${u}gemGrad)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill={`url(#${u}gemGrad)`} stroke="#000" strokeWidth={S} />
      <polygon points="38,36 41,42 38,48 35,42" fill="#fff" opacity="0.5" />
      <polygon points="62,36 65,42 62,48 59,42" fill="#fff" opacity="0.5" />
      <circle cx="40" cy="39" r="1.5" fill="#fff" />
      <circle cx="64" cy="39" r="1.5" fill="#fff" />
    </g>
  );
}

function MoonEye() {
  return (
    <g>
      <circle cx="38" cy="42" r="8" fill="#1A1A3E" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="8" fill="#1A1A3E" stroke="#000" strokeWidth={S} />
      <path d="M42 42 A4 4 0 1 1 34 42 A4 4 0 1 1 42 42Z" fill="#C0C0E0" />
      <path d="M34 42 A4 4 0 1 1 42 42Z" fill="#1A1A3E" />
      <path d="M66 42 A4 4 0 1 1 58 42 A4 4 0 1 1 66 42Z" fill="#C0C0E0" />
      <path d="M58 42 A4 4 0 1 1 66 42Z" fill="#1A1A3E" />
      <circle cx="40" cy="39" r="1.2" fill="#fff" />
      <circle cx="64" cy="39" r="1.2" fill="#fff" />
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
