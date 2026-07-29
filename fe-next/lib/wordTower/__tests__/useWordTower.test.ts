import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordTower } from '../useWordTower';
import { WORD_TOWER_SCRAMBLES_START } from '@/shared/constants/wordTowerConstants';

const acceptAll = () => true;
const rejectAll = () => false;

function setup(isInDictionary: (w: string) => boolean = acceptAll) {
  return renderHook(() => useWordTower({ language: 'en', sessionId: 'TEST', isInDictionary }));
}

describe('useWordTower', () => {
  it('initializes a fresh session-only tower', () => {
    const { result } = setup();
    expect(result.current.state.game.heightM).toBe(0);
    expect(result.current.state.game.floors).toHaveLength(0);
    expect(result.current.state.game.scramblesLeft).toBe(WORD_TOWER_SCRAMBLES_START);
    expect(result.current.state.selected).toEqual([]);
    expect(result.current.word).toBe(result.current.state.game.anchorLetter);
  });

  it('builds and submits a valid word: adds a floor, raises height, resets selection', () => {
    const { result } = setup(acceptAll);
    act(() => result.current.selectTile(0));
    act(() => result.current.selectTile(1));
    expect(result.current.state.selected).toEqual([0, 1]);

    act(() => result.current.submit());

    expect(result.current.state.game.floors).toHaveLength(1);
    expect(result.current.state.game.heightM).toBeGreaterThan(0);
    expect(result.current.state.game.combo).toBe(1);
    expect(result.current.state.selected).toEqual([]);
    expect(result.current.state.resultKey).toBe(1);
    expect(result.current.state.lastResult).not.toBeNull();
  });

  describe('crane two-step: hold → commitPlacement', () => {
    it('hold validates and stashes the word WITHOUT committing it', () => {
      const { result } = setup(acceptAll);
      act(() => result.current.selectTile(0));
      act(() => result.current.selectTile(1));
      const expected = result.current.word;

      act(() => result.current.hold());

      expect(result.current.state.pendingWord).toBe(expected);
      expect(result.current.state.game.floors).toHaveLength(0); // not committed yet
      expect(result.current.state.selected).toEqual([]);        // tiles taken by the crane
    });

    it('a rejected hold errors and stashes nothing (no crane for a bad word)', () => {
      const { result } = setup(rejectAll);
      act(() => result.current.selectTile(0));
      act(() => result.current.selectTile(1));
      act(() => result.current.hold());

      expect(result.current.state.pendingWord).toBeNull();
      expect(result.current.state.lastError).toBe('not_in_dictionary');
    });

    it('commitPlacement applies the held word scaled by the drop multiplier', () => {
      const { result } = setup(acceptAll);
      act(() => result.current.selectTile(0));
      act(() => result.current.selectTile(1));
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
      act(() => perfect.result.current.selectTile(0));
      act(() => perfect.result.current.selectTile(1));
      act(() => perfect.result.current.hold());
      act(() => perfect.result.current.commitPlacement(1.4));

      const sloppy = setup(acceptAll);
      act(() => sloppy.result.current.selectTile(0));
      act(() => sloppy.result.current.selectTile(1));
      act(() => sloppy.result.current.hold());
      act(() => sloppy.result.current.commitPlacement(0.6));

      expect(perfect.result.current.state.game.heightM)
        .toBeGreaterThan(sloppy.result.current.state.game.heightM);
    });

    it('a wobble topple sheds the just-placed floor (recoverable)', () => {
      const { result } = setup(acceptAll);
      act(() => result.current.selectTile(0));
      act(() => result.current.selectTile(1));
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
      act(() => result.current.selectTile(0));
      act(() => result.current.hold());
      act(() => result.current.cancelPlacement());

      expect(result.current.state.pendingWord).toBeNull();
      expect(result.current.state.game.floors).toHaveLength(0);
    });
  });

  it('rejects a non-dictionary word: sets error, bumps errorKey, no floor', () => {
    const { result } = setup(rejectAll);
    act(() => result.current.selectTile(0));
    act(() => result.current.selectTile(1));
    act(() => result.current.submit());

    expect(result.current.state.game.floors).toHaveLength(0);
    expect(result.current.state.lastError).toBe('not_in_dictionary');
    expect(result.current.state.errorKey).toBe(1);
    expect(result.current.state.selected).toEqual([]);
  });

  it('rejects an empty submit as too_short', () => {
    const { result } = setup(acceptAll);
    act(() => result.current.submit());
    expect(result.current.state.lastError).toBe('too_short');
    expect(result.current.state.game.floors).toHaveLength(0);
  });

  it('backspace removes the last selected tile', () => {
    const { result } = setup();
    act(() => result.current.selectTile(0));
    act(() => result.current.selectTile(1));
    act(() => result.current.backspace());
    expect(result.current.state.selected).toEqual([0]);
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
    act(() => result.current.selectTile(0));
    act(() => result.current.selectTile(1));
    act(() => result.current.submit());
    expect(result.current.state.game.floors).toHaveLength(1);

    act(() => result.current.reset());
    expect(result.current.state.game.floors).toHaveLength(0);
    expect(result.current.state.game.heightM).toBe(0);
    expect(result.current.state.resultKey).toBe(0);
  });

  it('hazard topples floors, drops height, breaks combo, and fires once', () => {
    const { result } = setup(acceptAll);
    const build = () => {
      act(() => result.current.selectTile(0));
      act(() => result.current.selectTile(1));
      act(() => result.current.submit());
    };
    build(); build(); build();
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
