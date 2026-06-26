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
/** Exponential weight per step further back (lower = recent weights MORE).
 *  Lowered 0.7→0.50 so a good drop recovers the lean noticeably faster — the
 *  tower returns toward centre in 2-3 clean drops instead of 4-5. Founder
 *  2026-06-26: "tower stays on the side when drop isn't good, should be
 *  around the center." */
const RECENT_WEIGHT_DECAY = 0.50;

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

/**
 * Pull the rolling lean window toward upright by `resetMult` (≥1). Each stored
 * offset is divided by the multiplier, so the recent-weighted average — and thus
 * the visible lean — shrinks toward 0. A clean drop already nudges the tower
 * straighter (it appends a ~centred offset); this lets the Quick Recovery upgrade
 * make that straightening visibly FASTER. `resetMult` of 1 is a no-op (returns a
 * copy unchanged) so the base game is untouched.
 */
export function relaxLean(offsets: readonly number[], resetMult: number): number[] {
  if (!(resetMult > 1)) return [...offsets];
  return offsets.map((o) => o / resetMult);
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
