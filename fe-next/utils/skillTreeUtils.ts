/**
 * Skill Tree Utilities
 *
 * Defines the skill catalog and provides functions for skill tree operations.
 * Skills are categorized into 3 paths with tiered progression.
 *
 * Design principle: 75% horizontal (enable strategies), 25% vertical (stat boost)
 */

import type { SkillNode, SkillPath, SkillTreeState } from '@/types/adventure';

// ==============================================
// SKILL CATALOG
// ==============================================

/**
 * Complete skill catalog with 14 skills across 3 paths
 * Design principle: 75% horizontal (enable strategies), 25% vertical (stat boost)
 */
export const SKILL_CATALOG: SkillNode[] = [
  // === POWER PATH (offensive bonuses) ===
  {
    id: 'power_strike',
    nameKey: 'adventure.skills.power_strike.name',
    descriptionKey: 'adventure.skills.power_strike.description',
    path: 'power',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectId: 'long_word_bonus', // 6+ letter words deal +25% damage to bosses
    effectType: 'horizontal',
    icon: '⚔️',
  },
  {
    id: 'critical_letters',
    nameKey: 'adventure.skills.critical_letters.name',
    descriptionKey: 'adventure.skills.critical_letters.description',
    path: 'power',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectId: 'rare_letter_crit', // Q/X/Z have 20% crit chance
    effectType: 'horizontal',
    icon: '💎',
  },
  {
    id: 'combo_amplifier',
    nameKey: 'adventure.skills.combo_amplifier.name',
    descriptionKey: 'adventure.skills.combo_amplifier.description',
    path: 'power',
    tier: 2,
    cost: 2,
    prerequisites: ['power_strike'],
    effectId: 'combo_multiplier_boost', // Combo multiplier +0.25x
    effectType: 'vertical',
    icon: '🔥',
  },
  {
    id: 'boss_slayer',
    nameKey: 'adventure.skills.boss_slayer.name',
    descriptionKey: 'adventure.skills.boss_slayer.description',
    path: 'power',
    tier: 3,
    cost: 3,
    prerequisites: ['combo_amplifier'],
    effectId: 'boss_damage_boost', // +15% damage to bosses
    effectType: 'vertical',
    icon: '🐉',
  },

  // === STRATEGY PATH (board manipulation, combo enhancement) ===
  {
    id: 'chain_mastery',
    nameKey: 'adventure.skills.chain_mastery.name',
    descriptionKey: 'adventure.skills.chain_mastery.description',
    path: 'strategy',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectId: 'chain_duration_extend', // Chain tiles last 3s longer
    effectType: 'horizontal',
    icon: '🔗',
  },
  {
    id: 'ice_breaker',
    nameKey: 'adventure.skills.ice_breaker.name',
    descriptionKey: 'adventure.skills.ice_breaker.description',
    path: 'strategy',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectId: 'ice_melt_adjacent', // Words adjacent to ice melt 2 tiles
    effectType: 'horizontal',
    icon: '❄️',
  },
  {
    id: 'cascade_expert',
    nameKey: 'adventure.skills.cascade_expert.name',
    descriptionKey: 'adventure.skills.cascade_expert.description',
    path: 'strategy',
    tier: 2,
    cost: 2,
    prerequisites: ['chain_mastery'],
    effectId: 'cascade_bonus_words', // Cascades can form bonus words
    effectType: 'horizontal',
    icon: '🌊',
  },
  {
    id: 'tile_transmute',
    nameKey: 'adventure.skills.tile_transmute.name',
    descriptionKey: 'adventure.skills.tile_transmute.description',
    path: 'strategy',
    tier: 3,
    cost: 3,
    prerequisites: ['cascade_expert'],
    effectId: 'special_tile_upgrade', // 10% chance special tiles upgrade on cascade
    effectType: 'horizontal',
    icon: '✨',
  },

  // === UTILITY PATH (power-ups, quality of life) ===
  {
    id: 'quick_charge',
    nameKey: 'adventure.skills.quick_charge.name',
    descriptionKey: 'adventure.skills.quick_charge.description',
    path: 'utility',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectId: 'powerup_cooldown_reduce', // Power-up cooldowns -10s
    effectType: 'horizontal',
    icon: '⚡',
  },
  {
    id: 'power_slot_2',
    nameKey: 'adventure.skills.power_slot_2.name',
    descriptionKey: 'adventure.skills.power_slot_2.description',
    path: 'utility',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectId: 'unlock_power_slot_2', // Unlock 2nd power-up slot
    effectType: 'horizontal',
    icon: '🎰',
  },
  {
    id: 'extended_hints',
    nameKey: 'adventure.skills.extended_hints.name',
    descriptionKey: 'adventure.skills.extended_hints.description',
    path: 'utility',
    tier: 2,
    cost: 2,
    prerequisites: ['quick_charge'],
    effectId: 'hint_duration_double', // Hints visible for 10s instead of 5s
    effectType: 'horizontal',
    icon: '💡',
  },
  {
    id: 'power_slot_3',
    nameKey: 'adventure.skills.power_slot_3.name',
    descriptionKey: 'adventure.skills.power_slot_3.description',
    path: 'utility',
    tier: 2,
    cost: 2,
    prerequisites: ['power_slot_2'],
    effectId: 'unlock_power_slot_3', // Unlock 3rd power-up slot
    effectType: 'horizontal',
    icon: '🎰',
  },
  {
    id: 'advanced_multiplier',
    nameKey: 'adventure.skills.advanced_multiplier.name',
    descriptionKey: 'adventure.skills.advanced_multiplier.description',
    path: 'utility',
    tier: 3,
    cost: 3,
    prerequisites: ['extended_hints', 'power_slot_3'],
    effectId: 'unlock_advanced_multiplier', // Unlock 3x score multiplier power-up
    effectType: 'horizontal',
    icon: '🚀',
  },
];

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Get all skills for a specific path, sorted by tier
 */
export function getSkillsByPath(path: SkillPath): SkillNode[] {
  return SKILL_CATALOG
    .filter(skill => skill.path === path)
    .sort((a, b) => a.tier - b.tier);
}

/**
 * Get a skill by its ID
 */
export function getSkillById(id: string): SkillNode | undefined {
  return SKILL_CATALOG.find(skill => skill.id === id);
}

/**
 * Check if a skill can be unlocked given current state
 */
export function canUnlockSkill(skillId: string, state: SkillTreeState): boolean {
  const skill = getSkillById(skillId);
  if (!skill) return false;

  // Already unlocked
  if (state.unlockedSkills.has(skillId)) return false;

  // Not enough points
  if (state.availablePoints < skill.cost) return false;

  // Prerequisites not met
  const prereqsMet = skill.prerequisites.every(prereqId =>
    state.unlockedSkills.has(prereqId)
  );
  if (!prereqsMet) return false;

  return true;
}

/**
 * Get all skills that can currently be unlocked
 */
export function getAvailableSkills(state: SkillTreeState): SkillNode[] {
  return SKILL_CATALOG.filter(skill => canUnlockSkill(skill.id, state));
}
