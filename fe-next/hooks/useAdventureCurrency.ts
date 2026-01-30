/**
 * useAdventureCurrency Hook
 *
 * Manages gold currency and stat upgrades for Adventure Mode progression.
 * Handles purchase validation, effect calculations, and persistence tracking.
 */

import { useState, useCallback } from 'react';
import type { UpgradeId, PurchaseResult } from '../shared/types/progression';
import { purchaseUpgrade, STAT_UPGRADES } from '../shared/utils/currencyUtils';

/**
 * Hook options
 */
export interface UseAdventureCurrencyOptions {
  /** User ID for persistence tracking */
  userId: string;
  /** Initial gold amount (default: 0) */
  initialGold?: number;
  /** Initial upgrade stacks (default: all zeros) */
  initialUpgrades?: Record<UpgradeId, number>;
}

/**
 * Hook return value
 */
export interface UseAdventureCurrencyReturn {
  /** Current gold balance */
  gold: number;
  /** Current upgrade stacks by ID */
  upgrades: Record<UpgradeId, number>;
  /** Add gold to balance */
  addGold: (amount: number) => void;
  /** Attempt to purchase an upgrade */
  purchase: (upgradeId: UpgradeId) => PurchaseResult;
  /** Get current effect of an upgrade */
  getUpgradeEffect: (upgradeId: UpgradeId) => {
    multiplier: number;
    description: string;
  };
  /** Pending update for database persistence (null if nothing pending) */
  pendingUpdate: {
    userId: string;
    gold: number;
    upgrades: Record<UpgradeId, number>;
  } | null;
  /** Acknowledge that pending update has been persisted */
  acknowledgePersistence: () => void;
}

/**
 * Hook for managing adventure currency and upgrades.
 *
 * Provides state management for gold, upgrade purchases, and persistence tracking.
 *
 * @param options - Hook configuration
 * @returns Currency state and actions
 *
 * @example
 * ```tsx
 * const { gold, upgrades, purchase, addGold } = useAdventureCurrency({
 *   userId: 'user-123',
 *   initialGold: 1000,
 * });
 *
 * // Add gold after level completion
 * addGold(150);
 *
 * // Purchase upgrade
 * const result = purchase('timeBonus');
 * if (result.success) {
 *   console.log('Purchase successful!');
 * }
 * ```
 */
export function useAdventureCurrency(
  options: UseAdventureCurrencyOptions
): UseAdventureCurrencyReturn {
  const { userId, initialGold = 0, initialUpgrades } = options;

  // Initialize upgrades with zeros if not provided
  const defaultUpgrades: Record<UpgradeId, number> = {
    timeBonus: 0,
    scoreBonus: 0,
    xpBonus: 0,
  };

  // State
  const [gold, setGold] = useState(initialGold);
  const [upgrades, setUpgrades] = useState<Record<UpgradeId, number>>(
    initialUpgrades || defaultUpgrades
  );
  const [pendingUpdate, setPendingUpdate] = useState<{
    userId: string;
    gold: number;
    upgrades: Record<UpgradeId, number>;
  } | null>(null);

  /**
   * Add gold to the player's balance
   */
  const addGold = useCallback(
    (amount: number) => {
      setGold((current) => {
        const newGold = current + amount;
        // Track pending update
        setPendingUpdate({
          userId,
          gold: newGold,
          upgrades,
        });
        return newGold;
      });
    },
    [userId, upgrades]
  );

  /**
   * Attempt to purchase an upgrade
   */
  const purchase = useCallback(
    (upgradeId: UpgradeId): PurchaseResult => {
      // Get current stacks
      const currentStacks = upgrades[upgradeId];

      // Validate purchase
      const result = purchaseUpgrade(upgradeId, gold, currentStacks);

      if (result.success) {
        // Update gold
        setGold(result.newGold);

        // Update upgrades
        const newUpgrades = {
          ...upgrades,
          [upgradeId]: result.newStacks,
        };
        setUpgrades(newUpgrades);

        // Track pending update
        setPendingUpdate({
          userId,
          gold: result.newGold,
          upgrades: newUpgrades,
        });
      }

      return result;
    },
    [userId, gold, upgrades]
  );

  /**
   * Get the current effect of an upgrade based on stacks owned
   */
  const getUpgradeEffect = useCallback(
    (upgradeId: UpgradeId) => {
      const upgrade = STAT_UPGRADES[upgradeId];
      const stacks = upgrades[upgradeId];

      // Calculate multiplier: 1 + (stacks * benefitPerStack / 100)
      const benefitDecimal = upgrade.benefitPerStack / 100;
      const multiplier = 1 + stacks * benefitDecimal;

      // Calculate percentage for description
      const percentage = stacks * upgrade.benefitPerStack;

      return {
        multiplier,
        description: `+${percentage}%`,
      };
    },
    [upgrades]
  );

  /**
   * Clear pending update after persistence
   */
  const acknowledgePersistence = useCallback(() => {
    setPendingUpdate(null);
  }, []);

  return {
    gold,
    upgrades,
    addGold,
    purchase,
    getUpgradeEffect,
    pendingUpdate,
    acknowledgePersistence,
  };
}
