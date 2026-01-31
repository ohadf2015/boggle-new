/**
 * useAdventureAchievements Hook Tests
 *
 * Tests for adventure achievement state management hook with localStorage persistence.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureAchievements } from './useAdventureAchievements';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useAdventureAchievements', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('starts with empty achievement counts', () => {
      const { result } = renderHook(() => useAdventureAchievements());
      expect(Object.keys(result.current.achievementCounts)).toHaveLength(0);
    });
  });

  describe('earnAchievement', () => {
    it('earns a new achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('FIRST_WORD');
      });

      expect(result.current.isEarned('FIRST_WORD')).toBe(true);
      expect(result.current.getCount('FIRST_WORD')).toBe(1);
    });

    it('returns true for first earn', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      let isNew = false;
      act(() => {
        isNew = result.current.earnAchievement('FIRST_WORD');
      });

      expect(isNew).toBe(true);
    });

    it('returns false for repeat earn of one-time achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('FIRST_WORD');
      });

      let isNew = true;
      act(() => {
        isNew = result.current.earnAchievement('FIRST_WORD');
      });

      expect(isNew).toBe(false);
      // One-time achievements don't increment past 1
      expect(result.current.getCount('FIRST_WORD')).toBe(1);
    });

    it('increments count for repeatable achievements', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });
      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });
      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });

      expect(result.current.getCount('BOSS_SLAYER')).toBe(3);
    });

    it('returns true when tier upgrades', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      // Earn 14 times (still Bronze)
      for (let i = 0; i < 14; i++) {
        act(() => {
          result.current.earnAchievement('BOSS_SLAYER');
        });
      }

      // 15th earn should trigger tier upgrade to Silver
      let isUpgrade = false;
      act(() => {
        isUpgrade = result.current.earnAchievement('BOSS_SLAYER');
      });

      expect(isUpgrade).toBe(true);
    });

    it('returns false for invalid achievement id', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      let isNew = true;
      act(() => {
        // @ts-expect-error - Testing invalid id
        isNew = result.current.earnAchievement('INVALID_ACHIEVEMENT');
      });

      expect(isNew).toBe(false);
    });
  });

  describe('isEarned', () => {
    it('returns true for earned achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });

      expect(result.current.isEarned('BOSS_SLAYER')).toBe(true);
    });

    it('returns false for unearned achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());
      expect(result.current.isEarned('BOSS_SLAYER')).toBe(false);
    });
  });

  describe('getCount', () => {
    it('returns correct count for earned achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('WORD_STREAK_5');
      });
      act(() => {
        result.current.earnAchievement('WORD_STREAK_5');
      });
      act(() => {
        result.current.earnAchievement('WORD_STREAK_5');
      });

      expect(result.current.getCount('WORD_STREAK_5')).toBe(3);
    });

    it('returns 0 for unearned achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());
      expect(result.current.getCount('COMBO_KING')).toBe(0);
    });
  });

  describe('getTierInfo', () => {
    it('returns tier info for achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });

      const tierInfo = result.current.getTierInfo('BOSS_SLAYER');
      expect(tierInfo.count).toBe(1);
      expect(tierInfo.tier).toBe('BRONZE');
      expect(tierInfo.display).toBeDefined();
    });

    it('returns null tier for unearned achievement', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      const tierInfo = result.current.getTierInfo('COMBO_KING');
      expect(tierInfo.count).toBe(0);
      expect(tierInfo.tier).toBeNull();
    });

    it('returns progress info', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.earnAchievement('BOSS_SLAYER');
        });
      }

      const tierInfo = result.current.getTierInfo('BOSS_SLAYER');
      expect(tierInfo.progress.currentTier).toBe('BRONZE');
      expect(tierInfo.progress.nextTier).toBe('SILVER');
    });
  });

  describe('persistence', () => {
    it('persists achievements to localStorage', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('FIRST_WORD');
      });

      const stored = localStorageMock.getItem('lexiclash-adventure-achievements');
      expect(stored).toBeTruthy();
      expect(stored).toContain('FIRST_WORD');
    });

    it('restores achievements from localStorage', () => {
      // Pre-populate localStorage
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        JSON.stringify({
          BOSS_SLAYER: 5,
          FIRST_WORD: 1,
        })
      );

      const { result } = renderHook(() => useAdventureAchievements());

      expect(result.current.isEarned('BOSS_SLAYER')).toBe(true);
      expect(result.current.getCount('BOSS_SLAYER')).toBe(5);
      expect(result.current.isEarned('FIRST_WORD')).toBe(true);
    });

    it('handles corrupted localStorage gracefully', () => {
      // Pre-populate with invalid JSON
      localStorageMock.setItem(
        'lexiclash-adventure-achievements',
        'not valid json{'
      );

      // Should not throw
      const { result } = renderHook(() => useAdventureAchievements());

      expect(result.current.achievementCounts).toBeDefined();
      expect(Object.keys(result.current.achievementCounts)).toHaveLength(0);
    });
  });

  describe('multiple achievements', () => {
    it('tracks multiple achievements independently', () => {
      const { result } = renderHook(() => useAdventureAchievements());

      act(() => {
        result.current.earnAchievement('FIRST_WORD');
      });
      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });
      act(() => {
        result.current.earnAchievement('BOSS_SLAYER');
      });
      act(() => {
        result.current.earnAchievement('WORD_STREAK_5');
      });

      expect(result.current.getCount('FIRST_WORD')).toBe(1);
      expect(result.current.getCount('BOSS_SLAYER')).toBe(2);
      expect(result.current.getCount('WORD_STREAK_5')).toBe(1);
    });
  });
});
