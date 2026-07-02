/**
 * Word Tower — crane hang + fall geometry (pure).
 *
 * The old chrome hardcoded a 64px cable inside a 168px stage, so a 3-brick
 * girder's bottom (~202px) hung BELOW its own landing shadow (132px) and the
 * "fall" was a symbolic fixed 100px hop. This module makes the geometry honest:
 * the cable adapts to the girder height so the load always hangs with clear air
 * under it, and the fall distance is exactly the gap down to the shadow — the
 * girder lands ON the mark the player was shown, every word length.
 *
 * All Y values are measured from the TROLLEY WRAPPER top (where the carriage
 * starts), the same origin the component's transforms use.
 */

/** Total crane chrome height (px) — wrapper top offset + shadow + reticle room. */
export const CRANE_CHROME_H_PX = 280;
/** Where the landing shadow (and therefore the girder's landing line) sits. */
export const CRANE_SHADOW_Y_PX = 246;
/** Trolley carriage height (px) — the block the cable hangs from. */
export const CRANE_CARRIAGE_H_PX = 12;
/** Hook height (px) between cable end and girder top. */
export const CRANE_HOOK_H_PX = 12;

const CABLE_MIN_PX = 18;
const CABLE_MAX_PX = 64;
/** The girder never hangs closer to the shadow than this — the fall stays readable. */
const MIN_FALL_PX = 44;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Cable length for a girder `beamH` px tall: as long as possible (a lazy, real
 * crane drape) while keeping ≥ {@link MIN_FALL_PX} of air above the shadow.
 */
export function craneCableLenPx(beamH: number): number {
  const free = CRANE_SHADOW_Y_PX - MIN_FALL_PX - CRANE_CARRIAGE_H_PX - CRANE_HOOK_H_PX - Math.max(0, beamH);
  return Math.round(clamp(free, CABLE_MIN_PX, CABLE_MAX_PX));
}

/** Bottom edge of the hanging girder (px from wrapper top). */
export function craneBeamBottomPx(beamH: number): number {
  return CRANE_CARRIAGE_H_PX + craneCableLenPx(beamH) + CRANE_HOOK_H_PX + Math.max(0, beamH);
}

/** Fall distance so the girder's bottom lands EXACTLY on the shadow line. */
export function craneFallPx(beamH: number): number {
  return CRANE_SHADOW_Y_PX - craneBeamBottomPx(beamH);
}

/**
 * Swing arm (px) from the pendulum joint (top of the cable) to the girder's
 * CENTRE — converts the pendulum angle into the load's horizontal displacement.
 */
export function craneArmPx(beamH: number): number {
  return craneCableLenPx(beamH) + CRANE_HOOK_H_PX + Math.max(0, beamH) / 2;
}
