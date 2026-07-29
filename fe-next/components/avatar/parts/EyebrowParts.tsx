/**
 * Avatar Eyebrow Parts
 * Simple 2D stroke-based eyebrows positioned above the eye line.
 * Anchored at y≈34-36, matching eye positions (left cx=38, right cx=62).
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';

const S = STROKE_INNER;

interface EyebrowPartProps {
  fill: string;
}

/**
 * Shared shimmer gradient: horizontal userSpaceOnUse across brow span (30..70),
 * white stopOpacity fades 0.45 → 0 → 0.45. Overlaid as duplicate stroke paths
 * so base fill-color stays authoritative.
 */
function BrowShimmerDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="30" y1="34" x2="70" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fff" stopOpacity="0" />
        <stop offset="25%" stopColor="#fff" stopOpacity="0.45" />
        <stop offset="50%" stopColor="#fff" stopOpacity="0" />
        <stop offset="75%" stopColor="#fff" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

function None() {
  return null;
}

/** Standard neutral eyebrows — gentle arch */
function Natural({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-natural`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M33 36 Q38 33 43 35.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 36 Q38 33 43 35.5" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Thin arched eyebrows — refined look */
function Thin({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-thin`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M33 35.5 Q38 33.5 43 35" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M57 35 Q62 33.5 67 35.5" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M33 35.5 Q38 33.5 43 35" fill="none" stroke={ref} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M57 35 Q62 33.5 67 35.5" fill="none" stroke={ref} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

/** Thick bold eyebrows — strong and expressive */
function Thick({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-thick`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M32 36 Q38 32 44 35" fill="none" stroke={fill} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M56 35 Q62 32 68 36" fill="none" stroke={fill} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M32 36 Q38 32 44 35" fill="none" stroke={ref} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M56 35 Q62 32 68 36" fill="none" stroke={ref} strokeWidth={3.2} strokeLinecap="round" />
    </g>
  );
}

/** Angry/furrowed eyebrows — slanting inward */
function Angry({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-angry`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M33 38 Q38 33 43 34" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 34 Q62 33 67 38" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 38 Q38 33 43 34" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 34 Q62 33 67 38" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Raised/surprised eyebrows — high arch */
function Raised({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-raised`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M33 34 Q38 30 43 33" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 30 67 34" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 34 Q38 30 43 33" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 30 67 34" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Unibrow — connected across the bridge */
function Unibrow({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-unibrow`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M32 36 Q38 32 50 34 Q62 32 68 36" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M32 36 Q38 32 50 34 Q62 32 68 36" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Flat straight eyebrows — serious/deadpan */
function Flat({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-flat`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <line x1="33" y1="35" x2="43" y2="35" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <line x1="57" y1="35" x2="67" y2="35" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <line x1="33" y1="35" x2="43" y2="35" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <line x1="57" y1="35" x2="67" y2="35" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Worried eyebrows — inner ends raised */
function Worried({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-worried`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M33 35 Q38 36 43 33" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 36 67 35" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 35 Q38 36 43 33" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 36 67 35" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Dramatic high arch — glamorous look */
function Arched({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-arched`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M33 37 Q36 31 40 31 Q43 31 44 34" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M56 34 Q57 31 60 31 Q64 31 67 37" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 37 Q36 31 40 31 Q43 31 44 34" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M56 34 Q57 31 60 31 Q64 31 67 37" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Thick wild untamed eyebrows — multiple strokes for volume */
function Bushy({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-bushy`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M31 36 Q38 31 44 35" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M32 34.5 Q37 32 43 34" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <path d="M33 37.5 Q38 35 44 37" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
      <path d="M56 35 Q62 31 69 36" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M57 34 Q63 32 68 34.5" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <path d="M56 37 Q62 35 67 37.5" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
      <path d="M31 36 Q38 31 44 35" fill="none" stroke={ref} strokeWidth={3} strokeLinecap="round" />
      <path d="M56 35 Q62 31 69 36" fill="none" stroke={ref} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** Normal brow with a visible scar gap in the left eyebrow */
function Scarred({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-scarred`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      {/* Left brow split by scar gap */}
      <path d="M33 36 Q35.5 34 37 34.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M39.5 35 Q41.5 34.5 43 35.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      {/* Scar mark */}
      <line x1="37.8" y1="33" x2="38.8" y2="37" stroke={fill} strokeWidth={0.8} strokeLinecap="round" opacity={0.4} />
      {/* Right brow — normal */}
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M33 36 Q35.5 34 37 34.5" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M39.5 35 Q41.5 34.5 43 35.5" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Small neat trimmed eyebrows — shorter span */
function Short({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-short`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M35 35.5 Q38 34 41 35" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M59 35 Q62 34 65 35.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M35 35.5 Q38 34 41 35" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
      <path d="M59 35 Q62 34 65 35.5" fill="none" stroke={ref} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Soft multi-stroke wispy natural look */
function Feathered({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-feathered`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      {/* Left brow — wispy strokes */}
      <path d="M33 35.5 Q36 33.5 39 35" fill="none" stroke={fill} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M35 35 Q38 33 41 34.5" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      <path d="M37 35.5 Q40 34 43 35.5" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      {/* Right brow — wispy strokes */}
      <path d="M57 35 Q60 33 63 34.5" fill="none" stroke={fill} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M59 34.5 Q62 33 65 35" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      <path d="M61 35.5 Q64 34 67 35.5" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      <path d="M33 35.5 Q36 33.5 39 35" fill="none" stroke={ref} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M57 35 Q60 33 63 34.5" fill="none" stroke={ref} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

/** Angry but with thick heavy strokes — very intense */
function AngryThick({ fill }: EyebrowPartProps) {
  const u = useAvatarUid();
  const id = `${u}browShim-angryThick`;
  const ref = `url(#${id})`;
  return (
    <g>
      <BrowShimmerDefs id={id} />
      <path d="M32 39 Q37 32 44 33" fill="none" stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M56 33 Q63 32 68 39" fill="none" stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M32 39 Q37 32 44 33" fill="none" stroke={ref} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M56 33 Q63 32 68 39" fill="none" stroke={ref} strokeWidth={3.5} strokeLinecap="round" />
    </g>
  );
}

export const EYEBROW_PARTS = {
  none: None,
  natural: Natural,
  thin: Thin,
  thick: Thick,
  angry: Angry,
  raised: Raised,
  unibrow: Unibrow,
  flat: Flat,
  worried: Worried,
  arched: Arched,
  bushy: Bushy,
  scarred: Scarred,
  short: Short,
  feathered: Feathered,
  angryThick: AngryThick,
} as const;

export type EyebrowPart = keyof typeof EYEBROW_PARTS;
