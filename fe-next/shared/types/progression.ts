/**
 * Progression System Types
 *
 * Defines types for player progression, stat upgrades, and currency management.
 * Part of the meta-progression foundation for Adventure Mode.
 */

/**
 * Unique identifiers for stat upgrade types
 */
export type UpgradeId = 'timeBonus' | 'scoreBonus' | 'xpBonus';

/**
 * Configuration for a single stat upgrade type
 */
export interface StatUpgrade {
  /** Unique identifier for this upgrade */
  id: UpgradeId;
  /** Display name for the upgrade */
  name: string;
  /** Description of what the upgrade does */
  description: string;
  /** Base cost in gold for the first purchase */
  baseCost: number;
  /** Benefit percentage per stack (e.g., 10 = +10%) */
  benefitPerStack: number;
  /** Maximum number of times this upgrade can be purchased */
  maxStacks: number;
  /** Icon identifier for UI display */
  icon: string;
}

/**
 * Player progression data structure
 */
export interface PlayerProgression {
  /** Current gold balance */
  gold: number;
  /** Current experience points */
  xp: number;
  /** Current level (derived from XP) */
  level: number;
  /** Upgrade stacks purchased by upgrade ID */
  upgrades: Record<UpgradeId, number>;
}

/**
 * Result of an upgrade purchase attempt
 */
export type PurchaseResult =
  | {
      /** Purchase was successful */
      success: true;
      /** New gold balance after purchase */
      newGold: number;
      /** New stack count after purchase */
      newStacks: number;
    }
  | {
      /** Purchase failed */
      success: false;
      /** Reason for failure */
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
