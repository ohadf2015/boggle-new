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
