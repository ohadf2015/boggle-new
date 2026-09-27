import type { PRNG } from './prng';

/**
 * Per-level random modifier — a small, board-shaping twist that fires on a
 * roll once the player passes MODIFIER_UNLOCK_LEVEL. Adds variety without
 * touching the cascade engine: the generator just boosts one tile-flag rate
 * and the intro card shows a banner so the modifier reads as intentional.
 */
export type LevelModifier = 'gem_rush' | 'coin_bonanza' | 'bonus_storm';

export const ALL_LEVEL_MODIFIERS: readonly LevelModifier[] = [
  'gem_rush',
  'coin_bonanza',
  'bonus_storm',
] as const;

// Stay quiet on early levels — the FTUE / mechanic-unlock cards already eat
// the player's attention; modifiers land once the loop is established.
export const MODIFIER_UNLOCK_LEVEL = 3;

// 30% felt right in pen-and-paper sim: frequent enough that runs feel varied,
// rare enough that a "vanilla" board still reads as the baseline.
export const MODIFIER_ROLL_CHANCE = 0.3;

export function rollLevelModifier(prng: PRNG, levelNumber: number): LevelModifier | null {
  if (levelNumber < MODIFIER_UNLOCK_LEVEL) return null;
  if (!prng.chance(MODIFIER_ROLL_CHANCE)) return null;
  return prng.pick(ALL_LEVEL_MODIFIERS);
}

export type TileFlagRates = { coin: number; gem: number; doubleBonus: number };

const GEM_RUSH_MULT = 4.0;
const COIN_BONANZA_MULT = 1.7;
const BONUS_STORM_MULT = 2.5;

export function applyModifierToRates(
  base: TileFlagRates,
  modifier: LevelModifier | null,
): TileFlagRates {
  if (modifier === 'gem_rush') return { ...base, gem: Math.min(1, base.gem * GEM_RUSH_MULT) };
  if (modifier === 'coin_bonanza') return { ...base, coin: Math.min(1, base.coin * COIN_BONANZA_MULT) };
  if (modifier === 'bonus_storm') return { ...base, doubleBonus: Math.min(1, base.doubleBonus * BONUS_STORM_MULT) };
  return base;
}

export const LEVEL_MODIFIER_INTRO_KEYS: Record<LevelModifier, string> = {
  gem_rush: 'blast.modifier.gemRush',
  coin_bonanza: 'blast.modifier.coinBonanza',
  bonus_storm: 'blast.modifier.bonusStorm',
};
