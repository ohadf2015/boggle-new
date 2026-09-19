/**
 * Crane swing — pure kinematics.
 *
 * Imports only the gravity constant. The swing is a closed-form function of
 * time, so a release at t is reproducible on any device and in any test, and
 * the velocity handed to the physics world carries no frame-rate history.
 */
import { GRAVITY_PX_PER_MS2 } from './engine';

/** Distance from the crane pivot to the block, in physics pixels. */
export const CRANE_ARM_PX = 220;

/**
 * How far above the tower top the hanging block rides, physics pixels. Was 230:
 * a tall dead band of sky between hook and tower that read as wasted screen.
 */
export const CRANE_CLEARANCE_PX = 180;

export interface CraneSwing {
  /** Peak swing angle from vertical, radians. */
  amplitudeRad: number;
  /** Time for one full there-and-back swing, ms. */
  periodMs: number;
  /** Phase offset, radians — lets a run start mid-swing. */
  phase: number;
}

/**
 * The one swing every run uses. 0.38 -> 0.5 in round 5: slabs grew ~40% wider,
 * and at 0.38 the landing never left a 5-letter slab — every tap scored. Width of a block versus the landing sweep is
 * the real difficulty dial — see feel.test.ts, which pins it in ms.
 */
export const SWING: CraneSwing = { amplitudeRad: 0.5, periodMs: 2600, phase: 0 };

export interface CraneState {
  angleRad: number;
  angularVelRadPerMs: number;
}

/**
 * Fraction of the crane's angular speed the hook hands to the block. Well under
 * 1: a hook mostly holds orientation and releases a small residual. This is the
 * knob that decides how tilted a block arrives and therefore how long it rocks.
 *
 * Sized so a block released mid-swing lands around 10-15 degrees off level. Turn
 * it up far enough (~2.6) and blocks tumble through 100+ degrees in flight and
 * land on their sides, which never settles flat at all.
 */
export const SPIN_TRANSFER = 0.45;

export interface ReleaseKinematics {
  x: number;
  vx: number;
  vy: number;
  /** Spin handed to the block at release, radians per millisecond. */
  spin: number;
}

/**
 * Simple harmonic motion. A real pendulum is only harmonic for small angles, but
 * a harmonic swing is what reads as "crane" to a player and it stays invertible
 * and cheap. ponytail: closed form, not integrated — no state to desync.
 */
export function craneStateAt(tMs: number, swing: CraneSwing): CraneState {
  const omega = (Math.PI * 2) / swing.periodMs;
  const theta = omega * tMs + swing.phase;

  return {
    angleRad: swing.amplitudeRad * Math.sin(theta),
    angularVelRadPerMs: swing.amplitudeRad * omega * Math.cos(theta),
  };
}

/**
 * Where the block is and how fast it is moving sideways at the instant of
 * release. Vertical velocity is deliberately zero: gravity alone owns the
 * release->contact window, which is one of the tuned feel targets.
 */
export function releaseKinematics(
  tMs: number,
  swing: CraneSwing,
  pivotX: number,
): ReleaseKinematics {
  const { angleRad, angularVelRadPerMs } = craneStateAt(tMs, swing);

  return {
    x: pivotX + CRANE_ARM_PX * Math.sin(angleRad),
    // d/dt [ arm * sin(theta) ] = arm * cos(theta) * dtheta/dt
    vx: CRANE_ARM_PX * Math.cos(angleRad) * angularVelRadPerMs,
    vy: 0,
    spin: angularVelRadPerMs * SPIN_TRANSFER,
  };
}

/**
 * Matter's default per-step air drag (`frictionAir` 0.01 at its 16.67ms base
 * step), as a continuous time constant: v(t) = v0 * e^(-t / tau).
 */
const AIR_DRAG_TAU_MS = (1000 / 60) / -Math.log(1 - 0.01);

/** Sideways drift (px) after `tMs` of flight, for a release at `vx` px/ms. */
function driftPx(vx: number, tMs: number): number {
  return vx * AIR_DRAG_TAU_MS * (1 - Math.exp(-tMs / AIR_DRAG_TAU_MS));
}

/** Time for a released block (vy = 0) to fall `dropPx`, ms. */
export function fallTimeMs(dropPx: number, gravity = GRAVITY_PX_PER_MS2): number {
  return Math.sqrt((2 * Math.max(0, dropPx)) / gravity);
}

/**
 * Where a block released at `x` with `vx` touches down `dropPx` below. Drives
 * the landing footprint: round 2 drew only 40% of the arc, so every drop landed
 * well past where the guide pointed — which read as "impossible to align".
 */
export function predictLandingX(x: number, vx: number, dropPx: number): number {
  return x + driftPx(vx, fallTimeMs(dropPx));
}

/**
 * Points along a released block's path: gravity down, the swing's sideways
 * speed decaying under air drag. Drives the dotted throw arc, which replaced a
 * straight "drop guide" that lied — a block released mid-swing never falls
 * straight down.
 */
export function throwArc(opts: {
  x: number;
  y: number;
  /** px per ms. */
  vx: number;
  /** px per ms^2. */
  gravity: number;
  durationMs: number;
  points: number;
}): Array<{ x: number; y: number }> {
  const { x, y, vx, gravity, durationMs, points } = opts;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points; i += 1) {
    const t = (durationMs * i) / Math.max(1, points - 1);
    out.push({
      x: x + driftPx(vx, t),
      y: y + 0.5 * gravity * t * t,
    });
  }
  return out;
}
