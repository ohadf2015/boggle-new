import { create } from 'zustand';

/** Set while a classroom duel is on screen: the round's overall-rank callouts stay quiet so the duel is the one voice. */
const useRivalPresenceStore = create<{ present: boolean }>(() => ({ present: false }));

export function setRivalPresent(present: boolean): void {
  useRivalPresenceStore.setState({ present });
}

export function useRivalPresent(): boolean {
  return useRivalPresenceStore((s) => s.present);
}
