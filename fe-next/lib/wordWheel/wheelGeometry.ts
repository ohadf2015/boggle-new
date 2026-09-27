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

export interface WheelRadiusInput {
  /** Rendered container width (getBoundingClientRect). */
  width: number;
  /** Rendered container height. The wheel measures the shorter axis. */
  height: number;
  /** Desktop multiplayer canvas — wider orbit cap, no short-viewport shrink. */
  isDesktop?: boolean;
  /** Short / landscape viewport (`max-height: 600px`) — letters shrink too. */
  isShort?: boolean;
}

/**
 * Single source of truth for the wheel orbit radius across the daily
 * `WordWheelGame` and the multiplayer `WheelRushView`. Both render the same
 * square container at every breakpoint, so they MUST resolve to the same radius
 * for the same box — historically they drifted (MP capped at 96 while daily
 * capped at 136), making the multiplayer flower orbit ~40px tighter inside an
 * identical rim. Centralising the cap/floor/allowance selection here stops that
 * recurring divergence.
 *
 * Measures the *shorter* axis: the container is height-capped on short/landscape
 * screens, so a box that is wider than it is tall must pull its orbit inward to
 * keep outer letters off the action bar below.
 */
export function selectWheelRadius({ width, height, isDesktop = false, isShort = false }: WheelRadiusInput): number {
  const size = Math.min(width, height);
  if (isDesktop) {
    // Desktop canvas is a fixed square (no short variant) → wider 140 cap.
    return computeWheelRadius(size, 140);
  }
  if (isShort) {
    // short: variant shrinks the letters (center 64px, outer 48px), so feed a
    // smaller max/floor/allowance to match — otherwise the orbit floors onto the
    // still-large center letter on a cramped landscape wheel.
    return computeWheelRadius(size, 88, 56, 44);
  }
  return computeWheelRadius(size, 136);
}
