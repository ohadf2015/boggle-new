import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSelectionStore,
  resetSelection,
} from '../useSelectionStore';

describe('useSelectionStore', () => {
  beforeEach(() => {
    resetSelection();
  });

  it('starts empty', () => {
    const s = useSelectionStore.getState();
    expect(s.formedWord).toBe('');
    expect(s.letterCount).toBe(0);
  });

  it('setSelection updates word and count together', () => {
    useSelectionStore.getState().setSelection('CAT', 3);
    const s = useSelectionStore.getState();
    expect(s.formedWord).toBe('CAT');
    expect(s.letterCount).toBe(3);
  });

  it('resetSelection clears state', () => {
    useSelectionStore.getState().setSelection('DOG', 3);
    resetSelection();
    const s = useSelectionStore.getState();
    expect(s.formedWord).toBe('');
    expect(s.letterCount).toBe(0);
  });

  it('subscribers fire only when their slice changes', () => {
    let wordFires = 0;
    let countFires = 0;
    const unsubWord = useSelectionStore.subscribe(
      (s) => s.formedWord,
      () => { wordFires++; },
    );
    const unsubCount = useSelectionStore.subscribe(
      (s) => s.letterCount,
      () => { countFires++; },
    );
    useSelectionStore.getState().setSelection('A', 1);
    useSelectionStore.getState().setSelection('AB', 2);
    expect(wordFires).toBe(2);
    expect(countFires).toBe(2);
    unsubWord();
    unsubCount();
  });
});
