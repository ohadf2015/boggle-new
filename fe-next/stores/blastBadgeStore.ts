/**
 * Blast Badge Store — zustand persist layer for unlocked achievements.
 *
 * Cross-run state: the set of badge IDs the player has *ever* unlocked in
 * blast mode. Pure per-run computation lives in
 * `components/blast/utils/blastBadges.ts`; this store only diffs incoming
 * earned IDs against the persisted set so the UI can fire "new unlock"
 * toasts exactly once per achievement.
 *
 * Storage key: `blast-badges` in localStorage (serialized via
 * zustand/middleware persist). Safe on SSR — `createJSONStorage` falls back
 * to a noop when `localStorage` is undefined.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BlastBadgeId } from '@/components/blast/legacy/utils/blastBadges';

interface BlastBadgeState {
  /** IDs the player has unlocked at least once. */
  unlockedIds: BlastBadgeId[];
  /** Mark a badge as unlocked (idempotent). */
  unlockBadge: (id: BlastBadgeId) => void;
  /** True if this badge has been unlocked in any prior run. */
  hasUnlocked: (id: BlastBadgeId) => boolean;
  /** Given this run's earned IDs, return only the ones never seen before. */
  diffNewBadges: (earned: BlastBadgeId[]) => BlastBadgeId[];
  /** Clear all progress (test + user-requested reset). */
  reset: () => void;
}

export const useBlastBadgeStore = create<BlastBadgeState>()(
  persist(
    (set, get) => ({
      unlockedIds: [],

      unlockBadge: (id) => {
        const current = get().unlockedIds;
        if (current.includes(id)) return;
        set({ unlockedIds: [...current, id] });
      },

      hasUnlocked: (id) => get().unlockedIds.includes(id),

      diffNewBadges: (earned) => {
        const owned = new Set(get().unlockedIds);
        return earned.filter((id) => !owned.has(id));
      },

      reset: () => set({ unlockedIds: [] }),
    }),
    {
      name: 'blast-badges',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ unlockedIds: state.unlockedIds }),
    },
  ),
);
