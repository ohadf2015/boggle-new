/**
 * Word Tower — tumble arcs for toppled floors (pure). Instead of vanishing
 * behind particles, a knocked-off block LAUNCHES toward the lean side, spins,
 * and falls off screen on a parabola. Deterministic per floor key so replays
 * look identical. Cosmetic only — floors are already gone from the game state.
 */

/** Total tumble flight time (ms). */
export const TUMBLE_MS = 900;
const GRAVITY_PX_PER_MS2 = 0.0022;
/** Fraction of the flight after which the block starts fading out. */
const FADE_START = 0.75;

export interface TumbleParams {
  dirX: -1 | 1;
  /** Horizontal launch velocity (px/ms, signed by dirX). */
  vx: number;
  /** Initial vertical velocity (px/ms, negative = up). */
  vy: number;
  /** Spin rate (deg/ms, signed by dirX). */
  spinDegPerMs: number;
}

/** FNV-1a — tiny stable hash for per-floor variation. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Launch parameters for one toppled floor — direction follows the lean. */
export function tumbleParams(floorKey: string, leanSign: number): TumbleParams {
  const h = hash(floorKey);
  const r1 = (h % 1000) / 1000;
  const r2 = ((h >>> 10) % 1000) / 1000;
  const dirX: -1 | 1 = leanSign < 0 ? -1 : 1;
  return {
    dirX,
    vx: (0.12 + 0.1 * r1) * dirX,
    vy: -(0.25 + 0.15 * r2),
    spinDegPerMs: (0.25 + 0.2 * r1) * dirX,
  };
}

/** Position/rotation/alpha of the tumbling block at `tMs` since launch. */
export function tumbleAt(
  p: TumbleParams,
  tMs: number,
): { dx: number; dy: number; rotDeg: number; alpha: number } {
  const t = Math.max(0, Math.min(TUMBLE_MS, tMs));
  const k = t / TUMBLE_MS;
  return {
    dx: p.vx * t,
    dy: p.vy * t + 0.5 * GRAVITY_PX_PER_MS2 * t * t,
    rotDeg: p.spinDegPerMs * t,
    alpha: k <= FADE_START ? 1 : 1 - (k - FADE_START) / (1 - FADE_START),
  };
}
