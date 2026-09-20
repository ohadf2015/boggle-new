/**
 * Where a body-level relic overlay goes.
 *
 * The rail owns TWO overlays that must stay whole on a 390px phone and in
 * Hebrew: the detail bubble (`RelicTooltip`) and the trigger callout
 * (`RelicFireCallout`). Round 3 had the bubble's clamp written inline; a second
 * near-identical clamp beside it is exactly how two paths that should behave
 * identically drift apart, so both now come through here.
 */
export const OVERLAY_GUTTER = 8;

export interface Rect { left: number; top: number; width: number; height: number }
export interface Box { width: number; height: number }
export interface Spot { left: number; top: number; flipped: boolean }

const centreOf = (r: Rect) => r.left + r.width / 2;

/**
 * Centre `width` on `centre`, then pull it back inside the screen — and inside
 * `within`, when one is given and the box fits there. `within` is how the
 * callout stays inside the run bar on a 1920px TV: clamp only to the viewport
 * and the panel drifts off the bar's edge onto the backdrop, reading as a stray
 * label rather than part of the HUD.
 */
export function clampX(
  centre: number,
  width: number,
  vpWidth: number,
  gutter = OVERLAY_GUTTER,
  within?: { left: number; width: number },
): number {
  let lo = gutter;
  let hi = Math.max(gutter, vpWidth - width - gutter);
  if (within && within.width >= width) {
    lo = Math.max(lo, within.left);
    hi = Math.min(hi, within.left + within.width - width);
    if (hi < lo) hi = lo;
  }
  return Math.min(Math.max(lo, centre - width / 2), hi);
}

/** Keep `height` on screen, preferring `preferred`. */
export function clampY(preferred: number, height: number, vpHeight: number, gutter = OVERLAY_GUTTER): number {
  const max = Math.max(gutter, vpHeight - height - gutter);
  return Math.min(Math.max(gutter, preferred), max);
}

/**
 * Park the trigger callout directly under the relic rail, centred on the chips
 * that actually fired — the callout must point AT its cause, so it tracks the
 * firing chips, not the rail's midpoint. It flips above the rail only when the
 * rail is so low that below would push it off screen.
 */
export function calloutSpot(
  host: Rect,
  chips: readonly Rect[],
  box: Box,
  vp: { width: number; height: number },
  gap = 6,
  gutter = OVERLAY_GUTTER,
): Spot {
  const centre = chips.length
    ? chips.reduce((s, c) => s + centreOf(c), 0) / chips.length
    : centreOf(host);
  const below = host.top + host.height + gap;
  const above = host.top - gap - box.height;
  const flipped = below + box.height > vp.height - gutter && above > gutter;
  return {
    left: clampX(centre, box.width, vp.width, gutter, host),
    top: flipped ? above : clampY(below, box.height, vp.height, gutter),
    flipped,
  };
}

/**
 * The connector between one firing chip and the callout: the "this relic did
 * that" line. Null when the two already touch — a zero-length line is noise.
 */
export function trailRect(chip: Rect, spot: Spot, box: Box): { left: number; top: number; height: number } | null {
  const left = centreOf(chip);
  const chipBottom = chip.top + chip.height;
  if (!spot.flipped) {
    const height = spot.top - chipBottom;
    return height > 0 ? { left, top: chipBottom, height } : null;
  }
  const boxBottom = spot.top + box.height;
  const height = chip.top - boxBottom;
  return height > 0 ? { left, top: boxBottom, height } : null;
}
