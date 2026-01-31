/**
 * Skill Tree Store
 *
 * Zustand store for skill tree state with localStorage persistence.
 * Handles skill unlocking, point tracking, and effect calculation.
 *
 * NOTE: Uses custom storage adapter for Set serialization because
 * JSON.stringify converts Set to {} (empty object).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SkillNode, SkillPath, SkillTier, SkillEffectType } from '@/types/skills';

// ==============================================
// SKILL CATALOG
// ==============================================

/**
 * Complete skill catalog with all available skills
 * 3 paths x 3-5 skills per path = 14 total skills
 */
export const SKILL_CATALOG: Record<string, SkillNode> = {
  // Power Path - Tier 1
  'power-strike': {
    id: 'power-strike',
    nameKey: 'skills.powerStrike.name',
    descriptionKey: 'skills.powerStrike.desc',
    path: 'power',
    tier: 'tier1',
    cost: 1,
    icon: '⚔️',
    prerequisites: [],
    effectType: 'bossDamageMultiplier',
    effectValue: 1.1, // +10% boss damage
  },
  // Power Path - Tier 2
  'long-word-mastery': {
    id: 'long-word-mastery',
    nameKey: 'skills.longWordMastery.name',
    descriptionKey: 'skills.longWordMastery.desc',
    path: 'power',
    tier: 'tier2',
    cost: 2,
    icon: '📖',
    prerequisites: ['power-strike'],
    effectType: 'longWordDamageBonus',
    effectValue: 1.25, // +25% damage for 6+ letter words
  },
  // Power Path - Tier 3
  'devastating-blow': {
    id: 'devastating-blow',
    nameKey: 'skills.devastatingBlow.name',
    descriptionKey: 'skills.devastatingBlow.desc',
    path: 'power',
    tier: 'tier3',
    cost: 3,
    icon: '💥',
    prerequisites: ['long-word-mastery'],
    effectType: 'bossDamageMultiplier',
    effectValue: 1.25, // +25% boss damage (stacks with power-strike)
  },

  // Strategy Path - Tier 1
  'combo-starter': {
    id: 'combo-starter',
    nameKey: 'skills.comboStarter.name',
    descriptionKey: 'skills.comboStarter.desc',
    path: 'strategy',
    tier: 'tier1',
    cost: 1,
    icon: '🔗',
    prerequisites: [],
    effectType: 'comboMultiplierBonus',
    effectValue: 0.1, // +0.1 to combo multiplier
  },
  // Strategy Path - Tier 2
  'chain-reaction': {
    id: 'chain-reaction',
    nameKey: 'skills.chainReaction.name',
    descriptionKey: 'skills.chainReaction.desc',
    path: 'strategy',
    tier: 'tier2',
    cost: 2,
    icon: '⛓️',
    prerequisites: ['combo-starter'],
    effectType: 'comboMultiplierBonus',
    effectValue: 0.15, // Additional +0.15 to combo multiplier
  },
  // Strategy Path - Tier 3
  'combo-master': {
    id: 'combo-master',
    nameKey: 'skills.comboMaster.name',
    descriptionKey: 'skills.comboMaster.desc',
    path: 'strategy',
    tier: 'tier3',
    cost: 3,
    icon: '👑',
    prerequisites: ['chain-reaction'],
    effectType: 'comboMultiplierBonus',
    effectValue: 0.25, // Additional +0.25 to combo multiplier
  },

  // Utility Path - Tier 1
  'quick-charge': {
    id: 'quick-charge',
    nameKey: 'skills.quickCharge.name',
    descriptionKey: 'skills.quickCharge.desc',
    path: 'utility',
    tier: 'tier1',
    cost: 1,
    icon: '⚡',
    prerequisites: [],
    effectType: 'powerUpCooldownReduction',
    effectValue: 0.9, // 10% faster cooldowns
  },
  // Utility Path - Tier 2
  'power-up-slot': {
    id: 'power-up-slot',
    nameKey: 'skills.powerUpSlot.name',
    descriptionKey: 'skills.powerUpSlot.desc',
    path: 'utility',
    tier: 'tier2',
    cost: 2,
    icon: '📦',
    prerequisites: ['quick-charge'],
    effectType: 'maxPowerUpSlots',
    effectValue: 4, // Unlocks 4th power-up slot
  },
  // Utility Path - Tier 3
  'hint-master': {
    id: 'hint-master',
    nameKey: 'skills.hintMaster.name',
    descriptionKey: 'skills.hintMaster.desc',
    path: 'utility',
    tier: 'tier3',
    cost: 3,
    icon: '💡',
    prerequisites: ['power-up-slot'],
    effectType: 'hintDuration',
    effectValue: 8, // Hints last 8 seconds instead of 5
  },

  // Cross-path skills (unlocked after completing one path)
  'xp-boost': {
    id: 'xp-boost',
    nameKey: 'skills.xpBoost.name',
    descriptionKey: 'skills.xpBoost.desc',
    path: 'strategy',
    tier: 'tier2',
    cost: 2,
    icon: '✨',
    prerequisites: ['combo-starter'],
    effectType: 'xpBonus',
    effectValue: 1.15, // +15% XP
  },
  'gold-rush': {
    id: 'gold-rush',
    nameKey: 'skills.goldRush.name',
    descriptionKey: 'skills.goldRush.desc',
    path: 'utility',
    tier: 'tier2',
    cost: 2,
    icon: '💰',
    prerequisites: ['quick-charge'],
    effectType: 'goldBonus',
    effectValue: 1.2, // +20% gold
  },
};

// ==============================================
// STORE STATE & ACTIONS
// ==============================================

interface SkillTreeState {
  /** Available skill points to spend */
  availablePoints: number;
  /** Total skill points earned */
  totalPointsEarned: number;
  /** Set of unlocked skill IDs (stored as array for serialization) */
  unlockedSkills: string[];
  /** Player level for reference */
  playerLevel: number;
}

interface SkillTreeActions {
  /** Unlock a skill (spends points) */
  unlockSkill: (skillId: string) => boolean;
  /** Check if a skill can be unlocked */
  canUnlock: (skillId: string) => boolean;
  /** Award skill points (called on level up) */
  awardPoints: (amount: number) => void;
  /** Reset skill tree (refund all points) */
  reset: () => void;
  /** Check if a skill is unlocked */
  isUnlocked: (skillId: string) => boolean;
  /** Get all unlocked skills */
  getUnlockedSkills: () => SkillNode[];
}

type SkillTreeStore = SkillTreeState & SkillTreeActions;

// ==============================================
// STORE IMPLEMENTATION
// ==============================================

export const useSkillTreeStore = create<SkillTreeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      availablePoints: 0,
      totalPointsEarned: 0,
      unlockedSkills: [],
      playerLevel: 1,

      // Actions
      unlockSkill: (skillId: string): boolean => {
        const state = get();
        const skill = SKILL_CATALOG[skillId];

        if (!skill) return false;
        if (state.unlockedSkills.includes(skillId)) return false;
        if (state.availablePoints < skill.cost) return false;

        // Check prerequisites
        for (const prereq of skill.prerequisites) {
          if (!state.unlockedSkills.includes(prereq)) return false;
        }

        // Unlock the skill
        set({
          availablePoints: state.availablePoints - skill.cost,
          unlockedSkills: [...state.unlockedSkills, skillId],
        });

        return true;
      },

      canUnlock: (skillId: string): boolean => {
        const state = get();
        const skill = SKILL_CATALOG[skillId];

        if (!skill) return false;
        if (state.unlockedSkills.includes(skillId)) return false;
        if (state.availablePoints < skill.cost) return false;

        // Check prerequisites
        for (const prereq of skill.prerequisites) {
          if (!state.unlockedSkills.includes(prereq)) return false;
        }

        return true;
      },

      awardPoints: (amount: number): void => {
        set((state) => ({
          availablePoints: state.availablePoints + amount,
          totalPointsEarned: state.totalPointsEarned + amount,
        }));
      },

      reset: (): void => {
        const state = get();
        // Refund all spent points
        const spentPoints = state.totalPointsEarned - state.availablePoints;
        set({
          availablePoints: state.totalPointsEarned,
          unlockedSkills: [],
        });
      },

      isUnlocked: (skillId: string): boolean => {
        return get().unlockedSkills.includes(skillId);
      },

      getUnlockedSkills: (): SkillNode[] => {
        return get().unlockedSkills
          .map((id) => SKILL_CATALOG[id])
          .filter(Boolean);
      },
    }),
    {
      name: 'lexiclash-skill-tree',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Get skills grouped by path
 */
export function getSkillsByPath(path: SkillPath): SkillNode[] {
  return Object.values(SKILL_CATALOG).filter((skill) => skill.path === path);
}

/**
 * Get skills by tier within a path
 */
export function getSkillsByTier(path: SkillPath, tier: SkillTier): SkillNode[] {
  return Object.values(SKILL_CATALOG).filter(
    (skill) => skill.path === path && skill.tier === tier
  );
}

/**
 * Get all skills in the catalog
 */
export function getAllSkills(): SkillNode[] {
  return Object.values(SKILL_CATALOG);
}
