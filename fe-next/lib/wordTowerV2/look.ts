/**
 * Free look: drag the canvas to walk your own tower back down.
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
 * Sideways pan. The camera centres on the FIRST block, so a tower that walks
 * sideways as it grows can put its top off the edge — this is how the player
 * follows it, and how they look at the street beside their own building.
 *
 * Symmetric and caller-limited: the limit is a fraction of the viewport, which
 * only TowerCanvas knows. ponytail: a clamp, not a spring — the view is pinned
 * home on the next hoist, same as the vertical pan.
 */
export function clampLookX(x: number, limitPx: number): number {
  const limit = Math.max(0, limitPx);

  return Math.max(-limit, Math.min(limit, x));
}
