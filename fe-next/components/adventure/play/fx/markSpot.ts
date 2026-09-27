/**
 * The last-hit sticker (pure maths): after the cast is gone, the damage + praise stay
 * stamped on the target's corner until the next word lands — so the hit keeps reading
 * at a glance on a phone or across the room on a TV. Also the HP count-down tween.
 */

export interface RectLike { left: number; top: number; width: number; height: number }

/** Half the sticker's likely width, so it never leaves the screen. */
const HALF_W = 48;

/** Sticker centre: on the target's lower edge, centred (so it stays on the portrait in LTR and RTL), clamped on screen. */
export function markSpot(rect: RectLike, vw: number): { x: number; y: number } {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height - Math.min(16, rect.height * 0.18);
  return { x: Math.round(Math.min(vw - HALF_W, Math.max(HALF_W, x))), y: Math.round(y) };
}

/** Integer value `elapsed` ms into an ease-out count from `from` to `to`. */
export function countTween(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to;
  const p = Math.max(0, elapsed / duration);
  const eased = 1 - (1 - p) ** 3;
  return Math.round(from + (to - from) * eased);
}
