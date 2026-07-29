/**
 * Progression System Types
 *
 * Defines types for player progression, stat upgrades, and currency management.
 * Part of the meta-progression foundation for Adventure Mode.
 */

/**
 * Upgrade state — map of upgrade IDs to tier levels
 * @see upgradeConfig.ts for the full upgrade catalog
 */
export type UpgradeState = Record<string, number>;

/**
 * @deprecated Use string upgrade IDs from upgradeConfig.ts instead
 */
export type UpgradeId = string;

/**
 * @deprecated Use UpgradeDefinition from upgradeConfig.ts instead
 */
export interface StatUpgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  benefitPerStack: number;
  maxStacks: number;
  icon: string;
}

/**
 * @deprecated Use PlayerProgression from types/adventure.ts instead
 */
export interface PlayerProgression {
  gold: number;
  xp: number;
  level: number;
  upgrades: Record<string, number>;
}

/**
 * Result of an upgrade purchase attempt
 */
export type PurchaseResult =
  | {
      success: true;
      newGold: number;
      newStacks: number;
    }
  | {
      success: false;
      error: 'insufficient_gold' | 'max_stacks_reached' | 'invalid_upgrade';
    };

/**
 * Difficulty level for adventure levels
 */
export type DifficultyLevel = 'easy' | 'normal' | 'hard';

/**
 * Star rating for level completion (1-3 stars)
 */
export type StarRating = 1 | 2 | 3;
