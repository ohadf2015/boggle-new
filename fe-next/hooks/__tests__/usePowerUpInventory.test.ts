/**
 * Tests for usePowerUpInventory Hook
 *
 * Tests localStorage persistence, timestamp-based cooldowns,
 * and level transition reset functionality.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePowerUpInventory } from '../usePowerUpInventory';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('usePowerUpInventory', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default State', () => {
    it('should return default inventory on first load', () => {
      const { result } = renderHook(() => usePowerUpInventory());

      // All power-ups should be unlocked by default (v2.0 requirement)
      expect(result.current.isUnlocked('freezeTime')).toBe(true);
      expect(result.current.isUnlocked('hint')).toBe(true);
      expect(result.current.isUnlocked('scoreMultiplier')).toBe(true);

      // All cooldowns should be ready (0 remaining)
      expect(result.current.getCooldownRemaining('freezeTime')).toBe(0);
      expect(result.current.getCooldownRemaining('hint')).toBe(0);
      expect(result.current.getCooldownRemaining('scoreMultiplier')).toBe(0);
    });

    it('should persist default inventory to localStorage', () => {
      renderHook(() => usePowerUpInventory());

      const stored = mockLocalStorage.getItem('power-up-inventory');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.freezeTimeUnlocked).toBe(true);
      expect(parsed.hintUnlocked).toBe(true);
      expect(parsed.scoreMultiplierUnlocked).toBe(true);
      expect(parsed.cooldownStartedAt.freezeTime).toBe(0);
      expect(parsed.cooldownStartedAt.hint).toBe(0);
      expect(parsed.cooldownStartedAt.scoreMultiplier).toBe(0);
    });
  });

  describe('Cooldown Management', () => {
    it('should set cooldown timestamp when startCooldown is called', () => {
      const { result } = renderHook(() => usePowerUpInventory());
      const now = Date.now();

      act(() => {
        result.current.startCooldown('freezeTime');
      });

      // Cooldown timestamp should be set (within 100ms of now)
      const stored = JSON.parse(mockLocalStorage.getItem('power-up-inventory')!);
      expect(stored.cooldownStartedAt.freezeTime).toBeGreaterThanOrEqual(now);
      expect(stored.cooldownStartedAt.freezeTime).toBeLessThanOrEqual(Date.now());
    });

    it('should return 0 cooldown remaining when timestamp is 0', () => {
      const { result } = renderHook(() => usePowerUpInventory());

      const remaining = result.current.getCooldownRemaining('freezeTime');
      expect(remaining).toBe(0);
    });

    it('should calculate remaining cooldown from timestamp', () => {
      // Set cooldown started 10 seconds ago (60s total cooldown)
      const tenSecondsAgo = Date.now() - 10000;
      mockLocalStorage.setItem(
        'power-up-inventory',
        JSON.stringify({
          freezeTimeUnlocked: true,
          hintUnlocked: true,
          scoreMultiplierUnlocked: true,
          cooldownStartedAt: {
            freezeTime: tenSecondsAgo,
            hint: 0,
            scoreMultiplier: 0,
          },
        })
      );

      const { result } = renderHook(() => usePowerUpInventory());

      const remaining = result.current.getCooldownRemaining('freezeTime');
      // Should be ~50 seconds remaining (60 - 10)
      expect(remaining).toBeGreaterThan(49);
      expect(remaining).toBeLessThanOrEqual(50);
    });

    it('should return 0 when cooldown has expired', () => {
      // Set cooldown started 70 seconds ago (60s total cooldown)
      const seventySecondsAgo = Date.now() - 70000;
      mockLocalStorage.setItem(
        'power-up-inventory',
        JSON.stringify({
          freezeTimeUnlocked: true,
          hintUnlocked: true,
          scoreMultiplierUnlocked: true,
          cooldownStartedAt: {
            freezeTime: seventySecondsAgo,
            hint: 0,
            scoreMultiplier: 0,
          },
        })
      );

      const { result } = renderHook(() => usePowerUpInventory());

      const remaining = result.current.getCooldownRemaining('freezeTime');
      expect(remaining).toBe(0);
    });
  });

  describe('Level Transition Reset', () => {
    it('should clear all cooldown timestamps when resetCooldowns is called', () => {
      // Start with active cooldowns
      const now = Date.now();
      mockLocalStorage.setItem(
        'power-up-inventory',
        JSON.stringify({
          freezeTimeUnlocked: true,
          hintUnlocked: true,
          scoreMultiplierUnlocked: true,
          cooldownStartedAt: {
            freezeTime: now,
            hint: now,
            scoreMultiplier: now,
          },
        })
      );

      const { result } = renderHook(() => usePowerUpInventory());

      // Reset cooldowns
      act(() => {
        result.current.resetCooldowns();
      });

      // All cooldowns should be cleared
      expect(result.current.getCooldownRemaining('freezeTime')).toBe(0);
      expect(result.current.getCooldownRemaining('hint')).toBe(0);
      expect(result.current.getCooldownRemaining('scoreMultiplier')).toBe(0);

      // Verify localStorage updated
      const stored = JSON.parse(mockLocalStorage.getItem('power-up-inventory')!);
      expect(stored.cooldownStartedAt.freezeTime).toBe(0);
      expect(stored.cooldownStartedAt.hint).toBe(0);
      expect(stored.cooldownStartedAt.scoreMultiplier).toBe(0);
    });

    it('should persist reset state to localStorage', () => {
      const now = Date.now();
      mockLocalStorage.setItem(
        'power-up-inventory',
        JSON.stringify({
          freezeTimeUnlocked: true,
          hintUnlocked: true,
          scoreMultiplierUnlocked: true,
          cooldownStartedAt: {
            freezeTime: now,
            hint: now,
            scoreMultiplier: now,
          },
        })
      );

      const { result } = renderHook(() => usePowerUpInventory());

      act(() => {
        result.current.resetCooldowns();
      });

      const stored = JSON.parse(mockLocalStorage.getItem('power-up-inventory')!);
      expect(stored.cooldownStartedAt).toEqual({
        freezeTime: 0,
        hint: 0,
        scoreMultiplier: 0,
      });
    });
  });

  describe('Persistence', () => {
    it('should load inventory from localStorage on mount', () => {
      // Pre-populate localStorage
      mockLocalStorage.setItem(
        'power-up-inventory',
        JSON.stringify({
          freezeTimeUnlocked: true,
          hintUnlocked: false,
          scoreMultiplierUnlocked: true,
          cooldownStartedAt: {
            freezeTime: 0,
            hint: 0,
            scoreMultiplier: Date.now() - 30000, // 30s ago
          },
        })
      );

      const { result } = renderHook(() => usePowerUpInventory());

      expect(result.current.isUnlocked('freezeTime')).toBe(true);
      expect(result.current.isUnlocked('hint')).toBe(false);
      expect(result.current.isUnlocked('scoreMultiplier')).toBe(true);

      const remaining = result.current.getCooldownRemaining('scoreMultiplier');
      expect(remaining).toBeGreaterThan(29);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it('should persist changes to localStorage immediately', () => {
      const { result } = renderHook(() => usePowerUpInventory());

      act(() => {
        result.current.startCooldown('hint');
      });

      const stored = JSON.parse(mockLocalStorage.getItem('power-up-inventory')!);
      expect(stored.cooldownStartedAt.hint).toBeGreaterThan(0);
    });
  });

  describe('Multiple Power-Up Types', () => {
    it('should handle independent cooldowns for each power-up type', () => {
      const { result } = renderHook(() => usePowerUpInventory());

      act(() => {
        result.current.startCooldown('freezeTime');
      });

      // Only freezeTime should have cooldown
      expect(result.current.getCooldownRemaining('freezeTime')).toBeGreaterThan(0);
      expect(result.current.getCooldownRemaining('hint')).toBe(0);
      expect(result.current.getCooldownRemaining('scoreMultiplier')).toBe(0);

      act(() => {
        result.current.startCooldown('scoreMultiplier');
      });

      // Both should have cooldowns
      expect(result.current.getCooldownRemaining('freezeTime')).toBeGreaterThan(0);
      expect(result.current.getCooldownRemaining('hint')).toBe(0);
      expect(result.current.getCooldownRemaining('scoreMultiplier')).toBeGreaterThan(0);
    });
  });
});
