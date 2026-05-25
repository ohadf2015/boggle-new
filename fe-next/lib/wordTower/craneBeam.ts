/**
 * Word Tower — held crane "beam" width (pure).
 *
 * The crane carries the just-built word as a horizontal beam. Beam width
 * scales with word length so the visual cue matches the construction
 * payload — short words are stubby planks, long words read as girders.
 * Clamped both ends so the beam never goes invisible nor overflows the
 * crane bay.
 */

export const BEAM_MIN_PX = 96;
export const BEAM_MAX_PX = 240;
const PX_PER_CHAR = 22;
/** Words shorter than this still get the minimum (no growth below it). */
const MIN_LEN_BEFORE_GROWTH = 3;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function beamWidthFor(wordLen: number): number {
  const grow = Math.max(0, wordLen - MIN_LEN_BEFORE_GROWTH);
  return clamp(BEAM_MIN_PX + grow * PX_PER_CHAR, BEAM_MIN_PX, BEAM_MAX_PX);
}
