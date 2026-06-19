import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastV2 } from '../useBlastV2';
import { cellId } from '../engine/cell-id';
import type { BlastLevel } from '../types';

vi.mock('../telemetry', () => ({
  trackBlastWordFound: vi.fn(),
  trackBlastWordRejected: vi.fn(),
  trackBlastHintUsed: vi.fn(),
}));

// CAT / SUN / EGG — three straight vertical columns, all formable from the start.
const level: BlastLevel = {
  id: 'hint-test',
  levelNumber: 7,
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

describe('useBlastV2 — reveal hint', () => {
  it('starts with no hint cells and zero hints used', () => {
    const { result } = renderHook(() => useBlastV2(level));
    expect(result.current.state.hintCells).toEqual([]);
    expect(result.current.state.hintsUsed).toBe(0);
  });

  it('revealHint highlights the next formable theme word and spends a star', () => {
    const { result } = renderHook(() => useBlastV2(level));

    act(() => {
      result.current.handlers.onRevealHint();
    });

    // First formable remaining theme word is CAT (col 0, bottom-up).
    expect(result.current.state.hintCells).toEqual([
      cellId(0, 0),
      cellId(0, 1),
      cellId(0, 2),
    ]);
    // Cost is a star penalty (hintsUsed), NOT coins — coins untouched.
    expect(result.current.state.hintsUsed).toBe(1);
    expect(result.current.state.coins).toBe(0);
  });

  it('clears the hint glow once a word is submitted', () => {
    const { result } = renderHook(() => useBlastV2(level));

    act(() => {
      result.current.handlers.onRevealHint();
    });
    expect(result.current.state.hintCells.length).toBeGreaterThan(0);

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.hintCells).toEqual([]);
  });

  it('points at the next unfound word after one is cleared', () => {
    const { result } = renderHook(() => useBlastV2(level));

    // Clear CAT first.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    act(() => {
      result.current.handlers.onRevealHint();
    });

    // CAT is found; the hint should now target a remaining word (SUN or EGG),
    // never the already-found CAT column.
    const hinted = result.current.state.hintCells;
    expect(hinted.length).toBeGreaterThan(0);
    expect(hinted).not.toEqual([cellId(0, 0), cellId(0, 1), cellId(0, 2)]);
    expect(result.current.state.hintsUsed).toBe(1);
  });

  it('is a no-op after the level is complete', () => {
    const { result } = renderHook(() => useBlastV2(level));

    // Find all three theme words.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });
    act(() => {
      result.current.handlers.onPointerDown(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(1, 1));
      result.current.handlers.onPointerMove(cellId(1, 2));
      result.current.handlers.onPointerUp();
    });
    act(() => {
      result.current.handlers.onPointerDown(cellId(2, 0));
      result.current.handlers.onPointerMove(cellId(2, 1));
      result.current.handlers.onPointerMove(cellId(2, 2));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.status).toBe('levelComplete');

    act(() => {
      result.current.handlers.onRevealHint();
    });
    expect(result.current.state.hintsUsed).toBe(0);
    expect(result.current.state.hintCells).toEqual([]);
  });
});
