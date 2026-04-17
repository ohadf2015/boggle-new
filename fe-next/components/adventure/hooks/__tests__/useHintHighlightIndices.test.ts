/**
 * useHintHighlightIndices Tests
 *
 * Priority cascade for highlighted tile indices:
 *   1. hintData.highlightTiles (explicit hint)
 *   2. Time Freeze T2 longest-findable-word path
 *   3. currentHint.path
 *   4. gemDetectorHighlights
 *   5. []
 */

import { renderHook } from '@testing-library/react';
import { useHintHighlightIndices } from '../useHintHighlightIndices';

type Pos = { row: number; col: number };

const basePathFinder = (_w: string): Pos[] | null => null;

describe('useHintHighlightIndices', () => {
  const baseProps = {
    hintData: { level: 'none' as const, highlightTiles: [] as Pos[] },
    currentHint: null as { path: Pos[] } | null,
    gridSize: 4,
    isFrozen: false,
    freezeHighlightsWord: false,
    remainingHintWords: [] as string[],
    findPathForWord: basePathFinder,
    gemDetectorHighlights: [] as number[],
  };

  it('returns [] when nothing active', () => {
    const { result } = renderHook(() => useHintHighlightIndices(baseProps));
    expect(result.current).toEqual([]);
  });

  it('hintData takes top priority', () => {
    const { result } = renderHook(() => useHintHighlightIndices({
      ...baseProps,
      hintData: { level: 'low' as const, highlightTiles: [{ row: 0, col: 1 }, { row: 1, col: 2 }] },
      currentHint: { path: [{ row: 3, col: 3 }] },
      gemDetectorHighlights: [15],
    }));
    expect(result.current).toEqual([1, 6]);
  });

  it('freeze T2 longest word wins over currentHint/gem', () => {
    const findPathForWord = (w: string): Pos[] | null =>
      w === 'LONGER' ? [{ row: 0, col: 0 }, { row: 0, col: 1 }] : null;
    const { result } = renderHook(() => useHintHighlightIndices({
      ...baseProps,
      isFrozen: true,
      freezeHighlightsWord: true,
      remainingHintWords: ['CAT', 'LONGER', 'DOG'],
      findPathForWord,
      currentHint: { path: [{ row: 3, col: 3 }] },
      gemDetectorHighlights: [15],
    }));
    expect(result.current).toEqual([0, 1]);
  });

  it('falls to currentHint.path when freeze disabled', () => {
    const { result } = renderHook(() => useHintHighlightIndices({
      ...baseProps,
      currentHint: { path: [{ row: 2, col: 2 }] },
      gemDetectorHighlights: [0, 1],
    }));
    expect(result.current).toEqual([10]);
  });

  it('falls to gemDetectorHighlights when no hint/freeze/currentHint', () => {
    const { result } = renderHook(() => useHintHighlightIndices({
      ...baseProps,
      gemDetectorHighlights: [3, 7, 11],
    }));
    expect(result.current).toEqual([3, 7, 11]);
  });

  it('skips freeze tier when remainingHintWords empty', () => {
    const { result } = renderHook(() => useHintHighlightIndices({
      ...baseProps,
      isFrozen: true,
      freezeHighlightsWord: true,
      remainingHintWords: [],
      currentHint: { path: [{ row: 1, col: 1 }] },
    }));
    expect(result.current).toEqual([5]);
  });

  it('skips freeze tier when findPathForWord returns null', () => {
    const { result } = renderHook(() => useHintHighlightIndices({
      ...baseProps,
      isFrozen: true,
      freezeHighlightsWord: true,
      remainingHintWords: ['NOPE'],
      findPathForWord: () => null,
      gemDetectorHighlights: [2],
    }));
    expect(result.current).toEqual([2]);
  });
});
