/**
 * Word Tower — upper-shaft wind (pure).
 *
 * A tall tower should feel exposed and alive at the top even between drops: the
 * crown sways in the "wind" while the base stays rock-solid. This returns a tiny
 * signed horizontal offset (px) for a tile, given its position in the stack and
 * the absolute clock — a slow travelling wave up the column, so the shaft whips
 * coherently rather than each tile jittering independently.
 *
 * Strictly cosmetic: the crane reads the BASE for placement, so a swaying crown
 * never changes where a word lands. Magnitude is sub-pixel-to-2px; only the top
 * band moves; the base third is exactly 0. Callers gate on reduced-motion (just
 * don't apply the offset) and skip pending/mid-commit tiles.
 */

/** Peak horizontal offset (px) at the very top, full instability. */
export const SHAFT_WIND_MAX_PX = 2.2;
/** Wave period (ms) — a slow, floaty drift, not a shake. */
export const SHAFT_WIND_PERIOD_MS = 2600;
/** Below this height fraction (pos/topPos) the shaft is dead-steady. */
export const SHAFT_WIND_BAND = 0.6;
/** Idle sway present even on a perfectly stable tower (fraction of full amp). */
export const SHAFT_WIND_IDLE = 0.45;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Signed horizontal wind offset (px) for the tile at `pos` (0 = base) in a stack
 * whose top tile is `topPos`, at absolute time `nowMs`. `instability` (0..1)
 * scales the amplitude above the always-present idle sway. Returns 0 for the
 * base band and for degenerate towers.
 */
export function shaftWindX(pos: number, topPos: number, nowMs: number, instability = 0): number {
  if (topPos <= 0) return 0;
  const frac = clamp01(pos / topPos);
  if (frac < SHAFT_WIND_BAND) return 0;
  // 0 at the band floor → 1 at the crown; squared so the very top whips most.
  const bandT = (frac - SHAFT_WIND_BAND) / (1 - SHAFT_WIND_BAND);
  const heightGain = bandT * bandT;
  const instGain = SHAFT_WIND_IDLE + (1 - SHAFT_WIND_IDLE) * clamp01(instability);
  const amp = SHAFT_WIND_MAX_PX * heightGain * instGain;
  // Phase lags with height → the wave visibly travels up the shaft.
  const phase = (2 * Math.PI * nowMs) / SHAFT_WIND_PERIOD_MS - frac * Math.PI * 1.2;
  return amp * Math.sin(phase);
}
