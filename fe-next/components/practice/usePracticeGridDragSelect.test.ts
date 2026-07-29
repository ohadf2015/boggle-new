import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeGridDragSelect } from './usePracticeGridDragSelect';

describe('usePracticeGridDragSelect', () => {
  it('starts with empty path', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    expect(result.current.path).toEqual([]);
  });

  it('first cell enter adds the cell', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S']);
  });

  it('extends path when next cell is adjacent (orthogonal)', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(0, 1, 'T'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S', 'T']);
  });

  it('extends path when next cell is diagonal', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(1, 1, 'X'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S', 'X']);
  });

  it('rejects non-adjacent cell', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(2, 2, 'X'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S']);
  });

  it('backtracks when re-entering an already-selected cell', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.onCellEnter(0, 1, 'T'));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    expect(result.current.path.map((c) => c.letter)).toEqual(['S']);
  });

  it('clear() resets path', () => {
    const { result } = renderHook(() => usePracticeGridDragSelect({ rows: 4, cols: 4 }));
    act(() => result.current.onCellEnter(0, 0, 'S'));
    act(() => result.current.clear());
    expect(result.current.path).toEqual([]);
  });
});
