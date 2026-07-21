/**
 * Premium base face shapes added in the avatar overhaul.
 * 100×100 viewBox; anchors match BaseParts.tsx.
 */

import { STROKE_OUTER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_OUTER;

interface BasePartProps {
  fill: string;
}

/** Star-shaped face with rounded rays and a soft inner glow. */
function StarBase({ fill }: BasePartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}starGlow`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M50 16 L56 34 L76 34 L60 46 L66 66 L50 54 L34 66 L40 46 L24 34 L44 34Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path
        d="M50 16 L56 34 L76 34 L60 46 L66 66 L50 54 L34 66 L40 46 L24 34 L44 34Z"
        fill={`url(#${u}starGlow)`}
      />
      {/* Ear bumps attached to lower rays */}
      <ellipse cx="18" cy="48" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="82" cy="48" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      {/* Soft cheek highlights */}
      <ellipse cx="36" cy="44" rx="5" ry="6" fill="#fff" opacity="0.1" />
      <ellipse cx="64" cy="44" rx="5" ry="6" fill="#fff" opacity="0.1" />
      {/* Chin glow */}
      <path d="M44 54 Q50 60 56 54" fill="#fff" opacity="0.08" />
    </g>
  );
}

/** Moon-shaped face with a gentle crescent profile and crater details. */
function MoonBase({ fill }: BasePartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}moonGlow`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M50 14 C72 14 84 34 80 56 C76 78 56 86 50 86 C44 86 24 78 20 56 C16 34 28 14 50 14Z"
        fill={fill}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path
        d="M50 14 C72 14 84 34 80 56 C76 78 56 86 50 86 C44 86 24 78 20 56 C16 34 28 14 50 14Z"
        fill={`url(#${u}moonGlow)`}
      />
      {/* Craters */}
      <circle cx="36" cy="38" r="4" fill="#000" opacity="0.08" />
      <circle cx="62" cy="34" r="3" fill="#000" opacity="0.08" />
      <circle cx="56" cy="58" r="5" fill="#000" opacity="0.08" />
      <circle cx="40" cy="62" r="2.5" fill="#000" opacity="0.06" />
      {/* Ear bumps */}
      <ellipse cx="18" cy="50" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      <ellipse cx="82" cy="50" rx="4" ry="5.5" fill={fill} stroke="#000" strokeWidth={2} />
      {/* Highlight arc */}
      <path d="M34 26 Q50 20 66 26" fill="none" stroke="#fff" strokeWidth={1.5} opacity="0.16" strokeLinecap="round" />
    </g>
  );
}

export const BASE_PARTS_PREMIUM = {
  starBase: StarBase,
  moonBase: MoonBase,
} as const;

export type PremiumBasePart = keyof typeof BASE_PARTS_PREMIUM;
