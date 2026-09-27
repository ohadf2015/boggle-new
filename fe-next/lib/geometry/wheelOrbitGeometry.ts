/**
 * Wheel orbit geometry — places N letters evenly around a center letter.
 *
 * Real WheelRush uses 6 outer letters at 60° spacing
 * (`utils/dailyChallenge/wordWheelGeneration.ts:5`). Practice mirrors that
 * count via this shared helper so both modes draw the same shape.
 *
 * Coordinate convention: angle 0 = top of wheel, increasing clockwise.
 *  index 0 → top         (angle 0°)
 *  index 1 → top-right   (angle 60°)  for letterCount=6
 *  ...
 *
 * Returned offsets are pixel distances FROM the wheel center, suitable
 * for `style={{ transform: translateX(${x}) translateY(${y}) }}` on an
 * absolutely-centered child.
 */
export interface WheelOffset {
  x: number;
  y: number;
  angleDeg: number;
}

/**
 * Compute the (x, y) offset and angle for the i-th outer letter on a
 * wheel of `letterCount` outer letters at the given pixel `radius`.
 */
export function getWheelOuterOffset(
  index: number,
  letterCount: number,
  radius: number,
): WheelOffset {
  const angleDeg = (index * 360) / letterCount;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.sin(angleRad) * radius,
    y: -Math.cos(angleRad) * radius,
    angleDeg,
  };
}
