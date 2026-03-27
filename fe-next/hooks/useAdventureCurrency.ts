/**
 * useAdventureCurrency Hook
 *
 * Manages gold currency and Word Forge upgrades for Adventure Mode.
 * Uses the new flexible upgrade system from upgradeConfig.ts.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
  // Refs mirror state for use in callbacks that need current values
  // without stale closures (e.g., rapid double-purchase scenario)
  const goldRef = useRef(initialGold);
  const upgradesRef = useRef<UpgradeState>(initialUpgrades);

  // Sync from server-authoritative values when they change.
  // This handles both initial load AND rollback after failed purchases
  // (ProgressionContext calls fetchProgression on purchase failure, which
  // updates initialGold/initialUpgrades, triggering this sync).
  const initialGoldRef = useRef(initialGold);
  const initialUpgradesRef = useRef(initialUpgrades);
  useEffect(() => {
    const goldChanged = initialGold !== initialGoldRef.current;
    const upgradesChanged = initialUpgrades !== initialUpgradesRef.current;
    if (!goldChanged && !upgradesChanged) return;

    if (goldChanged) {
      setGold(initialGold);
      goldRef.current = initialGold;
      initialGoldRef.current = initialGold;
    }
    if (upgradesChanged) {
      setUpgrades(initialUpgrades);
      upgradesRef.current = initialUpgrades;
      initialUpgradesRef.current = initialUpgrades;
    }
  }, [initialGold, initialUpgrades]);

  const addGold = useCallback(
    (amount: number) => {
      setGold(current => {
        const next = current + amount;
        goldRef.current = next;
        return next;
      });
    },
    []
  );

  const purchase = useCallback(
    (upgradeId: string): boolean => {
      // Read from refs to avoid stale closure — two rapid purchases
      // would otherwise both read the same pre-purchase gold/upgrades
      const result = configPurchase(upgradesRef.current, upgradeId, goldRef.current);
      if (!result) return false;

      goldRef.current = result.gold;
      upgradesRef.current = result.state;
      setGold(result.gold);
      setUpgrades(result.state);
      return true;
    },
    []
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

  /** @deprecated pendingUpdate was never consumed — gold persists via server API */
  const pendingUpdate = null;
  /** @deprecated No-op — kept for backward compatibility */
  const acknowledgePersistence = useCallback(() => {}, []);

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
