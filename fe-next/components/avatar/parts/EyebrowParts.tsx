/**
 * Avatar Eyebrow Parts
 * Simple 2D stroke-based eyebrows positioned above the eye line.
 * Anchored at y≈34-36, matching eye positions (left cx=38, right cx=62).
 */

import { STROKE_INNER } from './avatarDesignConstants';

const S = STROKE_INNER;

function None() {
  return null;
}

/** Standard neutral eyebrows — gentle arch */
function Natural() {
  return (
    <g>
      <path d="M33 36 Q38 33 43 35.5" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 35.5 Q62 33 67 36" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Thin arched eyebrows — refined look */
function Thin() {
  return (
    <g>
      <path d="M33 35.5 Q38 33.5 43 35" fill="none" stroke="#000" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M57 35 Q62 33.5 67 35.5" fill="none" stroke="#000" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

/** Thick bold eyebrows — strong and expressive */
function Thick() {
  return (
    <g>
      <path d="M32 36 Q38 32 44 35" fill="none" stroke="#000" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M56 35 Q62 32 68 36" fill="none" stroke="#000" strokeWidth={3.2} strokeLinecap="round" />
    </g>
  );
}

/** Angry/furrowed eyebrows — slanting inward */
function Angry() {
  return (
    <g>
      <path d="M33 38 Q38 33 43 34" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 34 Q62 33 67 38" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Raised/surprised eyebrows — high arch */
function Raised() {
  return (
    <g>
      <path d="M33 34 Q38 30 43 33" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 30 67 34" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Unibrow — connected across the bridge */
function Unibrow() {
  return (
    <g>
      <path d="M32 36 Q38 32 50 34 Q62 32 68 36" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Flat straight eyebrows — serious/deadpan */
function Flat() {
  return (
    <g>
      <line x1="33" y1="35" x2="43" y2="35" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <line x1="57" y1="35" x2="67" y2="35" stroke="#000" strokeWidth={S} strokeLinecap="round" />
    </g>
  );
}

/** Worried eyebrows — inner ends raised */
function Worried() {
  return (
    <g>
      <path d="M33 35 Q38 36 43 33" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <path d="M57 33 Q62 36 67 35" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
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
} as const;

export type EyebrowPart = keyof typeof EYEBROW_PARTS;
