import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastV2 } from '../useBlastV2';
import { cellId } from '../engine/cell-id';
import { computeStrikeBudget } from '../strike-budget';
import type { BlastLevel } from '../types';

// Bottom row spells "CSE" — a real-letter run that is NOT a theme word and (with
// no dictionaryCheck) rejects as 'unknown'. onRejectConfirmed then turns it into
// a confirmed wrong guess = one strike. Repeating the drag yields more strikes.
function makeLevel(levelNumber: number): BlastLevel {
  return {
    id: `strike-test-${levelNumber}`,
    levelNumber,
    locale: 'en',
    theme: 'onboarding',
    columns: [
      { index: 0, tiles: ['C', 'A', 'T'] },
      { index: 1, tiles: ['S', 'U', 'N'] },
      { index: 2, tiles: ['E', 'G', 'G'] },
    ],
    words: ['CAT', 'SUN', 'EGG'],
    resolvableOrder: ['CAT', 'SUN', 'EGG'],
    tileFlags: {},
    gravityMode: 'standard',
    difficulty: 1,
  };
}

function strikeOnce(result: { current: ReturnType<typeof useBlastV2> }) {
  act(() => {
    result.current.handlers.onPointerDown(cellId(0, 0));
    result.current.handlers.onPointerMove(cellId(1, 0));
    result.current.handlers.onPointerMove(cellId(2, 0));
    result.current.handlers.onPointerUp();
  });
  act(() => {
    result.current.handlers.onRejectConfirmed();
  });
}

describe('useBlastV2 — strike budget / lose condition', () => {
  it('exposes the derived strike budget for the level', () => {
    const early = renderHook(() => useBlastV2(makeLevel(1)));
    expect(early.result.current.state.strikeBudget).toBeNull();

    const mid = renderHook(() => useBlastV2(makeLevel(6)));
    expect(mid.result.current.state.strikeBudget).toBe(computeStrikeBudget(6));
  });

  it('counts each confirmed wrong guess as a strike', () => {
    const { result } = renderHook(() => useBlastV2(makeLevel(6)));
    expect(result.current.state.strikesUsed).toBe(0);

    strikeOnce(result);
    expect(result.current.state.strikesUsed).toBe(1);

    strikeOnce(result);
    expect(result.current.state.strikesUsed).toBe(2);
  });

  it('does NOT strike for a pending (unconfirmed) wrong guess', () => {
    const { result } = renderHook(() => useBlastV2(makeLevel(6)));
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });
    // verdict pending — not a strike yet
    expect(result.current.state.strikesUsed).toBe(0);
    expect(result.current.state.status).toBe('playing');
  });

  it('fails the level when the strike budget is exhausted with theme words remaining', () => {
    const level = makeLevel(6);
    const budget = computeStrikeBudget(level.levelNumber)!;
    const { result } = renderHook(() => useBlastV2(level));

    for (let i = 0; i < budget - 1; i++) {
      strikeOnce(result);
      expect(result.current.state.status).toBe('playing'); // still alive
    }
    // The final strike trips the loss.
    strikeOnce(result);
    expect(result.current.state.strikesUsed).toBe(budget);
    expect(result.current.state.status).toBe('levelFailed');
  });

  it('NEVER fails on early levels where the budget is unlimited (null)', () => {
    const { result } = renderHook(() => useBlastV2(makeLevel(1)));
    for (let i = 0; i < 12; i++) {
      strikeOnce(result);
    }
    expect(result.current.state.strikesUsed).toBe(12);
    expect(result.current.state.status).toBe('playing');
  });

  it('ignores further play once the level has failed (terminal state)', () => {
    const level = makeLevel(6);
    const budget = computeStrikeBudget(level.levelNumber)!;
    const { result } = renderHook(() => useBlastV2(level));
    for (let i = 0; i < budget; i++) strikeOnce(result);
    expect(result.current.state.status).toBe('levelFailed');

    // A correct CAT drag after failure must NOT register.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.foundWords.has('CAT')).toBe(false);
    expect(result.current.state.status).toBe('levelFailed');
  });
});
