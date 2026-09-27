/**
 * Blast Upgrade Store — persistent owned-levels layer for the Blast store
 * (zustand + localStorage). Holds ONLY the owned upgrade levels; balances live
 * elsewhere:
 *   - COINS: the global, server-synced balance via `@/utils/coinManager` (sync).
 *   - GEMS:  the blast-local wallet `useBlastGems`.
 *
 * `buy()` reads the live balance for the upgrade's currency, spends it, and only
 * commits the level if the spend actually went through. Pure economy math lives in
 * `blastUpgradeCatalog` — this store is thin glue (mirrors useTowerUpgradeStore).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCoins, spendCoins } from '@/utils/coinManager';
import { useBlastGems } from './useBlastGems';
import {
  BLAST_UPGRADES,
  getUpgrade,
  upgradeCost,
  computeUpgradeEffects,
  type BlastUpgradeId,
  type BlastUpgradeEffects,
} from './blastUpgradeCatalog';

export type BlastUpgradeLevels = Partial<Record<BlastUpgradeId, number>>;

interface BlastUpgradeState {
  levels: BlastUpgradeLevels;
  /** Buy the next level of `id`. Returns true on success (afforded + not maxed). */
  buy: (id: BlastUpgradeId) => boolean;
  /** Aggregate run-effect bundle from owned levels. */
  effects: () => BlastUpgradeEffects;
  /** Owned level of one upgrade (clamped to [0, maxLevel]). */
  levelOf: (id: BlastUpgradeId) => number;
  reset: () => void;
}

export const useBlastUpgradeStore = create<BlastUpgradeState>()(
  persist(
    (set, get) => ({
      levels: {},

      buy: (id) => {
        const def = getUpgrade(id);
        if (!def) return false;
        const cur = get().levelOf(id);
        if (cur >= def.maxLevel) return false;
        const cost = upgradeCost(def, cur);

        if (def.currency === 'gems') {
          if (!useBlastGems.getState().spendGems(cost)) return false;
        } else {
          if (getCoins() < cost) return false;
          if (!spendCoins(cost, 'blast_upgrade', { id, level: cur + 1 })) return false;
        }

        set((s) => ({ levels: { ...s.levels, [id]: cur + 1 } }));
        return true;
      },

      effects: () => computeUpgradeEffects(get().levels),

      levelOf: (id) => {
        const def = getUpgrade(id);
        const owned = Math.max(0, Math.floor(get().levels[id] ?? 0));
        return def ? Math.min(def.maxLevel, owned) : owned;
      },

      reset: () => set({ levels: {} }),
    }),
    {
      name: 'lexiclash-blast-upgrades',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : undefined!)),
      partialize: (s) => ({ levels: s.levels }),
    },
  ),
);

/** Re-exports so call sites can import the catalog list + effect math from here. */
export { BLAST_UPGRADES, computeUpgradeEffects };
