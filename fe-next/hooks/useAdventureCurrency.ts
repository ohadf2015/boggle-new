/**
 * useAdventureCurrency Hook
 *
 * Manages gold currency and Word Forge upgrades for Adventure Mode.
 * Uses the new flexible upgrade system from upgradeConfig.ts.
 */

import { useState, useCallback } from 'react';
import {
  getUpgradeTier,
  getUpgradeEffect as getConfigEffect,
  purchaseUpgrade as configPurchase,
  type UpgradeState,
} from '@/lib/adventure/upgradeConfig';

export interface UseAdventureCurrencyOptions {
  userId: string;
  initialGold?: number;
  initialUpgrades?: UpgradeState;
}

export interface UseAdventureCurrencyReturn {
  gold: number;
  upgrades: UpgradeState;
  addGold: (amount: number) => void;
  purchase: (upgradeId: string) => boolean;
  getUpgradeEffect: (upgradeId: string) => { multiplier: number; description: string };
  pendingUpdate: { userId: string; gold: number; upgrades: UpgradeState } | null;
  acknowledgePersistence: () => void;
}

export function useAdventureCurrency(
  options: UseAdventureCurrencyOptions
): UseAdventureCurrencyReturn {
  const { userId, initialGold = 0, initialUpgrades = {} } = options;

  const [gold, setGold] = useState(initialGold);
  const [upgrades, setUpgrades] = useState<UpgradeState>(initialUpgrades);
  const [pendingUpdate, setPendingUpdate] = useState<{
    userId: string;
    gold: number;
    upgrades: UpgradeState;
  } | null>(null);

  const addGold = useCallback(
    (amount: number) => {
      setGold(current => {
        const newGold = current + amount;
        setPendingUpdate({ userId, gold: newGold, upgrades });
        return newGold;
      });
    },
    [userId, upgrades]
  );

  const purchase = useCallback(
    (upgradeId: string): boolean => {
      const result = configPurchase(upgrades, upgradeId, gold);
      if (!result) return false;

      setGold(result.gold);
      setUpgrades(result.state);
      setPendingUpdate({ userId, gold: result.gold, upgrades: result.state });
      return true;
    },
    [userId, gold, upgrades]
  );

  const getUpgradeEffect = useCallback(
    (upgradeId: string) => {
      const tier = getUpgradeTier(upgrades, upgradeId);
      const value = getConfigEffect(upgrades, upgradeId);
      return {
        multiplier: 1 + value,
        description: tier > 0 ? `Tier ${tier}` : 'Not purchased',
      };
    },
    [upgrades]
  );

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
