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
/**
 * Landing shadow Y from the TROLLEY WRAPPER top (px). Pure hang/fall math uses
 * this origin — see {@link craneFallPx}.
 */
export const CRANE_SHADOW_Y_PX = 246;
/** Trolley carriage height (px) — the block the cable hangs from. */
export const CRANE_CARRIAGE_H_PX = 12;
/** Hook height (px) between cable end and girder top. */
export const CRANE_HOOK_H_PX = 12;

// ── Outer overlay → shadow screen path (must match WordTowerCrane DOM) ──
// outer top
//   + stability meter (variable height)
//   + flex gap-3 (12px)
//   + chrome
//       + trolley wrapper top-[20px]
//       + shadow top: CRANE_SHADOW_Y_PX - 4  (visual nudge to ellipse centre)
/** Flex gap between stability meter and chrome (`gap-3`). */
export const CRANE_OUTER_GAP_PX = 12;
/** Trolley sweep wrapper offset from chrome top (`top-[20px]`). */
export const CRANE_TROLLEY_TOP_PX = 20;
/** Shadow is drawn 4px above the pure hang line so the ellipse centre reads as the mark. */
export const CRANE_SHADOW_VISUAL_NUDGE_PX = 4;

/**
 * Screen-Y of the landing shadow relative to the outer crane overlay top.
 * Encodes the real WordTowerCrane DOM path so playChromeFrame can pin the
 * shadow on the shared build line (not a simplified chrome-only model).
 */
export function craneShadowOffsetFromOuterTop(meterHPx: number): number {
  return (
    Math.max(0, meterHPx) +
    CRANE_OUTER_GAP_PX +
    CRANE_TROLLEY_TOP_PX +
    CRANE_SHADOW_Y_PX -
    CRANE_SHADOW_VISUAL_NUDGE_PX
  );
}

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
