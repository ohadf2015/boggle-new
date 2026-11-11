/**
 * Contact feedback. The verdict sound waits until the block RESTS (up to 2.6s),
 * so a drop used to land in silence; the thunk plays on first contact.
 */

/** Below this Matter speed an impact is the stack settling, not a landing. */
const THUNK_MIN_SPEED = 4;

export function impactThunk(speed: number): { volume: number; rate: number } | null {
  if (speed <= THUNK_MIN_SPEED) return null;
  const k = Math.min(1, (speed - THUNK_MIN_SPEED) / 14);
  return { volume: 0.3 + 0.5 * k, rate: 1.15 - 0.35 * k };
}

/** Landing squash: `amount` 0..1 -> container scale, wide and flat, area kept. */
export function squashScale(amount: number): { sx: number; sy: number } {
  const sy = 1 - 0.16 * amount;
  return { sx: 1 / sy, sy };
}

/**
 * Landing beat on a 1 -> 0 decay: squash, overshoot into a stretch, hold it,
 * then settle. Positive squashes, negative stretches (feeds `squashScale`).
 */
export function landingBounce(t: number): number {
  if (t <= 0) return 0;
  const u = 1 - Math.min(1, t);
  const STRETCH = -0.4;
  if (u < 0.2) return Math.sin((u / 0.2) * (Math.PI / 2));
  if (u < 0.4) return STRETCH + (1 - STRETCH) * (0.5 + 0.5 * Math.cos(((u - 0.2) / 0.2) * Math.PI));
  if (u < 0.6) return STRETCH;
  return STRETCH * (0.5 + 0.5 * Math.cos(((u - 0.6) / 0.4) * Math.PI));
}
