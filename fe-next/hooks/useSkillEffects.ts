/**
 * useSkillEffects Hook
 *
 * Computes active skill effects for gameplay based on unlocked skills.
 * Returns multipliers and bonuses that should be applied in AdventureGame.
 *
 * Usage:
 * ```
 * const {
 *   maxPowerUpSlots,
 *   powerUpCooldownMultiplier,
 *   comboMultiplierBonus,
 *   bossDamageMultiplier,
 *   hintDuration,
 *   getLongWordDamageMultiplier,
 * } = useSkillEffects();
 * ```
 */

import { useMemo } from 'react';
import { useSkillTreeStore, SKILL_CATALOG } from '@/stores/skillTreeStore';
import type { SkillEffects } from '@/types/skills';

// ==============================================
// DEFAULT VALUES
// ==============================================

const DEFAULT_EFFECTS: SkillEffects = {
  maxPowerUpSlots: 3,
  powerUpCooldownMultiplier: 1.0,
  comboMultiplierBonus: 0,
  bossDamageMultiplier: 1.0,
  hintDuration: 5,
  getLongWordDamageMultiplier: () => 1.0,
  xpBonus: 1.0,
  goldBonus: 1.0,
};

// ==============================================
// HOOK
// ==============================================

export function useSkillEffects(): SkillEffects {
  const unlockedSkills = useSkillTreeStore((state) => state.unlockedSkills);

  const effects = useMemo<SkillEffects>(() => {
    // Start with defaults
    let maxPowerUpSlots = DEFAULT_EFFECTS.maxPowerUpSlots;
    let powerUpCooldownMultiplier = DEFAULT_EFFECTS.powerUpCooldownMultiplier;
    let comboMultiplierBonus = DEFAULT_EFFECTS.comboMultiplierBonus;
    let bossDamageMultiplier = DEFAULT_EFFECTS.bossDamageMultiplier;
    let hintDuration = DEFAULT_EFFECTS.hintDuration;
    let longWordDamageBonus = 1.0;
    let xpBonus = DEFAULT_EFFECTS.xpBonus;
    let goldBonus = DEFAULT_EFFECTS.goldBonus;

    // Apply effects from each unlocked skill
    for (const skillId of unlockedSkills) {
      const skill = SKILL_CATALOG[skillId];
      if (!skill) continue;

      switch (skill.effectType) {
        case 'maxPowerUpSlots':
          // Take the highest value if multiple skills provide slots
          maxPowerUpSlots = Math.max(maxPowerUpSlots, skill.effectValue);
          break;

        case 'powerUpCooldownReduction':
          // Multiply cooldown multipliers (0.9 * 0.85 = 0.765)
          powerUpCooldownMultiplier *= skill.effectValue;
          break;

        case 'comboMultiplierBonus':
          // Additive bonus to combo multiplier
          comboMultiplierBonus += skill.effectValue;
          break;

        case 'bossDamageMultiplier':
          // Multiply damage multipliers (1.1 * 1.25 = 1.375)
          bossDamageMultiplier *= skill.effectValue;
          break;

        case 'hintDuration':
          // Take the highest value
          hintDuration = Math.max(hintDuration, skill.effectValue);
          break;

        case 'longWordDamageBonus':
          // Multiply long word bonuses
          longWordDamageBonus *= skill.effectValue;
          break;

        case 'xpBonus':
          // Multiply XP bonuses
          xpBonus *= skill.effectValue;
          break;

        case 'goldBonus':
          // Multiply gold bonuses
          goldBonus *= skill.effectValue;
          break;
      }
    }

    return {
      maxPowerUpSlots,
      powerUpCooldownMultiplier,
      comboMultiplierBonus,
      bossDamageMultiplier,
      hintDuration,
      getLongWordDamageMultiplier: (wordLength: number) => {
        // Apply long word bonus only for 6+ letter words
        return wordLength >= 6 ? longWordDamageBonus : 1.0;
      },
      xpBonus,
      goldBonus,
    };
  }, [unlockedSkills]);

  return effects;
}
