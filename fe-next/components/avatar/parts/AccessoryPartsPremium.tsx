/**
 * Premium overhaul accessories.
 */

import { STROKE_INNER, STROKE_OUTER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_INNER;
const SO = STROKE_OUTER;

interface AccessoryPartProps {
  fill: string;
}

function Earrings({ fill }: AccessoryPartProps) {
  return (
    <g>
      {/* Studs */}
      <circle cx="18" cy="54" r="3" fill={fill} stroke="#000" strokeWidth={S} />
      <circle cx="82" cy="54" r="3" fill={fill} stroke="#000" strokeWidth={S} />
      {/* Dangles */}
      <line x1="18" y1="57" x2="18" y2="68" stroke={fill} strokeWidth={1.5} />
      <line x1="82" y1="57" x2="82" y2="68" stroke={fill} strokeWidth={1.5} />
      <circle cx="18" cy="71" r="4" fill="#fff" stroke={fill} strokeWidth={1.5} />
      <circle cx="82" cy="71" r="4" fill="#fff" stroke={fill} strokeWidth={1.5} />
      <circle cx="17" cy="70" r="1.2" fill="#fff" opacity="0.6" />
      <circle cx="81" cy="70" r="1.2" fill="#fff" opacity="0.6" />
      {/* Sparkle */}
      <path d="M18 68 L18 69.5 M16.5 70 L18 70 M19.5 70 L18 70 M18 70.5 L18 72" stroke={fill} strokeWidth={0.8} />
      <path d="M82 68 L82 69.5 M80.5 70 L82 70 M83.5 70 L82 70 M82 70.5 L82 72" stroke={fill} strokeWidth={0.8} />
    </g>
  );
}

function Cape({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}capeGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d="M20 68 Q10 80 8 98 Q50 104 92 98 Q90 80 80 68 Q68 72 50 72 Q32 72 20 68Z"
        fill={`url(#${u}capeGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M20 68 Q50 76 80 68" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M14 84 Q50 90 86 84" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.12" />
      <circle cx="22" cy="70" r="2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="78" cy="70" r="2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
    </g>
  );
}

/** Back-layer: elegant feathered wings. */
function Wings({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#FFFFFF';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}wingsGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor={c} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {/* Left wing */}
      <path
        d="M24 42 Q4 28 2 50 Q0 72 20 68 Q12 60 12 50 Q12 40 24 42Z"
        fill={`url(#${u}wingsGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M22 46 Q10 40 8 52 M22 54 Q12 52 10 62" stroke="#000" strokeWidth={0.7} opacity="0.2" fill="none" />
      {/* Right wing */}
      <path
        d="M76 42 Q96 28 98 50 Q100 72 80 68 Q88 60 88 50 Q88 40 76 42Z"
        fill={`url(#${u}wingsGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M78 46 Q90 40 92 52 M78 54 Q88 52 90 62" stroke="#000" strokeWidth={0.7} opacity="0.2" fill="none" />
    </g>
  );
}

export const ACCESSORY_PARTS_PREMIUM = {
  earrings: Earrings,
  cape: Cape,
  wings: Wings,
} as const;

export type PremiumAccessoryPart = keyof typeof ACCESSORY_PARTS_PREMIUM;
