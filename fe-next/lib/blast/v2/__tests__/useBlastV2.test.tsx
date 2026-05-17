import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastV2 } from '../useBlastV2';
import { cellId } from '../engine/cell-id';
import type { BlastLevel } from '../types';

const mockLevel: BlastLevel = {
  id: 'useBlastV2-test',
  levelNumber: 1,
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

// Level designed so collapsing CAT reveals DOG.
//   col0 = [C,A,T,D] bottom-up, col1 = [O], col2 = [G]
//   initial grid (r = row index from bottom):
//     r3: D . .
//     r2: T . .
//     r1: A . .
//     r0: C O G
//   CAT is the vertical column-0 run; DOG is NOT a straight line yet.
//   After CAT is cleared, D falls to r0 → DOG spans row 0 (c0r0=D, c1r0=O, c2r0=G).
const revealLevel: BlastLevel = {
  id: 'useBlastV2-reveal-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T', 'D'] },
    { index: 1, tiles: ['O'] },
    { index: 2, tiles: ['G'] },
  ],
  words: ['CAT', 'DOG'],
  resolvableOrder: ['CAT', 'DOG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('useBlastV2 hook', () => {
  it('drag-select CAT claims only CAT — no auto-claim of other words', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    // SUN + EGG are still on the board untouched — player must find them manually.
    expect(result.current.state.foundWords.has('SUN')).toBe(false);
    expect(result.current.state.foundWords.has('EGG')).toBe(false);
    // Only CAT scored: 3 letters x 10 (theme). No cascade bonus.
    expect(result.current.state.coins).toBe(30);
    // Collapsing column 0 reveals nothing — SUN/EGG were already formable.
    expect(result.current.state.cascadeCount).toBe(0);
    expect(result.current.state.status).toBe('playing');
  });

  it('counts collapse-revealed words as cascades for FX (revealLevel)', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));
    expect(result.current.state.lastChainDepth).toBe(0);
    expect(result.current.state.chainEventKey).toBe(0);

    // Drag CAT up column 0. Collapsing C/A/T drops D to row 0,
    // making DOG (D-O-G across row 0) formable for the first time.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    // DOG was REVEALED, not claimed — player still has to drag it.
    expect(result.current.state.foundWords.has('DOG')).toBe(false);
    expect(result.current.state.cascadeCount).toBe(1);
    expect(result.current.state.lastChainDepth).toBe(1);
    expect(result.current.state.chainEventKey).toBe(1);
    expect(result.current.state.status).toBe('playing');
  });

  it('manually finding the revealed word completes the level', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    // After CAT collapses, DOG sits across row 0: c0r0=D, c1r0=O, c2r0=G.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('DOG')).toBe(true);
    expect(result.current.state.status).toBe('levelComplete');
  });

  it('invalid selection triggers invalidShakeKey increment', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    const initialShakeKey = result.current.state.invalidShakeKey;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.invalidShakeKey).toBe(initialShakeKey + 1);
  });

  it('completing all words sets status to levelComplete', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

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
  });

  it('initializes tileIds parallel to the level columns', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));
    expect(result.current.state.tileIds).toEqual([
      ['t-0-0', 't-0-1', 't-0-2', 't-0-3'],
      ['t-1-0'],
      ['t-2-0'],
    ]);
  });

  it('ticks chest progress on every word found, even without gem tiles', () => {
    // Curated chain levels ship without gem tiles, so the old gem-only
    // chestProgressDelta left the bar at 0% throughout play. Every word now
    // contributes a base delta so the chest visibly fills.
    const { result } = renderHook(() => useBlastV2(mockLevel));
    expect(result.current.state.chestProgress).toBe(0);

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.chestProgress).toBeGreaterThan(0);
  });

  it('free-form dictionary match collapses the consumed tiles', () => {
    // Tiles selected across row 0 must be removed after a bonus match —
    // otherwise the board stays identical and the player remains stuck.
    const { result } = renderHook(() =>
      useBlastV2(mockLevel, { dictionaryCheck: (w) => w.toLowerCase() === 'cse' }),
    );
    const initialColumn0Height = result.current.state.level.columns[0]!.tiles.length;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    // Column 0's bottom tile (C) was consumed → height drops by one.
    expect(result.current.state.level.columns[0]!.tiles.length).toBe(initialColumn0Height - 1);
  });

  it('accepts free-form dictionary words via dictionaryCheck option', () => {
    // Board row 0 across spells "CSE" — not in level.words. With
    // dictionaryCheck accepting it, useBlastV2 should treat it as a
    // bonus match and add it to foundWords.
    const { result } = renderHook(() =>
      useBlastV2(mockLevel, { dictionaryCheck: (w) => w.toLowerCase() === 'cse' }),
    );

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.size).toBe(1);
    // Stored normalized (lowercase from config.normalize).
    expect(
      [...result.current.state.foundWords].some((w) => w.toLowerCase() === 'cse'),
    ).toBe(true);
  });

  it('exposes canUndo=false and a no-op undo before any move', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    expect(result.current.state.canUndo).toBe(false);
    act(() => {
      result.current.handlers.onUndo();
    });
    expect(result.current.state.foundWords.size).toBe(0);
  });

  it('undo restores prior level state after a successful submit', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    const initialCoins = result.current.state.coins;
    const initialColumns = result.current.state.level.columns;
    const initialTileIds = result.current.state.tileIds;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.canUndo).toBe(true);

    act(() => {
      result.current.handlers.onUndo();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(false);
    expect(result.current.state.foundWords.size).toBe(0);
    expect(result.current.state.coins).toBe(initialCoins);
    expect(result.current.state.level.columns).toEqual(initialColumns);
    expect(result.current.state.tileIds).toEqual(initialTileIds);
    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.status).toBe('playing');
  });

  it('undo stack supports multiple successive reversals', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

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

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.foundWords.has('SUN')).toBe(true);

    act(() => {
      result.current.handlers.onUndo();
    });
    expect(result.current.state.foundWords.has('SUN')).toBe(false);
    expect(result.current.state.foundWords.has('CAT')).toBe(true);

    act(() => {
      result.current.handlers.onUndo();
    });
    expect(result.current.state.foundWords.has('CAT')).toBe(false);
    expect(result.current.state.canUndo).toBe(false);
  });

  it('preserves tile identity through a collapse', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.tileIds).toEqual([
      ['t-0-3'],
      ['t-1-0'],
      ['t-2-0'],
    ]);
  });
});
