/**
 * Tests for useAdventureCurrency hook
 *
 * Tests currency state management, purchase validation, and persistence tracking.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureCurrency } from '../useAdventureCurrency';
import type { UpgradeId } from '../../shared/types/progression';

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
      expect(result.current.upgrades).toEqual({
        timeBonus: 0,
        scoreBonus: 0,
        xpBonus: 0,
      });
      expect(result.current.pendingUpdate).toBeNull();
    });

    it('should initialize with provided initial values', () => {
      // GIVEN: Initial gold and upgrades
      const initialGold = 1500;
      const initialUpgrades = {
        timeBonus: 2,
        scoreBonus: 1,
        xpBonus: 0,
      };

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
      expect(result.current.upgrades).toEqual({
        timeBonus: 2,
        scoreBonus: 1,
        xpBonus: 0,
      });
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

    it('should track pending update after adding gold', () => {
      // GIVEN: Hook with initial gold
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 100 })
      );

      // WHEN: Adding gold
      act(() => {
        result.current.addGold(50);
      });

      // THEN: Should have pending update
      expect(result.current.pendingUpdate).toEqual({
        userId: 'user-123',
        gold: 150,
        upgrades: {
          timeBonus: 0,
          scoreBonus: 0,
          xpBonus: 0,
        },
      });
    });
  });

  describe('purchase', () => {
    it('should succeed when player has sufficient gold', () => {
      // GIVEN: Hook with enough gold for timeBonus (costs 500)
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 1000 })
      );

      // WHEN: Purchasing timeBonus upgrade
      let purchaseResult;
      act(() => {
        purchaseResult = result.current.purchase('timeBonus');
      });

      // THEN: Purchase should succeed
      expect(purchaseResult).toEqual({
        success: true,
        newGold: 500,
        newStacks: 1,
      });
      expect(result.current.gold).toBe(500);
      expect(result.current.upgrades.timeBonus).toBe(1);
    });

    it('should fail when player has insufficient gold', () => {
      // GIVEN: Hook with not enough gold (timeBonus costs 500)
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 400 })
      );

      // WHEN: Attempting to purchase timeBonus upgrade
      let purchaseResult;
      act(() => {
        purchaseResult = result.current.purchase('timeBonus');
      });

      // THEN: Purchase should fail
      expect(purchaseResult).toEqual({
        success: false,
        error: 'insufficient_gold',
      });
      expect(result.current.gold).toBe(400);
      expect(result.current.upgrades.timeBonus).toBe(0);
    });

    it('should fail when upgrade is at max stacks', () => {
      // GIVEN: Hook with max stacks of timeBonus
      const { result } = renderHook(() =>
        useAdventureCurrency({
          userId: 'user-123',
          initialGold: 10000,
          initialUpgrades: {
            timeBonus: 5,
            scoreBonus: 0,
            xpBonus: 0,
          },
        })
      );

      // WHEN: Attempting to purchase another timeBonus stack
      let purchaseResult;
      act(() => {
        purchaseResult = result.current.purchase('timeBonus');
      });

      // THEN: Purchase should fail
      expect(purchaseResult).toEqual({
        success: false,
        error: 'max_stacks_reached',
      });
      expect(result.current.gold).toBe(10000);
      expect(result.current.upgrades.timeBonus).toBe(5);
    });

    it('should increase cost for subsequent purchases', () => {
      // GIVEN: Hook with enough gold for multiple purchases
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 3000 })
      );

      // WHEN: Purchasing timeBonus twice (sequential, not simultaneous)
      act(() => {
        result.current.purchase('timeBonus'); // 500 gold
      });

      act(() => {
        result.current.purchase('timeBonus'); // 750 gold
      });

      // THEN: Should have spent 1250 total (500 + 750)
      expect(result.current.gold).toBe(1750);
      expect(result.current.upgrades.timeBonus).toBe(2);
    });

    it('should track pending update after purchase', () => {
      // GIVEN: Hook with enough gold
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 1000 })
      );

      // WHEN: Purchasing upgrade
      act(() => {
        result.current.purchase('timeBonus');
      });

      // THEN: Should have pending update
      expect(result.current.pendingUpdate).toEqual({
        userId: 'user-123',
        gold: 500,
        upgrades: {
          timeBonus: 1,
          scoreBonus: 0,
          xpBonus: 0,
        },
      });
    });
  });

  describe('getUpgradeEffect', () => {
    it('should calculate multiplier based on stacks', () => {
      // GIVEN: Hook with some upgrades
      const { result } = renderHook(() =>
        useAdventureCurrency({
          userId: 'user-123',
          initialUpgrades: {
            timeBonus: 2, // +20%
            scoreBonus: 3, // +15%
            xpBonus: 0,
          },
        })
      );

      // WHEN: Getting upgrade effects
      const timeEffect = result.current.getUpgradeEffect('timeBonus');
      const scoreEffect = result.current.getUpgradeEffect('scoreBonus');
      const xpEffect = result.current.getUpgradeEffect('xpBonus');

      // THEN: Should return correct multipliers
      expect(timeEffect.multiplier).toBe(1.2); // 1 + (2 * 0.1)
      expect(timeEffect.description).toContain('20%');

      expect(scoreEffect.multiplier).toBe(1.15); // 1 + (3 * 0.05)
      expect(scoreEffect.description).toContain('15%');

      expect(xpEffect.multiplier).toBe(1.0); // 1 + (0 * 0.1)
      expect(xpEffect.description).toContain('0%');
    });
  });

  describe('acknowledgePersistence', () => {
    it('should clear pending update', () => {
      // GIVEN: Hook with pending update
      const { result } = renderHook(() =>
        useAdventureCurrency({ userId: 'user-123', initialGold: 1000 })
      );

      act(() => {
        result.current.addGold(100);
      });

      expect(result.current.pendingUpdate).not.toBeNull();

      // WHEN: Acknowledging persistence
      act(() => {
        result.current.acknowledgePersistence();
      });

      // THEN: Pending update should be cleared
      expect(result.current.pendingUpdate).toBeNull();
    });
  });
});
