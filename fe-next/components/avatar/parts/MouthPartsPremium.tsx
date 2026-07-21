/**
 * Premium overhaul mouth designs.
 * Positioned around the standard mouth line y≈58-62.
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';
import { LipShine } from './sharedShading';

const S = STROKE_INNER;

function OpenLaugh() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}laughInner`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#9A2A3A" />
          <stop offset="100%" stopColor="#4A0000" />
        </radialGradient>
        <linearGradient id={`${u}laughTeeth`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#F0F0E8" />
        </linearGradient>
      </defs>
      <path d="M35 58 Q50 72 65 58 Q50 68 35 58Z" fill={`url(#${u}laughInner)`} stroke="#000" strokeWidth={S} strokeLinecap="round" />
      {/* Teeth */}
      <path d="M38 59 Q50 63 62 59" fill={`url(#${u}laughTeeth)`} stroke="#000" strokeWidth={1} />
      <line x1="43" y1="59" x2="43" y2="63" stroke="#000" strokeWidth={0.6} />
      <line x1="50" y1="60" x2="50" y2="64" stroke="#000" strokeWidth={0.6} />
      <line x1="57" y1="59" x2="57" y2="63" stroke="#000" strokeWidth={0.6} />
      {/* Tongue */}
      <ellipse cx="50" cy="67" rx="5" ry="3" fill="#FF6B6B" opacity="0.85" />
      <path d="M48 66 Q50 69 52 66" fill="none" stroke="#CC4444" strokeWidth={0.6} />
      <LipShine cx={50} cy={58} w={24} />
      {/* Cheek creases */}
      <path d="M33 58 Q30 56 30 59" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
      <path d="M67 58 Q70 56 70 59" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.25" />
    </g>
  );
}

function Grimace() {
  return (
    <g>
      <rect x="38" y="56" width="24" height="11" rx="3" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="38" y1="60" x2="62" y2="60" stroke="#000" strokeWidth={0.8} />
      <line x1="38" y1="64" x2="62" y2="64" stroke="#000" strokeWidth={0.8} />
      <line x1="43" y1="56" x2="43" y2="67" stroke="#000" strokeWidth={0.7} />
      <line x1="50" y1="56" x2="50" y2="67" stroke="#000" strokeWidth={0.7} />
      <line x1="57" y1="56" x2="57" y2="67" stroke="#000" strokeWidth={0.7} />
      <path d="M40 58 Q42 59 44 58" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.3" />
      <path d="M56 58 Q58 59 60 58" fill="none" stroke="#000" strokeWidth={0.5} opacity="0.3" />
    </g>
  );
}

function TongueOut() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}tongueGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9999" />
          <stop offset="100%" stopColor="#FF1493" />
        </linearGradient>
      </defs>
      <path d="M38 58 Q50 66 62 58" fill="#7A1F2B" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M44 62 Q44 76 50 76 Q56 76 56 62Z" fill={`url(#${u}tongueGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <line x1="50" y1="64" x2="50" y2="74" stroke="#CC0066" strokeWidth={0.8} opacity="0.5" />
      <ellipse cx="47" cy="66" rx="1.5" ry="1" fill="#fff" opacity="0.4" />
      <path d="M40 60 Q45 62 50 60" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.3" />
    </g>
  );
}

function Zen() {
  return (
    <g>
      {/* Calm smiling lips with a lotus-like curve */}
      <path d="M37 60 Q50 70 63 60" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M39 61 Q50 68 61 61" fill="#E85D75" opacity="0.35" />
      <path d="M42 60 Q50 64 58 60" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.4" strokeLinecap="round" />
      {/* Small meditative bindu dot */}
      <circle cx="50" cy="56" r="1.2" fill="#8B5CF6" opacity="0.6" />
      {/* Subtle blush marks */}
      <ellipse cx="35" cy="62" rx="2" ry="1" fill="#FF6B6B" opacity="0.2" />
      <ellipse cx="65" cy="62" rx="2" ry="1" fill="#FF6B6B" opacity="0.2" />
    </g>
  );
}

function ToothyGrind() {
  return (
    <g>
      <rect x="38" y="56" width="24" height="9" rx="2" fill="#fff" stroke="#000" strokeWidth={S} />
      <line x1="38" y1="60.5" x2="62" y2="60.5" stroke="#000" strokeWidth={0.8} />
      <line x1="43" y1="56" x2="43" y2="65" stroke="#000" strokeWidth={0.7} />
      <line x1="50" y1="56" x2="50" y2="65" stroke="#000" strokeWidth={0.7} />
      <line x1="57" y1="56" x2="57" y2="65" stroke="#000" strokeWidth={0.7} />
      {/* Angry tension lines */}
      <path d="M34 56 L38 58" stroke="#000" strokeWidth={1} opacity="0.3" strokeLinecap="round" />
      <path d="M66 56 L62 58" stroke="#000" strokeWidth={1} opacity="0.3" strokeLinecap="round" />
      <path d="M36 53 L40 55" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
      <path d="M64 53 L60 55" stroke="#000" strokeWidth={0.8} opacity="0.2" strokeLinecap="round" />
    </g>
  );
}

export const MOUTH_PARTS_PREMIUM = {
  openLaugh: OpenLaugh,
  grimace: Grimace,
  tongueOut: TongueOut,
  zen: Zen,
  toothyGrind: ToothyGrind,
} as const;

export type PremiumMouthPart = keyof typeof MOUTH_PARTS_PREMIUM;
