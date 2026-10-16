import { create } from 'zustand';
import type { ClassroomBossAttackEvent, ClassroomBossPlayerHit, ClassroomBossView } from '@/shared/types/classroomBoss';

/** Boss Battle v2 lives in its own tiny store so a 1 Hz boss broadcast never re-renders the board. */
interface ClassroomBossStore {
  /** The room this boss belongs to: the final view outlives the round so results can tell the same outcome. */
  gameCode: string | null;
  view: ClassroomBossView | null;
  receivedAt: number;
  attack: (ClassroomBossAttackEvent & { id: number }) | null;
  myHit: (ClassroomBossPlayerHit & { word: string; id: number }) | null;
  receiveState: (view: ClassroomBossView | null, now?: number) => void;
  receiveAttack: (attack: ClassroomBossAttackEvent) => void;
  receiveMyHit: (word: string, hit: ClassroomBossPlayerHit) => void;
  reset: () => void;
  attachRoom: (gameCode: string | null) => void;
}

export const useClassroomBossStore = create<ClassroomBossStore>((set, get) => ({
  gameCode: null,
  view: null,
  receivedAt: 0,
  attack: null,
  myHit: null,
  receiveState: (view, now = Date.now()) =>
    set(view === null || (view.status === 'intro' && view.lastHits.length === 0)
      ? { view, receivedAt: now, attack: null, myHit: null }
      : { view, receivedAt: now }),
  receiveAttack: (attack) => set((s) => ({ attack: { ...attack, id: (s.attack?.id ?? 0) + 1 } })),
  receiveMyHit: (word, hit) => set((s) => ({ myHit: { ...hit, word, id: (s.myHit?.id ?? 0) + 1 } })),
  reset: () => set({ gameCode: null, view: null, receivedAt: 0, attack: null, myHit: null }),
  attachRoom: (gameCode) => {
    if (get().gameCode !== gameCode) set({ gameCode, view: null, receivedAt: 0, attack: null, myHit: null });
  },
}));

export function liveMsLeft(msLeftAtReceipt: number, receivedAt: number, now: number): number {
  return Math.max(0, msLeftAtReceipt - (now - receivedAt));
}

export const useBossActive = () => useClassroomBossStore((s) => s.view !== null);
