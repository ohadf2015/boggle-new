/**
 * Crane release feedback (pure, renderer-agnostic).
 *
 * Answers "did I let go in the RIGHT place?" with escalating positive feedback:
 * a PERFECT release pops a full sparkle burst + glow; a GOOD one a small spark;
 * a sloppy/miss gets nothing (the verdict banner already carries the bad news).
 * Kept pure so the crane component stays presentational and this is unit-tested.
 */

import type { PlacementQuality } from './cranePlacement';

export interface ReleaseFx {
  /** Show the celebratory burst overlay at all. */
  celebrate: boolean;
  /** Number of sparkle particles to scatter (0 when not celebrating). */
  sparkles: number;
  /** Wrap the landed girder in a bright accent glow (perfect only). */
  glow: boolean;
}

export function releaseFx(quality: PlacementQuality): ReleaseFx {
  switch (quality) {
    case 'perfect':
      return { celebrate: true, sparkles: 14, glow: true };
    case 'good':
      return { celebrate: true, sparkles: 6, glow: false };
    default:
      return { celebrate: false, sparkles: 0, glow: false };
  }
}
