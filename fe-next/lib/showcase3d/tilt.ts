/**
 * Pure geometry for the showcase-3d hero. Kept framework-free so the tilt /
 * parallax / shadow math is unit-testable and the React component stays
 * purely presentational. All inputs are plain numbers + a Rect; no DOM.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Collapse -0 to 0 so equality checks and serialized transforms stay clean. */
const nz = (n: number): number => (n === 0 ? 0 : n);

/**
 * Pointer position relative to a rect, normalized to [-1, 1] on each axis with
 * (0,0) at the center. Out-of-rect pointers clamp to the edges. A degenerate
 * (unmeasured) rect returns the neutral center so the hero renders flat.
 */
export function normalizePointer(px: number, py: number, rect: Rect): { nx: number; ny: number } {
  if (!rect || rect.width <= 0 || rect.height <= 0) return { nx: 0, ny: 0 };
  const nx = clamp(((px - rect.left) / rect.width) * 2 - 1, -1, 1);
  const ny = clamp(((py - rect.top) / rect.height) * 2 - 1, -1, 1);
  return { nx, ny };
}

/**
 * Rotation (degrees) so the card tilts TOWARD the cursor. A cursor to the right
 * yaws the card +maxDeg about Y; a cursor above pitches it +maxDeg about X.
 */
export function pointerToTilt(
  px: number,
  py: number,
  rect: Rect,
  maxDeg = 12,
): { rotateX: number; rotateY: number } {
  const { nx, ny } = normalizePointer(px, py, rect);
  return { rotateX: nz(-ny * maxDeg), rotateY: nz(nx * maxDeg) };
}

/**
 * Parallax translation (px) for a depth layer. Positive depth moves with the
 * pointer (foreground), negative depth moves against it (background).
 */
export function parallaxOffset(
  px: number,
  py: number,
  rect: Rect,
  depth: number,
): { x: number; y: number } {
  const { nx, ny } = normalizePointer(px, py, rect);
  return { x: nx * depth, y: ny * depth };
}

/**
 * Hard pixel-shadow offset that tracks the tilt, so a flat brutalist shadow
 * reads as a real 3D object: yaw slides the shadow opposite the lean, pitch
 * lengthens it along the lean. `base` is the resting offset, `k` is px/degree.
 */
export function shadowForTilt(
  rotateX: number,
  rotateY: number,
  base = 8,
  k = 0.6,
): { x: number; y: number } {
  return { x: base - rotateY * k, y: base + rotateX * k };
}
