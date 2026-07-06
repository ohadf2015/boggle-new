/**
 * Quick Play wheel geometry — pure math for the knob-drag mode picker.
 * Angles are degrees clockwise from "up" (12 o'clock).
 */
import type { QuickMode } from './types';

export const NODE_ANGLES: Record<QuickMode, number> = {
  'wheel-rush': 0,
  'word-hunt': 90,
  blast: 180,
  classic: 270,
};

export type WheelSelection = QuickMode | 'random';

/**
 * Given a knob drag offset from center, return the mode whose node is nearest
 * to the drag direction, or 'random' inside the dead zone.
 */
export function nearestNode(dx: number, dy: number, deadZonePx: number): WheelSelection {
  if (Math.hypot(dx, dy) < deadZonePx) return 'random';
  // atan2(dx, -dy): 0° = up, clockwise positive
  const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  let best: QuickMode = 'wheel-rush';
  let bestDelta = Infinity;
  for (const [mode, nodeAngle] of Object.entries(NODE_ANGLES) as [QuickMode, number][]) {
    const delta = Math.min(Math.abs(angle - nodeAngle), 360 - Math.abs(angle - nodeAngle));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = mode;
    }
  }
  return best;
}
