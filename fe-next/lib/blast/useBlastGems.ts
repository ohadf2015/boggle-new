/**
 * Blast Gem Wallet — the premium in-game currency for Blast mode.
 *
 * Gems are RARE (dropped from gem-letter words, jackpot rolls, big cascades) and
 * spent on premium upgrades in the Blast store. Coins remain the common currency
 * and live in the GLOBAL, server-authoritative balance (contexts/CoinContext) —
 * gems are intentionally a separate, blast-scoped currency because no global gem
 * balance exists to hook into.
 *
 * ponytail: client-side localStorage wallet (mirrors blastBadgeStore). Gems are a
 * soft cosmetic/upgrade currency, not money — if they ever become tradeable or
 * need cross-device sync, promote this to a server-authoritative balance like coins.
 *
 * Storage key: `blast-gems`. SSR-safe (createJSONStorage noops without localStorage).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BlastGemState {
  gems: number;
  /** Credit gems (ignores non-positive amounts — no negative-earn exploit). */
  addGems: (amount: number) => void;
  /** Debit gems. Returns false (and does nothing) if the balance is insufficient. */
  spendGems: (amount: number) => boolean;
  /** True if the balance covers `amount`. */
  canAfford: (amount: number) => boolean;
  /** Clear the wallet (test + user-requested reset). */
  reset: () => void;
}

export const useBlastGems = create<BlastGemState>()(
  persist(
    (set, get) => ({
      gems: 0,

      addGems: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set({ gems: get().gems + Math.floor(amount) });
      },

      spendGems: (amount) => {
        const cost = Math.floor(amount);
        if (!Number.isFinite(cost) || cost <= 0) return true;
        if (get().gems < cost) return false;
        set({ gems: get().gems - cost });
        return true;
      },

      canAfford: (amount) => get().gems >= Math.floor(amount),

      reset: () => set({ gems: 0 }),
    }),
    {
      name: 'blast-gems',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ gems: state.gems }),
    },
  ),
);
