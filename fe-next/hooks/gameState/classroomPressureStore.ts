/**
 * The classroom pressure dials, client-side.
 *
 * Its own micro-store, not a field on the big game store, because the
 * consumers are scattered across shells that do not share a prop chain
 * (student portrait layout, host views) and the writer is exactly one:
 * the `startGame` listener in useMultiplayerSocket. Derived fresh from every
 * startGame payload — start, retry, reconnect, late-join and recovery all
 * carry the field — so a stale dial can never survive a round boundary.
 */
import { create } from 'zustand';
import type { ResolvedClassroomPressure } from '@/shared/types/classroom';

interface ClassroomPressureState {
  /** null = not a classroom room (or no round started yet). */
  pressure: ResolvedClassroomPressure | null;
  setClassroomPressure: (pressure: ResolvedClassroomPressure | null) => void;
}

export const useClassroomPressureStore = create<ClassroomPressureState>((set) => ({
  pressure: null,
  setClassroomPressure: (pressure) => set({ pressure }),
}));

/** The dials for the current room, or null outside a classroom game. */
export function useClassroomPressure(): ResolvedClassroomPressure | null {
  return useClassroomPressureStore((s) => s.pressure);
}
