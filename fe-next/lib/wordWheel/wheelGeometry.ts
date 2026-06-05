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
 * @param minRadius        lower bound; must clear the center letter so the
 *                         petals never collapse onto it on a height-capped
 *                         viewport. The mobile center letter is 80px (radius 40)
 *                         and outer letters 52px (radius 26), so the orbit needs
 *                         ≥66px to avoid overlap; the 76px default adds a small
 *                         gap. A floor below that let a cramped wheel crush the
 *                         flower into itself (petals overlapping center + each
 *                         other). Short/landscape passes a smaller floor to match
 *                         its shrunken `short:` letters.
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
  minRadius = 76,
  letterAllowance = WHEEL_LETTER_ALLOWANCE_PX,
): number {
  if (!Number.isFinite(containerWidthPx) || containerWidthPx <= 0) {
    return minRadius;
  }
  const fitInsideRim = (containerWidthPx - letterAllowance) / 2;
  return Math.round(Math.max(minRadius, Math.min(maxRadius, fitInsideRim)));
}
