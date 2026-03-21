/**
 * Avatar Eyebrow Parts
 * Simple 2D stroke-based eyebrows positioned above the eye line.
 * Anchored at y≈34-36, matching eye positions (left cx=38, right cx=62).
 */

import { STROKE_INNER } from './avatarDesignConstants';

const S = STROKE_INNER;

interface EyebrowPartProps {
  fill: string;
}

function None() {
  return null;
}

/** Standard neutral eyebrows — gentle arch */
function Natural({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M33 36 Q38 33 43 35.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Thin arched eyebrows — refined look */
function Thin({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M33 35.5 Q38 33.5 43 35" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M57 35 Q62 33.5 67 35.5" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

/** Thick bold eyebrows — strong and expressive */
function Thick({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M32 36 Q38 32 44 35" fill="none" stroke={fill} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M56 35 Q62 32 68 36" fill="none" stroke={fill} strokeWidth={3.2} strokeLinecap="round" />
    </g>
  );
}

/** Angry/furrowed eyebrows — slanting inward */
function Angry({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M33 38 Q38 33 43 34" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 34 Q62 33 67 38" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Raised/surprised eyebrows — high arch */
function Raised({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M33 34 Q38 30 43 33" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 30 67 34" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Unibrow — connected across the bridge */
function Unibrow({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M32 36 Q38 32 50 34 Q62 32 68 36" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Flat straight eyebrows — serious/deadpan */
function Flat({ fill }: EyebrowPartProps) {
  return (
    <g>
      <line x1="33" y1="35" x2="43" y2="35" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <line x1="57" y1="35" x2="67" y2="35" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Worried eyebrows — inner ends raised */
function Worried({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M33 35 Q38 36 43 33" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 36 67 35" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Dramatic high arch — glamorous look */
function Arched({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M33 37 Q36 31 40 31 Q43 31 44 34" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M56 34 Q57 31 60 31 Q64 31 67 37" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Thick wild untamed eyebrows — multiple strokes for volume */
function Bushy({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M31 36 Q38 31 44 35" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M32 34.5 Q37 32 43 34" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <path d="M33 37.5 Q38 35 44 37" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
      <path d="M56 35 Q62 31 69 36" fill="none" stroke={fill} strokeWidth={3} strokeLinecap="round" />
      <path d="M57 34 Q63 32 68 34.5" fill="none" stroke={fill} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      <path d="M56 37 Q62 35 67 37.5" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
    </g>
  );
}

/** Normal brow with a visible scar gap in the left eyebrow */
function Scarred({ fill }: EyebrowPartProps) {
  return (
    <g>
      {/* Left brow split by scar gap */}
      <path d="M33 36 Q35.5 34 37 34.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M39.5 35 Q41.5 34.5 43 35.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      {/* Scar mark */}
      <line x1="37.8" y1="33" x2="38.8" y2="37" stroke={fill} strokeWidth={0.8} strokeLinecap="round" opacity={0.4} />
      {/* Right brow — normal */}
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Small neat trimmed eyebrows — shorter span */
function Short({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M35 35.5 Q38 34 41 35" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
      <path d="M59 35 Q62 34 65 35.5" fill="none" stroke={fill} strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Soft multi-stroke wispy natural look */
function Feathered({ fill }: EyebrowPartProps) {
  return (
    <g>
      {/* Left brow — wispy strokes */}
      <path d="M33 35.5 Q36 33.5 39 35" fill="none" stroke={fill} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M35 35 Q38 33 41 34.5" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      <path d="M37 35.5 Q40 34 43 35.5" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
      {/* Right brow — wispy strokes */}
      <path d="M57 35 Q60 33 63 34.5" fill="none" stroke={fill} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M59 34.5 Q62 33 65 35" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
      <path d="M61 35.5 Q64 34 67 35.5" fill="none" stroke={fill} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
    </g>
  );
}

/** Angry but with thick heavy strokes — very intense */
function AngryThick({ fill }: EyebrowPartProps) {
  return (
    <g>
      <path d="M32 39 Q37 32 44 33" fill="none" stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M56 33 Q63 32 68 39" fill="none" stroke={fill} strokeWidth={3.5} strokeLinecap="round" />
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
