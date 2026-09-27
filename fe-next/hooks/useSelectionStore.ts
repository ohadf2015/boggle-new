import { useRef } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface SelectionState {
  formedWord: string;
  letterCount: number;
  setSelection: (word: string, count: number) => void;
}

export const useSelectionStore = create<SelectionState>()(
  subscribeWithSelector((set) => ({
    formedWord: '',
    letterCount: 0,
    setSelection: (word, count) => set({ formedWord: word, letterCount: count }),
  })),
);

export function resetSelection(): void {
  useSelectionStore.setState({ formedWord: '', letterCount: 0 });
}

export const useSelectionWord = (): string =>
  useSelectionStore((s) => s.formedWord);

export const useSelectionLetterCount = (): number =>
  useSelectionStore((s) => s.letterCount);

// Boolean-projection selector — only fires consumer re-renders on the 0↔>0
// boundary, NOT on every letter added during a drag (which letterCount would).
export const useIsSelecting = (): boolean =>
  useSelectionStore((s) => s.letterCount > 0);

/**
 * Hold `value` constant while the player is actively building a word
 * (letterCount > 0). The latest value is committed the instant the selection
 * clears.
 *
 * Why this exists: socket-driven leaderboard updates fire 4-6/sec in active
 * multiplayer rooms. Each update used to cascade through the in-game tree
 * (PortraitLayout → CompactLeaderboard / GameLeaderboard, both heavy
 * framer-motion subtrees) and stole frame budget from the grid's drag
 * rendering — "UI feels stuck when selecting words" in MP classic.
 * useDeferredValue alone wasn't enough because the deferred re-render still
 * eventually fires and lands mid-drag.
 */
export function useFrozenWhileSelecting<T>(value: T): T {
  const isSelecting = useIsSelecting();
  const heldRef = useRef(value);
  if (!isSelecting) heldRef.current = value;
  return heldRef.current;
}
