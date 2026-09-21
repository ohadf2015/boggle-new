/**
 * Free look: drag the canvas UP/DOWN to walk your own tower back down.
 *
 * The camera (camera.ts) always frames the CRANE — which is right while you are
 * timing a drop and wrong the moment you want to see what you built. This is a
 * pan offset added on top of it, in screen pixels, owned by the player.
 *
 * Sign convention matches `cameraY`: the camera's upward pan is positive, so
 * looking back DOWN the tower is negative. Content follows the finger, so a
 * drag of `dy` screen px is simply added.
 *
 * ponytail: no inertia, no spring. The view is pinned home on the next hoist
 * (WordTowerV2), which is the only moment it must be — an idle timer would drag
 * the camera away mid-swing and get blamed for the miss.
 */

/** How far above the crane the view may be pushed — enough to see the hook's sky. */
export const LOOK_UP_PX = 200;

/**
 * Keep a pan offset inside the tower. `cameraY` is how far the camera has
 * already climbed, so `-cameraY` is exactly the street.
 */
export function clampLook(y: number, cameraY: number): number {
  return Math.max(-cameraY, Math.min(LOOK_UP_PX, y));
}

/**
 * Where the camera centres sideways on its own. It used to sit on the FIRST
 * floor, so a tower that walks sideways as it grows put its top off the edge
 * and the player had to drag it back. Framing the midpoint of the base and the
 * top floor keeps both on screen without anyone touching it.
 */
export function focusX(baseX: number | null, topX: number | null): number {
  if (baseX === null) return topX ?? 0;
  if (topX === null) return baseX;
  return (baseX + topX) / 2;
}

/**
 * Sideways free look. The camera already frames the tower (focusX); this is
 * the player looking at the street beside it. It moves the WHOLE scene — the
 * street, crane and skylines go with the tower (TowerCanvas) — so it reads as
 * a camera pan, never as dragging the building across a frozen backdrop.
 *
 * Symmetric and caller-limited: the limit is a fraction of the viewport, which
 * only TowerCanvas knows. ponytail: a clamp, not a spring — the view is pinned
 * home on the next hoist, same as the vertical pan.
 */
export function clampLookX(x: number, limitPx: number): number {
  const limit = Math.max(0, limitPx);

  return Math.max(-limit, Math.min(limit, x));
}
