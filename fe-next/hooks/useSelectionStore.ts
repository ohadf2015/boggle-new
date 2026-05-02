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
