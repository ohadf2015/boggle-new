/**
 * Tests for useAdventureCurrency hook
 *
 * Tests currency state management, purchase validation, and persistence tracking.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock upgradeConfig before importing hook
vi.mock('@/lib/adventure/upgradeConfig', () => ({
  getUpgradeTier: vi.fn((state: Record<string, number>, id: string) => state[id] ?? 0),
  getUpgradeEffect: vi.fn((state: Record<string, number>, id: string) => {
    const tier = state[id] ?? 0;
    if (tier === 0) return 0;
    // Simulate config values for known upgrades
    const values: Record<string, number[]> = {
      fuelTank: [10, 20, 30, 5],
      wordRadar: [0.3, 0.5, 2, 3, 1],
      luckyPickaxe: [0.1, 0.25, 1, 2],
    };
    const tiers = values[id];
    if (!tiers || tier > tiers.length) return 0;
    return tiers[tier - 1];
  }),
  purchaseUpgrade: vi.fn(
    (state: Record<string, number>, id: string, gold: number) => {
      // Simulate costs for fuelTank: 50, 100, 200, 400
      const costs: Record<string, number[]> = {
        fuelTank: [50, 100, 200, 400],
        wordRadar: [60, 120, 200, 350, 500],
      };
      const tierCosts = costs[id];
      if (!tierCosts) return null;
      const current = state[id] ?? 0;
      if (current >= tierCosts.length) return null;
      const cost = tierCosts[current];
      if (gold < cost) return null;
      return {
        state: { ...state, [id]: current + 1 },
        gold: gold - cost,
      };
    }
  ),
}));

import { useAdventureCurrency } from '../useAdventureCurrency';

describe('useAdventureCurrency', () => {
  describe('Initial state', () => {
    it('should initialize with default values when no options provided', () => {
      // GIVEN: Hook called with only userId
      // WHEN: Rendering hook
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123' })
      );

      // THEN: Should have zero gold and empty upgrades
      expect(result.current.gold).toBe(0);
      expect(result.current.upgrades).toEqual({});
      expect(result.current.pendingUpdate).toBeNull();
    });

    it('should initialize with provided initial values', () => {
      // GIVEN: Initial gold and upgrades
      const initialGold = 1500;
      const initialUpgrades = { fuelTank: 2, wordRadar: 1 };

      // WHEN: Rendering hook with initial values
      const { result } = renderHook(() =>
        useAdventureCurrency({
          userId: 'user-123',
          initialGold,
          initialUpgrades,
        })
      );

      // THEN: Should reflect initial values
      expect(result.current.gold).toBe(1500);
      expect(result.current.upgrades).toEqual({ fuelTank: 2, wordRadar: 1 });
    });
  });

  describe('addGold', () => {
    it('should increase gold amount', () => {
      // GIVEN: Hook with initial gold
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 100 })
      );

      // WHEN: Adding gold
      act(() => {
        result.current.addGold(50);
      });

      // THEN: Gold should increase
      expect(result.current.gold).toBe(150);
    });

    it('should not set pendingUpdate (deprecated — gold persists via API)', () => {
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 100 })
      );

      act(() => {
        result.current.addGold(50);
      });

      // pendingUpdate is deprecated — always null
      expect(result.current.pendingUpdate).toBeNull();
    });
  });

  describe('purchase', () => {
    it('should return true when player has sufficient gold', () => {
      // GIVEN: Hook with enough gold for fuelTank tier 1 (costs 50)
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 1000 })
      );

      // WHEN: Purchasing fuelTank upgrade
      let purchaseResult: boolean | undefined;
      act(() => {
        purchaseResult = result.current.purchase('fuelTank');
      });

      // THEN: Purchase should succeed
      expect(purchaseResult).toBe(true);
      expect(result.current.gold).toBe(950);
      expect(result.current.upgrades.fuelTank).toBe(1);
    });

    it('should return false when player has insufficient gold', () => {
      // GIVEN: Hook with not enough gold (fuelTank costs 50)
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 30 })
      );

      // WHEN: Attempting to purchase fuelTank upgrade
      let purchaseResult: boolean | undefined;
      act(() => {
        purchaseResult = result.current.purchase('fuelTank');
      });

      // THEN: Purchase should fail
      expect(purchaseResult).toBe(false);
      expect(result.current.gold).toBe(30);
    });

    it('should return false when upgrade is at max tiers', () => {
      // GIVEN: Hook with max tiers of fuelTank (4 tiers)
      const { result } = renderHook(() =>
        useAdventureCurrency({
          userId: 'user-123',
          initialGold: 10000,
          initialUpgrades: { fuelTank: 4 },
        })
      );

      // WHEN: Attempting to purchase another fuelTank tier
      let purchaseResult: boolean | undefined;
      act(() => {
        purchaseResult = result.current.purchase('fuelTank');
      });

      // THEN: Purchase should fail
      expect(purchaseResult).toBe(false);
      expect(result.current.gold).toBe(10000);
      expect(result.current.upgrades.fuelTank).toBe(4);
    });

    it('should deduct correct cost for subsequent purchases', () => {
      // GIVEN: Hook with enough gold for multiple purchases
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 3000 })
      );

      // WHEN: Purchasing fuelTank twice (tier 1 = 50, tier 2 = 100)
      act(() => {
        result.current.purchase('fuelTank');
      });

      act(() => {
        result.current.purchase('fuelTank');
      });

      // THEN: Should have spent 150 total (50 + 100)
      expect(result.current.gold).toBe(2850);
      expect(result.current.upgrades.fuelTank).toBe(2);
    });

    it('should not set pendingUpdate after purchase (deprecated)', () => {
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 1000 })
      );

      act(() => {
        result.current.purchase('fuelTank');
      });

      // pendingUpdate is deprecated — always null
      expect(result.current.pendingUpdate).toBeNull();
    });
  });

  describe('getUpgradeEffect', () => {
    it('should return multiplier and description based on tier', () => {
      // GIVEN: Hook with some upgrades
      const { result } = renderHook(() =>
        useAdventureCurrency({
          userId: 'user-123',
          initialUpgrades: { fuelTank: 2, wordRadar: 1 },
        })
      );

      // WHEN: Getting upgrade effects
      const fuelEffect = result.current.getUpgradeEffect('fuelTank');
      const radarEffect = result.current.getUpgradeEffect('wordRadar');

      // THEN: multiplier = 1 + config value
      expect(fuelEffect.multiplier).toBe(21); // 1 + 20
      expect(fuelEffect.description).toBe('Tier 2');

      expect(radarEffect.multiplier).toBe(1.3); // 1 + 0.3
      expect(radarEffect.description).toBe('Tier 1');
    });

    it('should return multiplier 1 and "Not purchased" for unpurchased upgrades', () => {
      // GIVEN: Hook with no upgrades
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123' })
      );

      // WHEN: Getting effect for unpurchased upgrade
      const effect = result.current.getUpgradeEffect('fuelTank');

      // THEN: Should return base multiplier
      expect(effect.multiplier).toBe(1);
      expect(effect.description).toBe('Not purchased');
    });
  });

  describe('pendingUpdate (deprecated)', () => {
    it('should always be null (gold persists via server API)', () => {
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 1000 })
      );

      act(() => {
        result.current.addGold(100);
      });

      // pendingUpdate is deprecated — always null
      expect(result.current.pendingUpdate).toBeNull();

      // acknowledgePersistence is a no-op
      act(() => {
        result.current.acknowledgePersistence();
      });
      expect(result.current.pendingUpdate).toBeNull();
    });
  });
});
