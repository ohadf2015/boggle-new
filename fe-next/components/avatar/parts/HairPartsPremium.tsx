/**
 * Premium overhaul hair designs.
 * Back-layer components render the main hair volume; front-layer components render
 * bangs/framing strands on top of the face.
 */

import { HairPartProps, S } from './hairShared';
import { useAvatarUid } from '../AvatarUidContext';

function LongFlowBack({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}longFlowGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path
        d="M18 36 Q14 70 22 88 Q34 94 42 86 Q46 92 50 92 Q54 92 58 86 Q66 94 78 88 Q86 70 82 36 Q78 10 50 10 Q22 10 18 36Z"
        fill={`url(#${u}longFlowGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M22 40 Q18 70 26 86" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M78 40 Q82 70 74 86" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M30 20 Q50 14 70 20" fill="none" stroke="#fff" strokeWidth={1} opacity="0.12" strokeLinecap="round" />
    </g>
  );
}

function LongFlowFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M10 32 Q8 40 10 46 Q14 48 18 44 Q20 38 16 32 Q12 30 10 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M90 32 Q92 40 90 46 Q86 48 82 44 Q80 38 84 32 Q88 30 90 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M24 28 Q36 24 50 24 Q64 24 76 28" fill="none" stroke="#000" strokeWidth={1.2} opacity="0.2" />
      <path d="M12 36 L13 42 M88 36 L87 42" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
    </g>
  );
}

function TwinTailsBack({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}twinTailGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Top head cap */}
      <path d="M24 34 Q30 16 50 14 Q70 16 76 34" fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Left tail */}
      <path d="M26 30 Q10 34 8 56 Q6 78 18 90 Q26 84 22 68 Q24 50 30 36Z" fill={`url(#${u}twinTailGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Right tail */}
      <path d="M74 30 Q90 34 92 56 Q94 78 82 90 Q74 84 78 68 Q76 50 70 36Z" fill={`url(#${u}twinTailGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Hair ties */}
      <rect x="24" y="32" width="8" height="5" rx="1" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <rect x="68" y="32" width="8" height="5" rx="1" fill="#FF1493" stroke="#000" strokeWidth={1} />
      <path d="M34 18 Q50 14 66 18" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.14" strokeLinecap="round" />
    </g>
  );
}

function TwinTailsFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M20 32 Q28 22 42 24 Q50 18 58 24 Q72 22 80 32 Q72 34 64 32 Q56 34 50 30 Q44 34 36 32 Q28 34 20 32Z"
        fill={fill} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 24 L36 32 M64 24 L64 32" stroke="#000" strokeWidth={0.5} opacity="0.1" />
      <path d="M44 22 Q50 18 56 22" fill="none" stroke="#fff" strokeWidth={0.6} opacity="0.12" />
    </g>
  );
}

function BobCutBack({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}bobCutGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M14 36 Q14 72 26 84 Q38 90 50 88 Q62 90 74 84 Q86 72 86 36 Q82 12 50 12 Q18 12 14 36Z"
        fill={`url(#${u}bobCutGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 40 Q16 68 26 80" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M82 40 Q84 68 74 80" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M30 18 Q50 12 70 18" fill="none" stroke="#fff" strokeWidth={1} opacity="0.14" strokeLinecap="round" />
    </g>
  );
}

function BobCutFront({ fill }: HairPartProps) {
  return (
    <g>
      <path d="M9 32 Q6 42 10 48 Q14 50 18 46 Q20 40 16 32 Q12 30 9 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M91 32 Q94 42 90 48 Q86 50 82 46 Q80 40 84 32 Q88 30 91 32Z" fill={fill} stroke="#000" strokeWidth={2} strokeLinejoin="round" />
      <path d="M44 28 C48 24 52 24 56 28" fill={fill} stroke="#000" strokeWidth={1.5} opacity="0.3" />
      <path d="M11 36 L12 42 M89 36 L88 42" stroke="#fff" strokeWidth={0.7} opacity="0.12" />
    </g>
  );
}

function Pompadour({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}pompGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="40%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path
        d="M16 40 Q14 24 32 16 Q50 6 68 16 Q86 24 84 40 Q78 38 72 40 Q62 36 50 36 Q38 36 28 40 Q22 38 16 40Z"
        fill={`url(#${u}pompGrad)`}
        stroke="#000"
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <path d="M22 32 Q36 20 50 18 Q64 20 78 32" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.15" />
      <path d="M30 20 Q50 10 70 20" fill="none" stroke="#fff" strokeWidth={1} opacity="0.18" strokeLinecap="round" />
      <path d="M18 38 L14 46 Q18 48 22 44Z" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M82 38 L86 46 Q82 48 78 44Z" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

function SlickBack({ fill }: HairPartProps) {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}slickBackGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="40%" stopColor={fill} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path d="M14 38 Q16 18 36 14 Q50 8 64 14 Q84 18 86 38 Q78 34 70 36 Q60 32 50 32 Q40 32 30 36 Q22 34 14 38Z"
        fill={`url(#${u}slickBackGrad)`} stroke="#000" strokeWidth={S} strokeLinejoin="round" />
      {/* Slick comb lines */}
      <path d="M24 28 Q36 18 50 16 Q64 18 76 28" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.2" />
      <path d="M28 24 Q40 14 50 12 Q60 14 72 24" fill="none" stroke="#fff" strokeWidth={0.8} opacity="0.16" />
      <path d="M30 20 L34 32 M40 18 L44 32 M50 16 L54 32 M60 18 L64 32 M70 20 L66 32"
        stroke="#000" strokeWidth={0.5} opacity="0.1" />
      {/* Sideburns */}
      <path d="M16 36 L14 46 Q16 48 20 46 L20 38Z" fill={fill} stroke="#000" strokeWidth={1.5} />
      <path d="M84 36 L86 46 Q84 48 80 46 L80 38Z" fill={fill} stroke="#000" strokeWidth={1.5} />
    </g>
  );
}

export const HAIR_PARTS_PREMIUM = {
  longFlow: LongFlowBack,
  twinTails: TwinTailsBack,
  bobCut: BobCutBack,
  pompadour: Pompadour,
  slickBack: SlickBack,
} as const;

export const HAIR_FRONT_PARTS_PREMIUM = {
  longFlow: LongFlowFront,
  twinTails: TwinTailsFront,
  bobCut: BobCutFront,
} as const;
