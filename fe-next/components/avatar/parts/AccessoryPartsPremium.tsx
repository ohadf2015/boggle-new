/**
 * Premium overhaul accessories.
 * Soft glows + richer gradients so they read as paid tier vs free glasses/hats.
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_INNER;

interface AccessoryPartProps {
  fill: string;
}

function Earrings({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const gem = fill && fill !== '#000000' ? fill : '#FFD700';
  return (
    <g>
      <defs>
        <radialGradient id={`${u}earGem`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="45%" stopColor={gem} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
        <filter id={`${u}earGlow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Studs */}
      <circle cx="18" cy="54" r="3.2" fill={gem} stroke="#000" strokeWidth={S} filter={`url(#${u}earGlow)`} />
      <circle cx="82" cy="54" r="3.2" fill={gem} stroke="#000" strokeWidth={S} filter={`url(#${u}earGlow)`} />
      <circle cx="17" cy="53" r="1" fill="#fff" opacity="0.55" />
      <circle cx="81" cy="53" r="1" fill="#fff" opacity="0.55" />
      {/* Dangles */}
      <line x1="18" y1="57" x2="18" y2="68" stroke={gem} strokeWidth={1.6} />
      <line x1="82" y1="57" x2="82" y2="68" stroke={gem} strokeWidth={1.6} />
      <circle
        cx="18" cy="71" r="4.2"
        fill={`url(#${u}earGem)`}
        stroke="#000"
        strokeWidth={1.4}
        filter={`url(#${u}earGlow)`}
      />
      <circle
        cx="82" cy="71" r="4.2"
        fill={`url(#${u}earGem)`}
        stroke="#000"
        strokeWidth={1.4}
        filter={`url(#${u}earGlow)`}
      />
      <circle cx="17" cy="70" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="81" cy="70" r="1.2" fill="#fff" opacity="0.7" />
      {/* Sparkle */}
      <path d="M18 67.5 L18 69.5 M16.5 70 L18 70 M19.5 70 L18 70 M18 70.5 L18 72.5" stroke="#fff" strokeWidth={0.7} opacity="0.7" />
      <path d="M82 67.5 L82 69.5 M80.5 70 L82 70 M83.5 70 L82 70 M82 70.5 L82 72.5" stroke="#fff" strokeWidth={0.7} opacity="0.7" />
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
          <stop offset="55%" stopColor={fill} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${u}capeShine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M20 68 Q10 80 8 98 Q50 104 92 98 Q90 80 80 68 Q68 72 50 72 Q32 72 20 68Z"
        fill={`url(#${u}capeGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path
        d="M24 70 Q50 78 76 70 Q74 86 50 90 Q26 86 24 70Z"
        fill={`url(#${u}capeShine)`}
      />
      <path d="M20 68 Q50 76 80 68" fill="none" stroke="#000" strokeWidth={1} opacity="0.2" />
      <path d="M14 84 Q50 90 86 84" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" />
      {/* Clasps */}
      <circle cx="22" cy="70" r="2.2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="78" cy="70" r="2.2" fill="#FFD700" stroke="#000" strokeWidth={0.8} />
      <circle cx="21.5" cy="69.3" r="0.6" fill="#fff" opacity="0.55" />
      <circle cx="77.5" cy="69.3" r="0.6" fill="#fff" opacity="0.55" />
    </g>
  );
}

/** Back-layer: elegant feathered wings with soft outer glow. */
function Wings({ fill }: AccessoryPartProps) {
  const u = useAvatarUid();
  const c = fill && fill !== '#000000' ? fill : '#FFFFFF';
  return (
    <g>
      <defs>
        <linearGradient id={`${u}wingsGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor={c} stopOpacity="0.95" />
          <stop offset="100%" stopColor={c} stopOpacity="0.7" />
        </linearGradient>
        <filter id={`${u}wingsGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Soft halo behind wings */}
      <path
        d="M24 42 Q4 28 2 50 Q0 72 20 68 Q12 60 12 50 Q12 40 24 42Z"
        fill={c}
        opacity="0.2"
        filter={`url(#${u}wingsGlow)`}
      />
      <path
        d="M76 42 Q96 28 98 50 Q100 72 80 68 Q88 60 88 50 Q88 40 76 42Z"
        fill={c}
        opacity="0.2"
        filter={`url(#${u}wingsGlow)`}
      />
      {/* Left wing */}
      <path
        d="M24 42 Q4 28 2 50 Q0 72 20 68 Q12 60 12 50 Q12 40 24 42Z"
        fill={`url(#${u}wingsGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M22 46 Q10 40 8 52 M22 54 Q12 52 10 62" stroke="#000" strokeWidth={0.7} opacity="0.22" fill="none" />
      <path d="M18 44 Q10 38 8 48" stroke="#fff" strokeWidth={0.7} opacity="0.25" fill="none" />
      {/* Right wing */}
      <path
        d="M76 42 Q96 28 98 50 Q100 72 80 68 Q88 60 88 50 Q88 40 76 42Z"
        fill={`url(#${u}wingsGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M78 46 Q90 40 92 52 M78 54 Q88 52 90 62" stroke="#000" strokeWidth={0.7} opacity="0.22" fill="none" />
      <path d="M82 44 Q90 38 92 48" stroke="#fff" strokeWidth={0.7} opacity="0.25" fill="none" />
    </g>
  );
}

export const ACCESSORY_PARTS_PREMIUM = {
  earrings: Earrings,
  cape: Cape,
  wings: Wings,
} as const;

export type PremiumAccessoryPart = keyof typeof ACCESSORY_PARTS_PREMIUM;
