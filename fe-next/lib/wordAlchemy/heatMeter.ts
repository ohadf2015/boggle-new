/**
 * Word Alchemy — Heat Meter (Alchemy Heat Chain)
 *
 * A combo system that fills when the player answers steps on the first try.
 * When the meter is full ("Exothermic Rush"), the next correct step earns a
 * 3× visual bonus (larger burst, special sound).
 *
 * All state lives in the `useAlchemyHeatMeter` hook; this module provides
 * the pure transition functions exported for unit tests.
 */

export const MAX_HEAT = 3;

/**
 * Increment heat by one, capped at MAX_HEAT.
 * Called when the player answers a step on the first try.
 */
export function incrementHeat(heat: number): number {
  return Math.min(heat + 1, MAX_HEAT);
}

/**
 * Decrement heat by one, floored at 0.
 * Called when the player makes a wrong guess.
 */
export function decrementHeat(heat: number): number {
  return Math.max(heat - 1, 0);
}

/**
 * True when the heat meter is at capacity — the next correct first-try
 * step triggers the Exothermic Rush bonus.
 */
export function isRushActive(heat: number): boolean {
  return heat >= MAX_HEAT;
}
