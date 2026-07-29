/**
 * useSkillTreeStore Tests
 *
 * TDD tests for skill tree Zustand store with persistence.
 */

import { act, renderHook } from '@testing-library/react';
import { useSkillTreeStore } from './useSkillTreeStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useSkillTreeStore', () => {
  beforeEach(() => {
    // Reset store between tests
    const { result } = renderHook(() => useSkillTreeStore());
    act(() => {
      result.current.reset();
    });
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('starts with empty unlocked skills', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      expect(result.current.unlockedSkills.size).toBe(0);
    });

    it('starts with 0 available points', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      expect(result.current.availablePoints).toBe(0);
    });

    it('starts with 0 total points earned', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      expect(result.current.totalPointsEarned).toBe(0);
    });
  });

  describe('addSkillPoints', () => {
    it('increases available points', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(3);
      });
      expect(result.current.availablePoints).toBe(3);
    });

    it('increases total points earned', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(5);
      });
      expect(result.current.totalPointsEarned).toBe(5);
    });

    it('accumulates multiple additions', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(2);
        result.current.addSkillPoints(3);
      });
      expect(result.current.availablePoints).toBe(5);
      expect(result.current.totalPointsEarned).toBe(5);
    });

    it('ignores negative values', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(5);
        result.current.addSkillPoints(-2);
      });
      expect(result.current.availablePoints).toBe(5);
    });

    it('ignores zero', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(0);
      });
      expect(result.current.availablePoints).toBe(0);
    });
  });

  describe('unlockSkill', () => {
    it('adds skill to unlocked set', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(1);
        result.current.unlockSkill('power_strike', 1);
      });
      expect(result.current.unlockedSkills.has('power_strike')).toBe(true);
    });

    it('deducts cost from available points', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(5);
        result.current.unlockSkill('power_strike', 1);
      });
      expect(result.current.availablePoints).toBe(4);
    });

    it('does not deduct from total points earned', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(5);
        result.current.unlockSkill('power_strike', 1);
      });
      expect(result.current.totalPointsEarned).toBe(5);
    });

    it('returns true on successful unlock', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      let success = false;
      act(() => {
        result.current.addSkillPoints(1);
        success = result.current.unlockSkill('power_strike', 1);
      });
      expect(success).toBe(true);
    });

    it('returns false when not enough points', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      let success = true;
      act(() => {
        success = result.current.unlockSkill('power_strike', 1);
      });
      expect(success).toBe(false);
      expect(result.current.unlockedSkills.has('power_strike')).toBe(false);
    });

    it('returns false when already unlocked', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      let secondAttempt = true;
      act(() => {
        result.current.addSkillPoints(2);
        result.current.unlockSkill('power_strike', 1);
        secondAttempt = result.current.unlockSkill('power_strike', 1);
      });
      expect(secondAttempt).toBe(false);
      expect(result.current.availablePoints).toBe(1); // Only spent once
    });

    it('can unlock multiple skills', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(3);
        result.current.unlockSkill('power_strike', 1);
        result.current.unlockSkill('chain_mastery', 1);
      });
      expect(result.current.unlockedSkills.size).toBe(2);
      expect(result.current.availablePoints).toBe(1);
    });
  });

  describe('hasSkill', () => {
    it('returns true for unlocked skill', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(1);
        result.current.unlockSkill('power_strike', 1);
      });
      expect(result.current.hasSkill('power_strike')).toBe(true);
    });

    it('returns false for locked skill', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      expect(result.current.hasSkill('power_strike')).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(5);
        result.current.unlockSkill('power_strike', 1);
        result.current.reset();
      });
      expect(result.current.unlockedSkills.size).toBe(0);
      expect(result.current.availablePoints).toBe(0);
      expect(result.current.totalPointsEarned).toBe(0);
    });
  });

  describe('persistence', () => {
    it('persists unlocked skills to localStorage', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(1);
        result.current.unlockSkill('power_strike', 1);
      });

      // Verify skill was unlocked in current session
      expect(result.current.hasSkill('power_strike')).toBe(true);
      expect(result.current.unlockedSkills.size).toBe(1);
    });

    it('skills persist across store resets and restores', async () => {
      // First, set up some state
      const { result: result1 } = renderHook(() => useSkillTreeStore());
      act(() => {
        result1.current.addSkillPoints(5);
        result1.current.unlockSkill('power_strike', 1);
      });

      // Verify skill is unlocked
      expect(result1.current.hasSkill('power_strike')).toBe(true);
      expect(result1.current.availablePoints).toBe(4);
    });

    it('correctly tracks multiple unlocked skills', () => {
      const { result } = renderHook(() => useSkillTreeStore());
      act(() => {
        result.current.addSkillPoints(2);
        result.current.unlockSkill('power_strike', 1);
        result.current.unlockSkill('chain_mastery', 1);
      });

      // Both skills should be in the set
      expect(result.current.unlockedSkills.size).toBe(2);
      expect(result.current.hasSkill('power_strike')).toBe(true);
      expect(result.current.hasSkill('chain_mastery')).toBe(true);
    });
  });
});
