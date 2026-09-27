/**
 * Pure helpers for the scroll/pointer effects layer.
 * Kept framework-free so the math is unit-testable without a DOM or GSAP.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Offset to apply to a "magnetic" element so it leans toward the pointer.
 * Returns {0,0} when the pointer is dead-center; scales linearly by `strength`.
 */
export function magneticOffset(
  pointerX: number,
  pointerY: number,
  box: Box,
  strength = 0.4,
): { x: number; y: number } {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  return {
    x: (pointerX - cx) * strength,
    y: (pointerY - cy) * strength,
  };
}

/**
 * Vertical parallax shift for a scrub-linked element.
 * `progress` is the ScrollTrigger progress (0..1, clamped); the element
 * travels across `distance` px total, centered (0 at progress 0.5).
 */
export function parallaxShift(progress: number, distance: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return (p - 0.5) * distance;
}
