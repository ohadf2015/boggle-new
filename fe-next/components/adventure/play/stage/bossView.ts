/** Pure view helpers for the foe's HP bar and wind-up urgency. No React. */

/** Where `combat.ts` flips the foe's phase (it switches at <=66% and <=33% HP). */
export const PHASE_NOTCHES = [66, 33] as const;

export function hpPercent(hp: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (hp / max) * 100));
}

/** How many phase notches the foe has already fallen through. */
export function notchesPassed(hp: number, max: number): number {
  const pct = hpPercent(hp, max);
  return PHASE_NOTCHES.filter((n) => pct <= n).length;
}

export type Urgency = 'calm' | 'warn' | 'urgent';

/** A wind-up turns from calm to urgent as the strike nears: the last second must shout. */
export function urgencyOf(leftMs: number): Urgency {
  if (leftMs <= 1000) return 'urgent';
  if (leftMs <= 2000) return 'warn';
  return 'calm';
}
