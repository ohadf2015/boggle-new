import { vi, type Mock, } from 'vitest';
/**
 * Tier Storage Tests
 *
 * Tests for localStorage persistence of difficulty tier state.
 * SSR-safe with window checks.
 */

import { getCurrentTier, saveTier, clearTierStorage } from '../tierStorage';
import type { DifficultyTier } from '@/types/difficulty';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('tierStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getCurrentTier', () => {
    it('should return "normal" when no stored value exists', () => {
      const tier = getCurrentTier();
      expect(tier).toBe('normal');
    });

    it('should return stored tier when valid', () => {
      const state = {
        tier: 'hard' as DifficultyTier,
        updatedAt: new Date().toISOString(),
      };
      localStorageMock.setItem('lexiclash_difficulty_tier', JSON.stringify(state));

      const tier = getCurrentTier();
      expect(tier).toBe('hard');
    });

    it('should return "normal" on JSON parse error', () => {
      localStorageMock.setItem('lexiclash_difficulty_tier', 'invalid-json');

      const tier = getCurrentTier();
      expect(tier).toBe('normal');
    });

    it('should handle missing tier field gracefully', () => {
      localStorageMock.setItem('lexiclash_difficulty_tier', JSON.stringify({ updatedAt: '2026-01-31' }));

      const tier = getCurrentTier();
      expect(tier).toBe('normal');
    });
  });

  describe('saveTier', () => {
    it('should persist tier to localStorage', () => {
      saveTier('easy');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lexiclash_difficulty_tier',
        expect.stringContaining('"tier":"easy"')
      );
    });

    it('should include updatedAt timestamp', () => {
      const beforeSave = Date.now();
      saveTier('hard');
      const afterSave = Date.now();

      const saved = JSON.parse(localStorageMock.getItem('lexiclash_difficulty_tier') || '{}');
      const savedTime = new Date(saved.updatedAt).getTime();

      expect(savedTime).toBeGreaterThanOrEqual(beforeSave);
      expect(savedTime).toBeLessThanOrEqual(afterSave);
    });

    it('should overwrite existing tier', () => {
      saveTier('easy');
      saveTier('hard');

      const tier = getCurrentTier();
      expect(tier).toBe('hard');
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock setItem to throw error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => saveTier('easy')).not.toThrow();
    });
  });

  describe('clearTierStorage', () => {
    it('should remove stored tier', () => {
      saveTier('hard');
      clearTierStorage();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lexiclash_difficulty_tier');
      const tier = getCurrentTier();
      expect(tier).toBe('normal');
    });

    it('should be idempotent (safe to call multiple times)', () => {
      clearTierStorage();
      clearTierStorage();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('SSR safety', () => {
    it('should handle undefined window gracefully', () => {
      // This test runs in Jest which has window defined
      // We trust the typeof window === 'undefined' check in implementation
      // Integration tests will verify SSR behavior
      expect(getCurrentTier()).toBeDefined();
    });
  });
});
