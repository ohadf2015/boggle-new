/**
 * Word Tower — persistent upgrade store (zustand + localStorage).
 *
 * Holds ONLY the owned upgrade levels; the coin balance itself stays in
 * `coinManager` (the server-synced source of truth). `buy()` reads the live
 * balance, spends through `spendCoins`, and bumps the level on success — so the
 * pure economy in `./upgrades` decides the rules and this store is thin glue.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCoins, spendCoins } from '@/utils/coinManager';
import {
  upgradeCost,
  levelOf,
  isMaxed,
  computeEffects,
  type UpgradeId,
  type UpgradeLevels,
  type UpgradeEffects,
} from './upgrades';

interface TowerUpgradeState {
  levels: UpgradeLevels;
  /** Buy the next level of `id`. Returns true on success (afforded + not maxed). */
  buy: (id: UpgradeId) => boolean;
  /** Current effects bundle the run reads. */
  effects: () => UpgradeEffects;
  /** Owned level of one upgrade (clamped). */
  levelOf: (id: UpgradeId) => number;
  reset: () => void;
}

export const useTowerUpgradeStore = create<TowerUpgradeState>()(
  persist(
    (set, get) => ({
      levels: {},
      buy: (id: UpgradeId): boolean => {
        const cur = levelOf(get().levels, id);
        if (isMaxed(id, cur)) return false;
        const cost = upgradeCost(id, cur);
        if (getCoins() < cost) return false;
        // Spend through coinManager (server-synced); only commit the level if the
        // spend actually went through (guards a race where the balance changed).
        if (!spendCoins(cost, 'wordtower_upgrade', { id, level: cur + 1 })) return false;
        set((s) => ({ levels: { ...s.levels, [id]: cur + 1 } }));
        return true;
      },
      effects: () => computeEffects(get().levels),
      levelOf: (id: UpgradeId) => levelOf(get().levels, id),
      reset: () => set({ levels: {} }),
    }),
    {
      name: 'lexiclash-word-tower-upgrades',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : undefined!)),
      partialize: (s) => ({ levels: s.levels }),
    },
  ),
);
