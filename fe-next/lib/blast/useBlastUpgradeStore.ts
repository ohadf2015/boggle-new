/**
 * Blast Upgrade Store — persistent owned levels (zustand + localStorage). The coin
 * balance is not held here: `buy()` is handed the wallet's spend (CoinContext, which
 * charges the server for signed-in players) and commits the level only once paid.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  BLAST_UPGRADES,
  getUpgrade,
  upgradeCost,
  computeUpgradeEffects,
  type BlastUpgradeId,
  type BlastUpgradeEffects,
} from './blastUpgradeCatalog';

export type BlastUpgradeLevels = Partial<Record<BlastUpgradeId, number>>;

export type SpendCoins = (amount: number, reason: string, metadata?: Record<string, string | number>) => Promise<boolean>;

interface BlastUpgradeState {
  levels: BlastUpgradeLevels;
  /** Buy the next level of `id` with `spend`. Resolves true once paid (and not maxed). */
  buy: (id: BlastUpgradeId, spend: SpendCoins) => Promise<boolean>;
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

      buy: async (id, spend) => {
        const def = getUpgrade(id);
        if (!def) return false;
        const cur = get().levelOf(id);
        if (cur >= def.maxLevel) return false;
        if (!(await spend(upgradeCost(def, cur), 'blast_upgrade', { id, level: cur + 1 }))) return false;
        set((s) => ({ levels: { ...s.levels, [id]: Math.max(s.levels[id] ?? 0, cur + 1) } }));
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
