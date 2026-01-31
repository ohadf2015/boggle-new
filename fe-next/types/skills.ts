/**
 * Skill Tree Type Definitions
 *
 * Types for the skill tree system in Adventure mode.
 * Skills are organized into 3 paths (Power, Strategy, Utility) with 3 tiers each.
 */

// ==============================================
// SKILL PATHS
// ==============================================

/**
 * Skill tree paths - each focuses on different gameplay aspects
 * - power: Damage and combat bonuses
 * - strategy: Combos and scoring
 * - utility: Power-ups and hints
 */
export type SkillPath = 'power' | 'strategy' | 'utility';

/**
 * Skill tiers within each path
 * - tier1: Entry level (requires no prerequisites)
 * - tier2: Intermediate (requires tier1 skill)
 * - tier3: Advanced (requires tier2 skill)
 */
export type SkillTier = 'tier1' | 'tier2' | 'tier3';

// ==============================================
// SKILL NODE
// ==============================================

/**
 * A single skill in the skill tree
 */
export interface SkillNode {
  /** Unique skill identifier */
  id: string;
  /** Translation key for skill name */
  nameKey: string;
  /** Translation key for skill description */
  descriptionKey: string;
  /** Path this skill belongs to */
  path: SkillPath;
  /** Tier within the path */
  tier: SkillTier;
  /** Skill points required to unlock */
  cost: number;
  /** Icon name or emoji */
  icon: string;
  /** Prerequisites (skill IDs that must be unlocked first) */
  prerequisites: string[];
  /** Effect type for applying in gameplay */
  effectType: SkillEffectType;
  /** Effect value (multiplier, bonus amount, etc.) */
  effectValue: number;
}

// ==============================================
// SKILL EFFECTS
// ==============================================

/**
 * Types of effects skills can provide
 */
export type SkillEffectType =
  | 'bossDamageMultiplier'      // Increases damage dealt to bosses
  | 'longWordDamageBonus'       // Extra damage for 6+ letter words
  | 'comboMultiplierBonus'      // Adds to combo multiplier
  | 'powerUpCooldownReduction'  // Reduces power-up cooldowns
  | 'maxPowerUpSlots'           // Unlocks additional power-up slots
  | 'hintDuration'              // Extends hint visibility duration
  | 'xpBonus'                   // Extra XP earned
  | 'goldBonus';                // Extra gold earned

/**
 * Compiled skill effects for gameplay application
 */
export interface SkillEffects {
  /** Maximum power-up slots (default: 3) */
  maxPowerUpSlots: number;
  /** Power-up cooldown multiplier (0.8 = 20% faster) */
  powerUpCooldownMultiplier: number;
  /** Bonus added to combo multiplier */
  comboMultiplierBonus: number;
  /** Boss damage multiplier (1.2 = 20% more damage) */
  bossDamageMultiplier: number;
  /** Hint display duration in seconds */
  hintDuration: number;
  /** Function to get damage multiplier for long words */
  getLongWordDamageMultiplier: (wordLength: number) => number;
  /** XP bonus multiplier */
  xpBonus: number;
  /** Gold bonus multiplier */
  goldBonus: number;
}

// ==============================================
// SKILL TREE STATE
// ==============================================

/**
 * Player's skill tree state
 */
export interface SkillTreeState {
  /** Available skill points to spend */
  availablePoints: number;
  /** Total skill points earned */
  totalPointsEarned: number;
  /** Set of unlocked skill IDs */
  unlockedSkills: Set<string>;
  /** Player level (skill points awarded on level up) */
  playerLevel: number;
}

/**
 * Skill tree store actions
 */
export interface SkillTreeActions {
  /** Unlock a skill (spends points) */
  unlockSkill: (skillId: string) => boolean;
  /** Check if a skill can be unlocked */
  canUnlock: (skillId: string) => boolean;
  /** Award skill points (called on level up) */
  awardPoints: (amount: number) => void;
  /** Reset skill tree (refund all points) */
  reset: () => void;
}
