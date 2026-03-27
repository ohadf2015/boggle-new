/**
 * Config Adjuster for Adaptive Difficulty System
 *
 * Applies tier-based modifications to level configuration.
 * Makes levels easier (easy tier) or harder (hard tier) without changing core mechanics.
 */

import type { LevelConfig } from '@/types/adventure';
import type { DifficultyTier, TierAdjustments } from '@/types/difficulty';

// ==============================================
// TIER ADJUSTMENT CONSTANTS
// ==============================================

/**
 * Tier adjustment values (from CONTEXT.md)
 * - Easy: +20% timer, -20% score targets, normal cooldowns
 * - Normal: No changes
 * - Hard: -15% timer, normal score targets, +50% cooldowns
 */
const TIER_ADJUSTMENTS: Record<DifficultyTier, TierAdjustments> = {
  easy: {
    timerMultiplier: 1.2,
    scoreTargetMultiplier: 0.8,
    powerUpCooldownMultiplier: 1.0,
  },
  normal: {
    timerMultiplier: 1.0,
    scoreTargetMultiplier: 1.0,
    powerUpCooldownMultiplier: 1.0,
  },
  hard: {
    timerMultiplier: 0.85,
    scoreTargetMultiplier: 1.0,
    powerUpCooldownMultiplier: 1.5,
  },
};

// ==============================================
// PUBLIC API
// ==============================================

/**
 * Get tier adjustment multipliers for a specific tier
 *
 * @param tier - Difficulty tier (easy/normal/hard)
 * @returns Tier adjustment multipliers
 *
 * @example
 * getTierAdjustments('easy')
 * // Returns { timerMultiplier: 1.2, scoreTargetMultiplier: 0.8, powerUpCooldownMultiplier: 1.0 }
 */
export function getTierAdjustments(tier: DifficultyTier): TierAdjustments {
  return TIER_ADJUSTMENTS[tier];
}

/**
 * Apply tier-based adjustments to level configuration
 *
 * Boss levels (isBossLevel=true) always return unmodified config.
 * Only primary scoreTarget objectives are modified.
 * Timer is adjusted for all non-boss levels.
 *
 * @param baseConfig - Base level configuration
 * @param tier - Difficulty tier to apply
 * @returns Adjusted level configuration (new object, does not mutate original)
 *
 * @example
 * const adjusted = applyTierAdjustments(baseConfig, 'easy')
 * // Returns config with +20% timer, -20% score targets
 */
export function applyTierAdjustments(
  baseConfig: LevelConfig,
  tier: DifficultyTier
): LevelConfig {
  // Boss levels use base config — except World 1 boss gets a light timer
  // boost on easy tier to prevent first-boss churn (objectives stay unchanged)
  if (baseConfig.isBossLevel) {
    if (baseConfig.world === 1 && tier === 'easy') {
      const adjustments = getTierAdjustments(tier);
      return {
        ...baseConfig,
        timerSeconds: Math.floor(baseConfig.timerSeconds * adjustments.timerMultiplier),
      };
    }
    return baseConfig;
  }

  const adjustments = getTierAdjustments(tier);

  // Don't mutate original config
  const adjustedConfig: LevelConfig = { ...baseConfig };

  // Apply timer adjustment (rounded down)
  adjustedConfig.timerSeconds = Math.floor(
    baseConfig.timerSeconds * adjustments.timerMultiplier
  );

  // Apply score target adjustment to primary objectives only
  adjustedConfig.objectives = baseConfig.objectives.map((obj) => {
    if (obj.isPrimary && obj.type === 'scoreTarget') {
      return {
        ...obj,
        target: Math.floor(obj.target * adjustments.scoreTargetMultiplier),
      };
    }
    return obj;
  });

  return adjustedConfig;
}
