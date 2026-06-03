/**
 * Geometry helpers for the radial Word Wheel (daily `WordWheelGame` +
 * multiplayer `WheelRushView`). Pure so it can be unit-tested and shared.
 */

/**
 * Space reserved for one outer letter when fitting the orbit inside the wheel.
 * Outer letters render ~48–68px; 60 keeps a letter clear of the rim across the
 * size range without per-breakpoint math leaking into the radius.
 */
export const WHEEL_LETTER_ALLOWANCE_PX = 60;

/**
 * Radius (px) at which the 6 outer letters orbit the center letter.
 *
 * Derived from the wheel's *rendered* width so the whole wheel scales as one
 * unit: when the container is capped on short/landscape viewports the orbit
 * pulls inward instead of overflowing into the word-builder above or the action
 * bar below. Bounded so it never collapses onto the center letter (`minRadius`)
 * nor flings letters past the rim on large desktop canvases (`maxRadius`).
 *
 * @param containerWidthPx rendered wheel width (getBoundingClientRect)
 * @param maxRadius        upper bound (96 mobile, 136/140 desktop)
 * @param minRadius        lower bound; keeps a tiny wheel usable
 * @param letterAllowance  rim space reserved for one outer letter. Defaults to
 *                         {@link WHEEL_LETTER_ALLOWANCE_PX}; pass a smaller value
 *                         on short/landscape viewports where the `short:` variant
 *                         shrinks the letters, so the orbit isn't over-reserved
 *                         (which would otherwise floor a small wheel onto its
 *                         center letter).
 */
export function computeWheelRadius(
  containerWidthPx: number,
  maxRadius: number,
  minRadius = 52,
  letterAllowance = WHEEL_LETTER_ALLOWANCE_PX,
): number {
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) {
    return minRadius;
  }
  const fitInsideRim = (containerWidthPx - letterAllowance) / 2;
  return Math.round(Math.max(minRadius, Math.min(maxRadius, fitInsideRim)));
}
