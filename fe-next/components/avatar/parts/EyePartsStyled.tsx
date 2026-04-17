/**
 * Avatar Eye Parts — Styled
 * Makeup/style variants: cool, lashes, monocleEye, crossEyed, catPupils, wingedLiner, smokyEye
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';
import { useEyeColor, useEyeColorDark } from '../AvatarEyeColorContext';

const S = STROKE_INNER;

export function Cool() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}coolLensGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a4e" />
          <stop offset="100%" stopColor="#0a0a18" />
        </linearGradient>
      </defs>
      <path d="M44 40 Q50 43 56 40" stroke="#000" strokeWidth={2} fill="none" strokeLinecap="round" />
      <rect x="29" y="37" width="16" height="10" rx="3" fill={`url(#${u}coolLensGrad)`} stroke="#000" strokeWidth={S} />
      <rect x="55" y="37" width="16" height="10" rx="3" fill={`url(#${u}coolLensGrad)`} stroke="#000" strokeWidth={S} />
      <line x1="32" y1="39.5" x2="37" y2="39.5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity="0.5" />
      <line x1="58" y1="39.5" x2="63" y2="39.5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity="0.5" />
      <line x1="32" y1="41.5" x2="34" y2="41.5" stroke="#fff" strokeWidth={1} strokeLinecap="round" opacity="0.25" />
      <line x1="58" y1="41.5" x2="60" y2="41.5" stroke="#fff" strokeWidth={1} strokeLinecap="round" opacity="0.25" />
    </g>
  );
}

export function Lashes() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  void ec; void ecd;
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

export function MonocleEye() {
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

export function CrossEyed() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  void ecd;
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="42" cy="42" r="3" fill={ec} />
      <circle cx="58" cy="42" r="3" fill={ec} />
      <circle cx="42" cy="42" r="1.8" fill="#000" />
      <circle cx="58" cy="42" r="1.8" fill="#000" />
      <circle cx="41" cy="40.5" r="0.9" fill="#fff" />
      <circle cx="57" cy="40.5" r="0.9" fill="#fff" />
    </g>
  );
}

export function CatPupils() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  void ec; void ecd;
  return (
    <g>
      <circle cx="38" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M33 40 Q38 37.5 43 40" fill="#000" opacity="0.06" />
      <path d="M57 40 Q62 37.5 67 40" fill="#000" opacity="0.06" />
      <circle cx="38" cy="42" r="3.5" fill="#D4A017" />
      <circle cx="62" cy="42" r="3.5" fill="#D4A017" />
      <circle cx="38" cy="42" r="3.5" fill="none" stroke="#8B6914" strokeWidth={0.6} opacity="0.5" />
      <circle cx="62" cy="42" r="3.5" fill="none" stroke="#8B6914" strokeWidth={0.6} opacity="0.5" />
      <ellipse cx="38" cy="42" rx="1" ry="3.2" fill="#000" />
      <ellipse cx="62" cy="42" rx="1" ry="3.2" fill="#000" />
      <circle cx="36.5" cy="40" r="1" fill="#fff" />
      <circle cx="60.5" cy="40" r="1" fill="#fff" />
      <circle cx="39" cy="43.5" r="0.4" fill="#fff" opacity="0.5" />
      <circle cx="63" cy="43.5" r="0.4" fill="#fff" opacity="0.5" />
    </g>
  );
}

export function WingedLiner() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  void ecd;
  return (
    <g>
      <ellipse cx="38" cy="42" rx="6" ry="4.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M32 40 Q38 36 44 40" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M44 40 L48 35 L46 39" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1} />
      <circle cx="39" cy="42" r="3" fill={ec} />
      <circle cx="39" cy="42" r="1.8" fill="#000" />
      <circle cx="37.5" cy="40.5" r="1" fill="#fff" />
      <ellipse cx="62" cy="42" rx="6" ry="4.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M56 40 Q62 36 68 40" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M68 40 L72 35 L70 39" fill="#1a1a2e" stroke="#1a1a2e" strokeWidth={1} />
      <circle cx="63" cy="42" r="3" fill={ec} />
      <circle cx="63" cy="42" r="1.8" fill="#000" />
      <circle cx="61.5" cy="40.5" r="1" fill="#fff" />
      <path d="M34 44 Q38 46 42 44" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
      <path d="M58 44 Q62 46 66 44" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.3" />
    </g>
  );
}

export function SmokyEye() {
  return (
    <g>
      <ellipse cx="38" cy="42" rx="9" ry="6" fill="#2D1B4E" opacity="0.25" />
      <ellipse cx="62" cy="42" rx="9" ry="6" fill="#2D1B4E" opacity="0.25" />
      <ellipse cx="38" cy="41" rx="7.5" ry="5" fill="#4A2D6E" opacity="0.2" />
      <ellipse cx="62" cy="41" rx="7.5" ry="5" fill="#4A2D6E" opacity="0.2" />
      <ellipse cx="38" cy="42" rx="5.5" ry="4" fill="#fff" stroke="#2D1B4E" strokeWidth={S} />
      <ellipse cx="62" cy="42" rx="5.5" ry="4" fill="#fff" stroke="#2D1B4E" strokeWidth={S} />
      <path d="M32.5 40 Q38 36.5 43.5 40" fill="none" stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" />
      <path d="M56.5 40 Q62 36.5 67.5 40" fill="none" stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx="39" cy="42" r="3" fill="#3A5A6A" />
      <circle cx="63" cy="42" r="3" fill="#3A5A6A" />
      <circle cx="39" cy="42" r="1.8" fill="#000" />
      <circle cx="63" cy="42" r="1.8" fill="#000" />
      <circle cx="37.5" cy="40.5" r="1" fill="#fff" />
      <circle cx="61.5" cy="40.5" r="1" fill="#fff" />
      <circle cx="40" cy="43" r="0.4" fill="#fff" opacity="0.5" />
      <circle cx="64" cy="43" r="0.4" fill="#fff" opacity="0.5" />
    </g>
  );
}
