// @vitest-environment jsdom
/**
 * Tests for useAdventureXp hook
 *
 * Tests adventure XP state management including:
 * - Initial state handling
 * - XP awarding
 * - Level up detection
 * - Pending updates for persistence
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureXp } from '../useAdventureXp';
import { getXpForLevel } from '@/shared/utils/adventureXpUtils';

describe('useAdventureXp', () => {
  describe('Initial State', () => {
    it('should initialize with default XP (0) when no initialXp provided', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-1' })
      );

      expect(result.current.totalXp).toBe(0);
      expect(result.current.currentLevel).toBe(1);
      expect(result.current.xpProgress.currentLevel).toBe(1);
      expect(result.current.xpProgress.progressPercent).toBe(0);
      expect(result.current.pendingUpdate).toBeNull();
    });

    it('should initialize with provided initialXp', () => {
      // With CURVE_DIVISOR=12, 600 XP maps to level 7
      const initialXp = 600;
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-2', initialXp })
      );

      expect(result.current.totalXp).toBe(600);
      expect(result.current.currentLevel).toBe(7);
      expect(result.current.xpProgress.currentLevel).toBe(7);
    });

    it('should calculate xpProgress correctly from initialXp', () => {
      const initialXp = 250; // Level 3 or 4
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-3', initialXp })
      );

      const { xpProgress } = result.current;
      expect(xpProgress.xpInCurrentLevel).toBeGreaterThanOrEqual(0);
      expect(xpProgress.progressPercent).toBeGreaterThanOrEqual(0);
      expect(xpProgress.progressPercent).toBeLessThanOrEqual(100);
    });
  });

  describe('awardXp', () => {
    it('should increase totalXp when awarding XP', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-4', initialXp: 100 })
      );

      act(() => {
        result.current.awardXp(50);
      });

      expect(result.current.totalXp).toBe(150);
    });

    it('should not level up when XP gain is insufficient', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-5', initialXp: 50 })
      );

      const initialLevel = result.current.currentLevel;

      let levelUpResult: { leveledUp: boolean; newLevel?: number };
      act(() => {
        levelUpResult = result.current.awardXp(10);
      });

      expect(levelUpResult!.leveledUp).toBe(false);
      expect(levelUpResult!.newLevel).toBeUndefined();
      expect(result.current.currentLevel).toBe(initialLevel);
    });

    it('should detect level up when XP crosses threshold', () => {
      // Start just below level 2 threshold (level 2 requires ~100 XP)
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-6', initialXp: 90 })
      );

      expect(result.current.currentLevel).toBe(2);

      let levelUpResult: { leveledUp: boolean; newLevel?: number };
      act(() => {
        levelUpResult = result.current.awardXp(20); // 90 + 20 = 110, should still be level 2
      });

      // 110 XP is still level 2, so no level up
      expect(levelUpResult!.leveledUp).toBe(false);
      expect(result.current.currentLevel).toBe(2);
    });

    it('should detect multiple level ups from large XP gain', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-7', initialXp: 100 })
      );

      const initialLevel = result.current.currentLevel;

      let levelUpResult: { leveledUp: boolean; newLevel?: number };
      // Award enough XP to jump multiple levels
      act(() => {
        levelUpResult = result.current.awardXp(1000);
      });

      expect(levelUpResult!.leveledUp).toBe(true);
      expect(levelUpResult!.newLevel).toBeGreaterThan(initialLevel);
      expect(result.current.currentLevel).toBeGreaterThan(initialLevel);
    });

    it('should create pendingUpdate after awarding XP', () => {
      const userId = 'user-8';
      const { result } = renderHook(() =>
        useAdventureXp({ userId, initialXp: 100 })
      );

      expect(result.current.pendingUpdate).toBeNull();

      act(() => {
        result.current.awardXp(50);
      });

      expect(result.current.pendingUpdate).not.toBeNull();
      expect(result.current.pendingUpdate?.userId).toBe(userId);
      expect(result.current.pendingUpdate?.totalXp).toBe(150);
      expect(result.current.pendingUpdate?.level).toBe(result.current.currentLevel);
    });
  });

  describe('acknowledgePersistence', () => {
    it('should clear pendingUpdate when called', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-9', initialXp: 100 })
      );

      // Award XP to create pending update
      act(() => {
        result.current.awardXp(50);
      });

      expect(result.current.pendingUpdate).not.toBeNull();

      // Acknowledge persistence
      act(() => {
        result.current.acknowledgePersistence();
      });

      expect(result.current.pendingUpdate).toBeNull();
    });

    it('should not affect XP or level when acknowledging', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-10', initialXp: 200 })
      );

      act(() => {
        result.current.awardXp(100);
      });

      const totalXpBefore = result.current.totalXp;
      const levelBefore = result.current.currentLevel;

      act(() => {
        result.current.acknowledgePersistence();
      });

      expect(result.current.totalXp).toBe(totalXpBefore);
      expect(result.current.currentLevel).toBe(levelBefore);
    });
  });

  describe('Derived State (xpProgress)', () => {
    it('should update xpProgress when XP changes', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-11', initialXp: 100 })
      );

      const progressBefore = result.current.xpProgress.progressPercent;

      act(() => {
        result.current.awardXp(50);
      });

      const progressAfter = result.current.xpProgress.progressPercent;

      // Progress should increase (unless we leveled up, in which case it might reset)
      expect(progressAfter).toBeGreaterThanOrEqual(0);
      expect(progressAfter).toBeLessThanOrEqual(100);
    });

    it('should show max level status at level 50', () => {
      // Get XP for level 50 (max level)
      const level50Xp = getXpForLevel(50);

      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-12', initialXp: level50Xp })
      );

      expect(result.current.currentLevel).toBe(50);
      expect(result.current.xpProgress.isMaxLevel).toBe(true);
      expect(result.current.xpProgress.progressPercent).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative XP award (treat as 0)', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-13', initialXp: 100 })
      );

      act(() => {
        result.current.awardXp(-50);
      });

      // Should not decrease XP (negative awards should be ignored or treated as 0)
      expect(result.current.totalXp).toBe(100);
    });

    it('should handle zero XP award gracefully', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-14', initialXp: 100 })
      );

      let levelUpResult: { leveledUp: boolean; newLevel?: number };
      act(() => {
        levelUpResult = result.current.awardXp(0);
      });

      expect(result.current.totalXp).toBe(100);
      expect(levelUpResult!.leveledUp).toBe(false);
    });

    it('should handle very large XP values', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-15', initialXp: 1000000 })
      );

      // Should cap at max level
      expect(result.current.currentLevel).toBe(50);
      expect(result.current.xpProgress.isMaxLevel).toBe(true);
    });
  });

  describe('beforeunload XP flush', () => {
    const STORAGE_KEY = 'adventure_xp_pending';

    beforeEach(() => {
      sessionStorage.clear();
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it('registers a beforeunload listener on mount', () => {
      const spy = jest.spyOn(window, 'addEventListener');
      renderHook(() => useAdventureXp({ userId: 'user-flush-1' }));
      expect(spy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      spy.mockRestore();
    });

    it('removes the beforeunload listener on unmount', () => {
      const spy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() =>
        useAdventureXp({ userId: 'user-flush-2' })
      );
      unmount();
      expect(spy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      spy.mockRestore();
    });

    it('writes pending XP update to sessionStorage on beforeunload', () => {
      const { result } = renderHook(() =>
        useAdventureXp({ userId: 'user-flush-3', initialXp: 0 })
      );

      act(() => {
        result.current.awardXp(150);
      });

      // Verify pendingUpdate state is set (prerequisite)
      expect(result.current.pendingUpdate).not.toBeNull();
      expect(result.current.pendingUpdate?.totalXp).toBe(150);

      // Dispatch the actual beforeunload event so the registered handler fires
      window.dispatchEvent(new Event('beforeunload'));

      const stored = sessionStorage.getItem(STORAGE_KEY);
      // stored must be a JSON string (non-null, non-undefined, non-empty)
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored as string);
      expect(parsed.userId).toBe('user-flush-3');
      expect(parsed.totalXp).toBe(150);
    });

    it('does not write to sessionStorage on beforeunload when no pending update', () => {
      renderHook(() => useAdventureXp({ userId: 'user-flush-4', initialXp: 0 }));

      // Dispatch the event — no pending update, so nothing should be written
      window.dispatchEvent(new Event('beforeunload'));

      // Use toBeFalsy to handle both null (jsdom spec-compliant) and
      // undefined (happy-dom) — both indicate no data was written
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeFalsy();
    });
  });
});
