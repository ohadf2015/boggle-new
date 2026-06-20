import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordTower } from '../useWordTower';
import { WORD_TOWER_SCRAMBLES_START } from '@/shared/constants/wordTowerConstants';

const acceptAll = () => true;
const rejectAll = () => false;

function setup(isInDictionary: (w: string) => boolean = acceptAll) {
  return renderHook(() => useWordTower({ language: 'en', sessionId: 'TEST', isInDictionary }));
}

/** Spell a word from the wheel by selecting the given tile indices in order. */
function pick(result: { current: { selectTile: (i: number) => void } }, indices: number[]) {
  for (const i of indices) act(() => result.current.selectTile(i));
}

describe('useWordTower', () => {
  it('initializes a fresh session-only tower', () => {
    const { result } = setup();
    expect(result.current.state.game.heightM).toBe(0);
    expect(result.current.state.game.floors).toHaveLength(0);
    expect(result.current.state.game.scramblesLeft).toBe(WORD_TOWER_SCRAMBLES_START);
    expect(result.current.state.selected).toEqual([]);
    // No chain anchor — an empty selection is an empty word.
    expect(result.current.word).toBe('');
    expect(result.current.state.game.anchorLetter).toBe('');
  });

  it('builds and submits a valid word: adds a floor, raises height, resets selection', () => {
    const { result } = setup(acceptAll);
    pick(result, [0, 1, 2]);
    expect(result.current.state.selected).toEqual([0, 1, 2]);

    act(() => result.current.submit());

    expect(result.current.state.game.floors).toHaveLength(1);
    expect(result.current.state.game.heightM).toBeGreaterThan(0);
    expect(result.current.state.game.combo).toBe(1);
    expect(result.current.state.selected).toEqual([]);
    expect(result.current.state.resultKey).toBe(1);
    expect(result.current.state.lastResult).not.toBeNull();
  });

  it('the wheel is reused — its letters are unchanged after a word is placed', () => {
    const { result } = setup(acceptAll);
    const before = [...result.current.state.game.tray];
    pick(result, [0, 1, 2]);
    act(() => result.current.submit());
    expect(result.current.state.game.tray).toEqual(before);
  });

  describe('crane two-step: hold → commitPlacement', () => {
    it('hold validates and stashes the word WITHOUT committing it', () => {
      const { result } = setup(acceptAll);
      pick(result, [0, 1, 2]);
      const expected = result.current.word;

      act(() => result.current.hold());

      expect(result.current.state.pendingWord).toBe(expected);
      expect(result.current.state.game.floors).toHaveLength(0); // not committed yet
      expect(result.current.state.selected).toEqual([]);        // tiles taken by the crane
    });

    it('a rejected hold errors and stashes nothing (no crane for a bad word)', () => {
      const { result } = setup(rejectAll);
      pick(result, [0, 1, 2]);
      act(() => result.current.hold());

      expect(result.current.state.pendingWord).toBeNull();
      expect(result.current.state.lastError).toBe('not_in_dictionary');
    });

    it('commitPlacement applies the held word scaled by the drop multiplier', () => {
      const { result } = setup(acceptAll);
      pick(result, [0, 1, 2]);
      act(() => result.current.hold());
      act(() => result.current.commitPlacement(1.4));

      expect(result.current.state.game.floors).toHaveLength(1);
      expect(result.current.state.pendingWord).toBeNull();
      expect(result.current.state.resultKey).toBe(1);
      const floor = result.current.state.game.floors[0];
      expect(floor.placementMultiplier).toBeCloseTo(1.4);
    });

    it('a perfect drop (×1.4) climbs higher than a sloppy one (×0.6)', () => {
      const perfect = setup(acceptAll);
      pick(perfect.result, [0, 1, 2]);
      act(() => perfect.result.current.hold());
      act(() => perfect.result.current.commitPlacement(1.4));

      const sloppy = setup(acceptAll);
      pick(sloppy.result, [0, 1, 2]);
      act(() => sloppy.result.current.hold());
      act(() => sloppy.result.current.commitPlacement(0.6));

      expect(perfect.result.current.state.game.heightM)
        .toBeGreaterThan(sloppy.result.current.state.game.heightM);
    });

    it('a wobble topple sheds the just-placed floor (recoverable)', () => {
      const { result } = setup(acceptAll);
      pick(result, [0, 1, 2]);
      act(() => result.current.hold());
      act(() => result.current.commitPlacement(0.3)); // a bad (miss) drop lands
      expect(result.current.state.game.floors).toHaveLength(1);

      // The crane's topple path: drop one floor with the 'wobble' kind.
      act(() => result.current.hazard(1, 'wobble', ['crane-wobble-1']));

      expect(result.current.state.game.floors).toHaveLength(0);
      expect(result.current.state.lastHazard?.kind).toBe('wobble');
    });

    it('cancelPlacement drops the held word without committing', () => {
      const { result } = setup(acceptAll);
      pick(result, [0, 1, 2]);
      act(() => result.current.hold());
      act(() => result.current.cancelPlacement());

      expect(result.current.state.pendingWord).toBeNull();
      expect(result.current.state.game.floors).toHaveLength(0);
    });
  });

  it('rejects a non-dictionary word: sets error, bumps errorKey, no floor', () => {
    const { result } = setup(rejectAll);
    pick(result, [0, 1, 2]);
    act(() => result.current.submit());

    expect(result.current.state.game.floors).toHaveLength(0);
    expect(result.current.state.lastError).toBe('not_in_dictionary');
    expect(result.current.state.errorKey).toBe(1);
    expect(result.current.state.selected).toEqual([]);
  });

  it('rejects a too-short word as too_short', () => {
    const { result } = setup(acceptAll);
    pick(result, [0, 1]); // 2 letters < min 3
    act(() => result.current.submit());
    expect(result.current.state.lastError).toBe('too_short');
    expect(result.current.state.game.floors).toHaveLength(0);
  });

  it('rejects a duplicate word', () => {
    const { result } = setup(acceptAll);
    pick(result, [0, 1, 2]);
    act(() => result.current.submit());
    expect(result.current.state.game.floors).toHaveLength(1);
    // Same tiles → same word → duplicate.
    pick(result, [0, 1, 2]);
    act(() => result.current.submit());
    expect(result.current.state.game.floors).toHaveLength(1);
    expect(result.current.state.lastError).toBe('duplicate');
  });

  it('backspace removes the last selected tile', () => {
    const { result } = setup();
    pick(result, [0, 1]);
    act(() => result.current.backspace());
    expect(result.current.state.selected).toEqual([0]);
  });

  describe('deselectTile — tap a chosen tile to unselect it', () => {
    it('tapping the last-selected tile removes just it (backspace-equivalent)', () => {
      const { result } = setup();
      pick(result, [0, 1, 2]);
      act(() => result.current.deselectTile(2));
      expect(result.current.state.selected).toEqual([0, 1]);
    });

    it('tapping a tile in the middle rewinds the path to before it', () => {
      const { result } = setup();
      pick(result, [0, 1, 2, 3]);
      act(() => result.current.deselectTile(1));
      // 1 and everything chosen after it (2, 3) are dropped — clean prefix remains.
      expect(result.current.state.selected).toEqual([0]);
    });

    it('tapping the first-selected tile clears the whole word', () => {
      const { result } = setup();
      pick(result, [0, 1, 2]);
      act(() => result.current.deselectTile(0));
      expect(result.current.state.selected).toEqual([]);
    });

    it('tapping an unselected tile is a no-op', () => {
      const { result } = setup();
      pick(result, [0, 1]);
      act(() => result.current.deselectTile(4));
      expect(result.current.state.selected).toEqual([0, 1]);
    });
  });

  it('scramble spends a scramble, resets combo, clears selection', () => {
    const { result } = setup();
    act(() => result.current.selectTile(0));
    const before = result.current.state.game.scramblesLeft;
    act(() => result.current.scramble());
    expect(result.current.state.game.scramblesLeft).toBe(before - 1);
    expect(result.current.state.game.combo).toBe(0);
    expect(result.current.state.selected).toEqual([]);
  });

  it('reset starts a brand new tower', () => {
    const { result } = setup(acceptAll);
    pick(result, [0, 1, 2]);
    act(() => result.current.submit());
    expect(result.current.state.game.floors).toHaveLength(1);

    act(() => result.current.reset());
    expect(result.current.state.game.floors).toHaveLength(0);
    expect(result.current.state.game.heightM).toBe(0);
    expect(result.current.state.resultKey).toBe(0);
  });

  it('hazard topples floors, drops height, breaks combo, and fires once', () => {
    const { result } = setup(acceptAll);
    // Three DISTINCT words from the wheel (different index sets → different words).
    pick(result, [0, 1, 2]); act(() => result.current.submit());
    pick(result, [1, 2, 3]); act(() => result.current.submit());
    pick(result, [2, 3, 4]); act(() => result.current.submit());
    const before = result.current.state.game.floors.length;
    expect(before).toBeGreaterThanOrEqual(1);
    const h0 = result.current.state.game.heightM;

    act(() => result.current.hazard(2, 'hurricane', ['storm-x']));

    expect(result.current.state.game.floors.length).toBe(Math.max(0, before - 2));
    expect(result.current.state.game.heightM).toBeLessThan(h0);
    expect(result.current.state.game.combo).toBe(0);
    expect(result.current.state.game.firedHazards.has('storm-x')).toBe(true);
    expect(result.current.state.hazardKey).toBe(1);
    expect(result.current.state.lastHazard?.kind).toBe('hurricane');
  });
});
