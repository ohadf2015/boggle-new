/**
 * Skill Effects
 *
 * Functions for applying skill effects to game state.
 * Each skill has an effectId that maps to gameplay modifications.
 */

import { SKILL_CATALOG } from './skillTreeUtils';

// ==============================================
// TYPES
// ==============================================

export interface EffectModifier {
  type: 'add' | 'multiply' | 'replace';
  value: number;
}

export interface EffectConfig {
  effectId: string;
  skillId: string;
  modifier: EffectModifier;
  description: string;
}

// ==============================================
// EFFECT DEFINITIONS
// ==============================================

/**
 * Effect configurations for each effectId
 */
const EFFECT_CONFIGS: Record<string, Omit<EffectConfig, 'skillId'>> = {
  // Power path
  long_word_bonus: {
    effectId: 'long_word_bonus',
    modifier: { type: 'multiply', value: 1.25 },
    description: '6+ letter words deal 25% more damage to bosses',
  },
  rare_letter_crit: {
    effectId: 'rare_letter_crit',
    modifier: { type: 'add', value: 0.2 },
    description: 'Q/X/Z words have 20% crit chance',
  },
  combo_multiplier_boost: {
    effectId: 'combo_multiplier_boost',
    modifier: { type: 'add', value: 0.25 },
    description: 'Combo multiplier +0.25x',
  },
  boss_damage_boost: {
    effectId: 'boss_damage_boost',
    modifier: { type: 'multiply', value: 1.15 },
    description: '+15% damage to bosses',
  },

  // Strategy path
  chain_duration_extend: {
    effectId: 'chain_duration_extend',
    modifier: { type: 'add', value: 3000 },
    description: 'Chain tiles last 3s longer',
  },
  ice_melt_adjacent: {
    effectId: 'ice_melt_adjacent',
    modifier: { type: 'add', value: 1 },
    description: 'Words adjacent to ice melt 2 tiles',
  },
  cascade_bonus_words: {
    effectId: 'cascade_bonus_words',
    modifier: { type: 'replace', value: 1 },
    description: 'Cascades can form bonus words',
  },
  special_tile_upgrade: {
    effectId: 'special_tile_upgrade',
    modifier: { type: 'add', value: 0.1 },
    description: '10% chance special tiles upgrade',
  },

  // Utility path
  powerup_cooldown_reduce: {
    effectId: 'powerup_cooldown_reduce',
    modifier: { type: 'add', value: -10 },
    description: 'Power-up cooldowns -10s',
  },
  unlock_power_slot_2: {
    effectId: 'unlock_power_slot_2',
    modifier: { type: 'add', value: 1 },
    description: 'Unlock 2nd power-up slot',
  },
  hint_duration_double: {
    effectId: 'hint_duration_double',
    modifier: { type: 'multiply', value: 2 },
    description: 'Hints visible for 10s instead of 5s',
  },
  unlock_power_slot_3: {
    effectId: 'unlock_power_slot_3',
    modifier: { type: 'add', value: 1 },
    description: 'Unlock 3rd power-up slot',
  },
  unlock_advanced_multiplier: {
    effectId: 'unlock_advanced_multiplier',
    modifier: { type: 'replace', value: 1 },
    description: 'Unlock 3x score multiplier',
  },
};

// ==============================================
// CORE FUNCTIONS
// ==============================================

/**
 * Get all active effects based on unlocked skills
 */
export function getActiveEffects(unlockedSkills: Set<string>): EffectConfig[] {
  const effects: EffectConfig[] = [];

  for (const skillId of unlockedSkills) {
    const skill = SKILL_CATALOG.find((s) => s.id === skillId);
    if (!skill) continue;

    const effectConfig = EFFECT_CONFIGS[skill.effectId];
    if (effectConfig) {
      effects.push({
        ...effectConfig,
        skillId,
      });
    }
  }

  return effects;
}

/**
 * Calculate a value with effect modifiers applied
 */
export function calculateEffectValue(
  effectId: string,
  baseValue: number,
  unlockedSkills: Set<string>
): number {
  const effects = getActiveEffects(unlockedSkills);
  const effect = effects.find((e) => e.effectId === effectId);

  if (!effect) return baseValue;

  switch (effect.modifier.type) {
    case 'add':
      return baseValue + effect.modifier.value;
    case 'multiply':
      return baseValue * effect.modifier.value;
    case 'replace':
      return effect.modifier.value;
    default:
      return baseValue;
  }
}

// ==============================================
// CONVENIENCE FUNCTIONS
// ==============================================

/**
 * Get maximum power-up slots (1 base + unlocked)
 */
export function getMaxPowerUpSlots(unlockedSkills: Set<string>): number {
  let slots = 1;
  if (unlockedSkills.has('power_slot_2')) slots++;
  if (unlockedSkills.has('power_slot_3')) slots++;
  return slots;
}

/**
 * Get power-up cooldown multiplier (lower = faster cooldowns)
 */
export function getPowerUpCooldownMultiplier(unlockedSkills: Set<string>): number {
  const baseCooldown = 60; // 60 seconds base
  const reduction = unlockedSkills.has('quick_charge') ? 10 : 0;
  return (baseCooldown - reduction) / baseCooldown;
}

/**
 * Get combo multiplier bonus from skills
 */
export function getComboMultiplierBonus(unlockedSkills: Set<string>): number {
  if (unlockedSkills.has('combo_amplifier')) {
    return 0.25;
  }
  return 0;
}

/**
 * Get boss damage multiplier from skills
 */
export function getBossDamageMultiplier(unlockedSkills: Set<string>): number {
  if (unlockedSkills.has('boss_slayer')) {
    return 1.15;
  }
  return 1.0;
}

/**
 * Get hint display duration in milliseconds
 */
export function getHintDuration(unlockedSkills: Set<string>): number {
  const base = 5000;
  if (unlockedSkills.has('extended_hints')) {
    return base * 2;
  }
  return base;
}

/**
 * Check if advanced multiplier power-up is unlocked
 */
export function hasAdvancedMultiplier(unlockedSkills: Set<string>): boolean {
  return unlockedSkills.has('advanced_multiplier');
}

/**
 * Get long word damage bonus (for power_strike)
 */
export function getLongWordDamageMultiplier(
  wordLength: number,
  unlockedSkills: Set<string>
): number {
  if (wordLength >= 6 && unlockedSkills.has('power_strike')) {
    return 1.25;
  }
  return 1.0;
}

/**
 * Get chain tile duration bonus in milliseconds
 */
export function getChainDurationBonus(unlockedSkills: Set<string>): number {
  if (unlockedSkills.has('chain_mastery')) {
    return 3000;
  }
  return 0;
}
