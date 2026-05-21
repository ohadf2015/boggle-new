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
});
