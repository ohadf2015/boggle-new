import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useSelectionStore,
  resetSelection,
  scheduleSelection,
  isSelecting,
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

  describe('scheduleSelection', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('given a tile tap, when the selection is scheduled, then the store waits until after the next frame', () => {
      scheduleSelection('C', 1);
      expect(useSelectionStore.getState().letterCount).toBe(0);

      vi.advanceTimersToNextFrame();
      expect(useSelectionStore.getState().letterCount).toBe(0);

      vi.runOnlyPendingTimers();
      expect(useSelectionStore.getState()).toMatchObject({ formedWord: 'C', letterCount: 1 });
    });

    it('given several path changes in one frame, when it flushes, then only the latest lands in one update', () => {
      const seen: string[] = [];
      const unsub = useSelectionStore.subscribe((s) => seen.push(s.formedWord));
      scheduleSelection('C', 1);
      scheduleSelection('CA', 2);
      scheduleSelection('CAT', 3);
      vi.advanceTimersToNextFrame();
      vi.runOnlyPendingTimers();
      unsub();
      expect(seen).toEqual(['CAT']);
    });

    it('given a pending selection, when the board resets, then the stale selection never lands', () => {
      scheduleSelection('CAT', 3);
      resetSelection();
      vi.advanceTimersToNextFrame();
      vi.runOnlyPendingTimers();
      expect(useSelectionStore.getState().letterCount).toBe(0);
    });

    it('given a hidden tab where frames never fire, when the player releases, then the clear still lands', () => {
      useSelectionStore.getState().setSelection('CAT', 3);
      scheduleSelection('', 0);
      vi.advanceTimersByTime(150);
      expect(useSelectionStore.getState().letterCount).toBe(0);
    });

    it('given a tap whose write is still queued, then isSelecting already reports the drag', () => {
      scheduleSelection('C', 1);
      expect(isSelecting()).toBe(true);
      scheduleSelection('', 0);
      expect(isSelecting()).toBe(false);
    });
  });
});
