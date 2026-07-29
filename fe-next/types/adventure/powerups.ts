/**
 * Power-up system: types, cooldown states, config, and hint results.
 */

export type PowerUpType = 'freezeTime' | 'hint' | 'scoreMultiplier';

/** Cooldown lifecycle: ready -> active -> cooldown -> ready */
export type PowerUpState = 'ready' | 'active' | 'cooldown';

/** Effect durations (seconds). 0 = instant; >0 = duration effect. */
export const POWER_UP_CONFIG: Record<PowerUpType, { effectDuration: number }> = {
  freezeTime: { effectDuration: 0 },
  hint: { effectDuration: 0 },
  scoreMultiplier: { effectDuration: 30 },
};

export interface PowerUp {
  type: PowerUpType;
  state: PowerUpState;
  remainingCooldown: number;
  /** Always 60s */
  totalCooldown: number;
  activatedAt?: number;
  effectDuration: number;
}

export interface HintResult {
  word: string;
  tiles: Array<{ row: number; col: number }>;
}
