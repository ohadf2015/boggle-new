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
export const CRANE_CHROME_H_PX = 350;
/**
 * Landing shadow Y from the TROLLEY WRAPPER top (px). Pure hang/fall math uses
 * this origin — see {@link craneFallPx}.
 *
 * Raised 246 → 316 so the crane rides well above the tower crown and the drop
 * has real distance to travel.
 *
 * The ceiling on this number is hard: `playChromeFrame` pins the shadow to the
 * build line by subtracting the whole outer offset from `buildLineY` and clamps
 * at 0, so overshooting would pin the crane at screen top on short phones and
 * leave the landing mark BELOW the tower crown. The headroom for the second
 * jump came from deleting the stability meter (32px) and its flex gap (12px) —
 * both were pure chrome above the crane. At 316 the ideal top stays ≥ 0 down to
 * a ~665px viewport (iPhone SE), which is the realistic floor.
 *
 * The rest of the fall distance is bought from the cable and girder below,
 * which costs nothing at all.
 */
export const CRANE_SHADOW_Y_PX = 316;
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
/** Flex gap between the crane chrome and any sibling above it. Now 0: the
 *  stability meter that used to sit there is gone, and a flex `gap` with a
 *  single child contributes nothing — leaving it at 12 would have pushed the
 *  landing shadow 12px below the build line it is supposed to pin to. */
export const CRANE_OUTER_GAP_PX = 0;
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

/** Shortest cable drape (px). */
export const CABLE_DRAPE_MIN_PX = 14;
/**
 * Longest cable drape (px).
 *
 * This used to be 64, and {@link craneCableLenPx} paid out AS MUCH cable as it
 * could — "a lazy, real crane drape" — subject only to keeping 44px of air under
 * the girder. The consequence was the thing the founder actually saw: the load
 * hung all the way down at the tower crown and the "drop" was a ~50px hop you
 * could not follow. A real tower crane hoists its load HIGH and lowers it under
 * control; holding it just below the jib is both truer and buys ~90px of free
 * fall distance without touching the build line, camera, or verdict math.
 */
export const CABLE_DRAPE_MAX_PX = 30;
/** The girder never hangs closer to the shadow than this — the fall stays
 *  readable at every word length (was 44px, which read as a hop, not a fall). */
export const MIN_FALL_PX = 140;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Cable length for a girder `beamH` px tall: a SHORT drape holding the load up
 * under the jib. Long girders get the shortest drape so their extra height eats
 * into the hang rather than the fall — the drop distance stays watchable no
 * matter how long the word is.
 */
export function craneCableLenPx(beamH: number): number {
  // Air we can afford to spend on cable while still clearing MIN_FALL_PX.
  const free = CRANE_SHADOW_Y_PX - MIN_FALL_PX - CRANE_CARRIAGE_H_PX - CRANE_HOOK_H_PX - Math.max(0, beamH);
  return Math.round(clamp(free, CABLE_DRAPE_MIN_PX, CABLE_DRAPE_MAX_PX));
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
