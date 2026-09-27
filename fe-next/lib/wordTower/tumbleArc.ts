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
/** Time of the ground bounce (as a fraction of total flight). */
const BOUNCE_AT_K = 0.55;
/** Velocity retained after the bounce (restitution). */
const BOUNCE_REST = 0.45;

export interface TumbleParams {
  dirX: -1 | 1;
  /** Horizontal launch velocity (px/ms, signed by dirX). */
  vx: number;
  /** Initial vertical velocity (px/ms, negative = up). */
  vy: number;
  /** Spin rate (deg/ms, signed by dirX). */
  spinDegPerMs: number;
  /** When true, the arc includes one ground bounce. */
  bounces?: boolean;
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

/** Launch parameters with a single ground bounce for extra collapse drama. */
export function tumbleBounceParams(floorKey: string, leanSign: number): TumbleParams {
  return { ...tumbleParams(floorKey, leanSign), bounces: true };
}

/** Position/rotation/alpha of the tumbling block at `tMs` since launch. */
export function tumbleAt(
  p: TumbleParams,
  tMs: number,
): { dx: number; dy: number; rotDeg: number; alpha: number } {
  const t = Math.max(0, Math.min(TUMBLE_MS, tMs));
  const k = t / TUMBLE_MS;

  let dx: number;
  let dy: number;

  if (p.bounces) {
    const tBounce = BOUNCE_AT_K * TUMBLE_MS;
    const vx = p.vx;
    if (t <= tBounce) {
      // First arc: launch up, come down to "ground".
      dx = vx * t;
      dy = p.vy * t + 0.5 * GRAVITY_PX_PER_MS2 * t * t;
    } else {
      // Bounce arc: position at bounce, velocity reversed and scaled.
      const xB = vx * tBounce;
      const yB = p.vy * tBounce + 0.5 * GRAVITY_PX_PER_MS2 * tBounce * tBounce;
      const vyAfter = -(p.vy + GRAVITY_PX_PER_MS2 * tBounce) * BOUNCE_REST;
      const dt = t - tBounce;
      dx = xB + vx * dt;
      dy = yB + vyAfter * dt + 0.5 * GRAVITY_PX_PER_MS2 * dt * dt;
    }
  } else {
    dx = p.vx * t;
    dy = p.vy * t + 0.5 * GRAVITY_PX_PER_MS2 * t * t;
  }

  return {
    dx,
    dy,
    rotDeg: p.spinDegPerMs * t,
    alpha: k <= FADE_START ? 1 : 1 - (k - FADE_START) / (1 - FADE_START),
  };
}
