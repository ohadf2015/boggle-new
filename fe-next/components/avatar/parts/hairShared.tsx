/** Shared helpers for Hair parts — viewBox 0 0 100 100. Face: cx=50 cy=52 r=30. */
import { type FC } from 'react';

import { STROKE_OUTER } from './avatarDesignConstants';

export const S = STROKE_OUTER;

export interface HairPartProps {
  fill: string;
  /** Secondary color for bows/ties/beads — defaults to fill if not provided */
  accentColor?: string;
}

/**
 * Color-agnostic faux-3D polish: black-fade shade at bottom + white-fade
 * rim-light at top. Works with ANY base fill because stops use #000/#fff
 * with opacity, not the hair color itself. Apply as two overlay paths
 * (same silhouette as the main cap) above the base fill.
 */
export function HairPolishDefs({ uid, keyName }: { uid: string; keyName: string }) {
  return (
    <>
      <linearGradient id={`${uid}hair-${keyName}-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="60%" stopColor="#000" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
      </linearGradient>
      <linearGradient id={`${uid}hair-${keyName}-light`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
        <stop offset="45%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </>
  );
}

/**
 * Apply shade+light overlays onto a path silhouette (same d as main cap).
 * Requires matching <HairPolishDefs uid keyName /> inside <defs>.
 */
export function HairPolish({ uid, keyName, d }: { uid: string; keyName: string; d: string }) {
  return (
    <>
      <path d={d} fill={`url(#${uid}hair-${keyName}-shade)`} stroke="none" />
      <path d={d} fill={`url(#${uid}hair-${keyName}-light)`} stroke="none" />
    </>
  );
}

export const None: FC<HairPartProps> = function None() {
  return null;
};
