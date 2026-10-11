/**
 * Geometry of the Word Wheel disc, in percent of the square disc box, so the
 * whole wheel scales as one unit at any size.
 *
 * Sizes are chosen so a straight swipe between two outer letters never passes
 * over a third outer letter, and only a swipe between OPPOSITE letters crosses
 * the hub (useWheelDragSpell treats that as a pass-through). discGeometry.test
 * pins both.
 */
export const DISC = {
  /** Orbit radius of the outer letters. */
  ring: 35.5,
  /** Outer letter diameter. */
  outer: 20,
  /** Hub (centre letter) diameter. */
  center: 28,
} as const;

export interface DiscPoint { x: number; y: number }

export function slotPoint(slot: number, count: number): DiscPoint {
  const rad = ((slot * 360) / count * Math.PI) / 180;
  return { x: 50 + Math.sin(rad) * DISC.ring, y: 50 - Math.cos(rad) * DISC.ring };
}

/** Where a wheel letter sits: -1 is the hub, outer letters run clockwise from twelve o'clock. */
export function letterPoint(wheelIndex: number, count: number): DiscPoint {
  return wheelIndex < 0 ? { x: 50, y: 50 } : slotPoint(wheelIndex, count);
}

export function toDiscPercent(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): DiscPoint {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}
