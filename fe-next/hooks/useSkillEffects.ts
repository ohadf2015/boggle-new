/**
 * useSkillEffects Hook
 *
 * Provides reactive skill effect values based on unlocked skills.
 * Use this hook to get current skill modifiers for gameplay.
 */

import { useMemo, useCallback } from 'react';
import { useSkillTreeStore } from './useSkillTreeStore';
import {
  getMaxPowerUpSlots,
  getPowerUpCooldownMultiplier,
  getComboMultiplierBonus,
  getBossDamageMultiplier,
  getHintDuration,
  hasAdvancedMultiplier,
  getLongWordDamageMultiplier,
  getChainDurationBonus,
} from '@/utils/skillEffects';

// ==============================================
// TYPES
// ==============================================

export interface UseSkillEffectsReturn {
  /** Maximum power-up slots (1-3) */
  maxPowerUpSlots: number;
  /** Power-up cooldown multiplier (1.0 = normal, 0.833 = 10s reduction) */
  powerUpCooldownMultiplier: number;
  /** Combo multiplier bonus from skills */
  comboMultiplierBonus: number;
  /** Boss damage multiplier */
  bossDamageMultiplier: number;
  /** Hint display duration in ms */
  hintDuration: number;
  /** Whether advanced (3x) multiplier is unlocked */
  hasAdvancedMultiplier: boolean;
  /** Get damage multiplier for a word (based on length) */
  getLongWordDamageMultiplier: (wordLength: number) => number;
  /** Get chain tile duration bonus in ms */
  getChainDurationBonus: () => number;
}

// ==============================================
// HOOK
// ==============================================

export function useSkillEffects(): UseSkillEffectsReturn {
  const unlockedSkills = useSkillTreeStore((state) => state.unlockedSkills);

  // Memoize computed values
  const maxPowerUpSlotsValue = useMemo(
    () => getMaxPowerUpSlots(unlockedSkills),
    [unlockedSkills]
  );

  const powerUpCooldownMultiplierValue = useMemo(
    () => getPowerUpCooldownMultiplier(unlockedSkills),
    [unlockedSkills]
  );

  const comboMultiplierBonusValue = useMemo(
    () => getComboMultiplierBonus(unlockedSkills),
    [unlockedSkills]
  );

  const bossDamageMultiplierValue = useMemo(
    () => getBossDamageMultiplier(unlockedSkills),
    [unlockedSkills]
  );

  const hintDurationValue = useMemo(
    () => getHintDuration(unlockedSkills),
    [unlockedSkills]
  );

  const hasAdvancedMultiplierValue = useMemo(
    () => hasAdvancedMultiplier(unlockedSkills),
    [unlockedSkills]
  );

  // Callbacks for word-specific calculations
  const getLongWordDamageMultiplierFn = useCallback(
    (wordLength: number) => getLongWordDamageMultiplier(wordLength, unlockedSkills),
    [unlockedSkills]
  );

  const getChainDurationBonusFn = useCallback(
    () => getChainDurationBonus(unlockedSkills),
    [unlockedSkills]
  );

  return useMemo(() => ({
    maxPowerUpSlots: maxPowerUpSlotsValue,
    powerUpCooldownMultiplier: powerUpCooldownMultiplierValue,
    comboMultiplierBonus: comboMultiplierBonusValue,
    bossDamageMultiplier: bossDamageMultiplierValue,
    hintDuration: hintDurationValue,
    hasAdvancedMultiplier: hasAdvancedMultiplierValue,
    getLongWordDamageMultiplier: getLongWordDamageMultiplierFn,
    getChainDurationBonus: getChainDurationBonusFn,
  }), [maxPowerUpSlotsValue, powerUpCooldownMultiplierValue, comboMultiplierBonusValue,
    bossDamageMultiplierValue, hintDurationValue, hasAdvancedMultiplierValue,
    getLongWordDamageMultiplierFn, getChainDurationBonusFn]);
}
