/**
 * useSkillEffects Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSkillEffects } from './useSkillEffects';
import { useSkillTreeStore } from './useSkillTreeStore';

describe('useSkillEffects', () => {
  beforeEach(() => {
    // Reset skill tree store
    useSkillTreeStore.getState().reset();
  });

  describe('with no skills unlocked', () => {
    it('returns default values', () => {
      const { result } = renderHook(() => useSkillEffects());

      expect(result.current.maxPowerUpSlots).toBe(1);
      expect(result.current.powerUpCooldownMultiplier).toBe(1.0);
      expect(result.current.comboMultiplierBonus).toBe(0);
      expect(result.current.bossDamageMultiplier).toBe(1.0);
      expect(result.current.hintDuration).toBe(5000);
      expect(result.current.hasAdvancedMultiplier).toBe(false);
    });
  });

  describe('with skills unlocked', () => {
    it('returns 2 slots with power_slot_2', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(1);
        useSkillTreeStore.getState().unlockSkill('power_slot_2', 1);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.maxPowerUpSlots).toBe(2);
    });

    it('returns reduced cooldown with quick_charge', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(1);
        useSkillTreeStore.getState().unlockSkill('quick_charge', 1);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.powerUpCooldownMultiplier).toBeCloseTo(0.833, 2);
    });

    it('returns combo bonus with combo_amplifier', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(3);
        useSkillTreeStore.getState().unlockSkill('power_strike', 1);
        useSkillTreeStore.getState().unlockSkill('combo_amplifier', 2);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.comboMultiplierBonus).toBe(0.25);
    });

    it('returns boss damage with boss_slayer', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(6);
        useSkillTreeStore.getState().unlockSkill('power_strike', 1);
        useSkillTreeStore.getState().unlockSkill('combo_amplifier', 2);
        useSkillTreeStore.getState().unlockSkill('boss_slayer', 3);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.bossDamageMultiplier).toBe(1.15);
    });

    it('returns extended hint duration with extended_hints', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(3);
        useSkillTreeStore.getState().unlockSkill('quick_charge', 1);
        useSkillTreeStore.getState().unlockSkill('extended_hints', 2);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.hintDuration).toBe(10000);
    });
  });

  describe('helper functions', () => {
    it('getLongWordDamageMultiplier returns 1.25 for 6+ letters with power_strike', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(1);
        useSkillTreeStore.getState().unlockSkill('power_strike', 1);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.getLongWordDamageMultiplier(6)).toBe(1.25);
      expect(result.current.getLongWordDamageMultiplier(5)).toBe(1.0);
    });

    it('getChainDurationBonus returns 3000 with chain_mastery', () => {
      act(() => {
        useSkillTreeStore.getState().addSkillPoints(1);
        useSkillTreeStore.getState().unlockSkill('chain_mastery', 1);
      });

      const { result } = renderHook(() => useSkillEffects());
      expect(result.current.getChainDurationBonus()).toBe(3000);
    });
  });

  describe('reactivity', () => {
    it('updates when skill is unlocked', () => {
      const { result } = renderHook(() => useSkillEffects());

      expect(result.current.maxPowerUpSlots).toBe(1);

      act(() => {
        useSkillTreeStore.getState().addSkillPoints(1);
        useSkillTreeStore.getState().unlockSkill('power_slot_2', 1);
      });

      // Re-render hook to get updated values
      const { result: result2 } = renderHook(() => useSkillEffects());
      expect(result2.current.maxPowerUpSlots).toBe(2);
    });
  });
});
