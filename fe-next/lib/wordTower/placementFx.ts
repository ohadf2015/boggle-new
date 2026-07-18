/**
 * Word Tower — placement FX intensity (pure, renderer-agnostic).
 *
 * Derives how punchy a letter landing should feel from how deep into the current
 * word it is, so building a longer word *escalates* (founder: placing more
 * letters felt flat). Kept pure so it is trivially unit-testable; the Pixi scene
 * consumes it to size particle bursts, the impact ring, and the audio pitch.
 */

export interface PlacementFx {
  /** Particle count for the impact puff. */
  particles: number;
  /** Scale multiplier for the expanding impact ring. */
  ringScale: number;
  /** Dust-puff particle count for the landing. */
  dustPuff: number;
  /** Tiny debris chips kicked out on later letters. */
  debris: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * `depth` is the 0-based index of the letter within the word currently being
 * built (0 = first letter after the anchor). Intensity rises with depth and
 * caps so a very long word never goes berserk.
 */
export function letterPlacementFx(depth: number): PlacementFx {
  const d = Math.max(0, Math.floor(depth));
  return {
    particles: clamp(7 + d * 2, 7, 22),
    ringScale: clamp(1 + d * 0.1, 1, 1.7),
    dustPuff: clamp(4 + d, 4, 14),
    debris: d >= 3 ? Math.min(4, d - 2) : 0,
  };
}

/**
 * Playback rate (pitch) for the per-letter spell tick — climbs with the
 * 0-based index of the letter being added so a growing word audibly escalates,
 * capped so a marathon word never chipmunks.
 */
export function letterTickRate(index: number): number {
  return clamp(1 + Math.max(0, index) * 0.07, 1, 1.6);
}
