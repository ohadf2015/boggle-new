/**
 * Word Tower — visible-instability lean (pure).
 *
 * Each crane drop contributes a signed horizontal offset (−1 = full-left,
 * +1 = full-right). The tower's apparent lean is a recent-weighted average of
 * the last few offsets, scaled to a small degree range so it always reads as
 * "look how wobbly this is getting" rather than catastrophic.
 *
 * Pure / renderer-agnostic so the scene's Pixi container.angle and any future
 * DOM minimap can both consume it.
 */

/** Most-recent N drops considered for the lean calculation. */
export const LEAN_HISTORY_MAX = 8;
/** Cap on the apparent lean — 4° reads as drunk, not broken. */
export const LEAN_MAX_DEG = 4;
/** Exponential weight per step further back (lower = recent weights MORE). */
const RECENT_WEIGHT_DECAY = 0.7;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Append a signed offset to the rolling window, evicting the oldest. */
export function pushLeanOffset(prev: readonly number[], signedOffset: number): number[] {
  const clamped = clamp(signedOffset, -1, 1);
  const next = prev.length >= LEAN_HISTORY_MAX ? [...prev.slice(1), clamped] : [...prev, clamped];
  return next;
}

/**
 * Weighted-average lean angle in degrees. The most recent offset weighs
 * most; older ones decay geometrically. Result is clamped to ±LEAN_MAX_DEG.
 */
export function leanFromOffsets(offsets: readonly number[]): number {
  if (offsets.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  // Walk newest→oldest applying the decay
  for (let i = offsets.length - 1, age = 0; i >= 0; i--, age++) {
    const w = Math.pow(RECENT_WEIGHT_DECAY, age);
    weightedSum += offsets[i] * w;
    weightTotal += w;
  }
  const avg = weightTotal === 0 ? 0 : weightedSum / weightTotal;
  // avg is already in [-1,1]; scale to degrees
  return clamp(avg * LEAN_MAX_DEG, -LEAN_MAX_DEG, LEAN_MAX_DEG);
}

/** Lean magnitude (deg) at/above which a clean drop counts as a NEAR MISS — the
 *  tower looked dangerously drunk (≥75% of the cap) but didn't topple. Drives
 *  the near-miss FX bump in WordTowerPlay. */
export const NEAR_MISS_LEAN_DEG = LEAN_MAX_DEG * 0.75;

/** True when the current visible lean is in the critical near-miss band — used
 *  to fire the "phew, barely held" celebration without an actual topple. */
export function isNearMiss(leanDeg: number): boolean {
  return Math.abs(leanDeg) >= NEAR_MISS_LEAN_DEG;
}
