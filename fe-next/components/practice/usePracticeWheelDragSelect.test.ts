import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeWheelDragSelect } from './usePracticeWheelDragSelect';

describe('usePracticeWheelDragSelect', () => {
  const letters = ['S', 'T', 'A', 'R', 'E'];

  it('starts empty', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    expect(result.current.path).toEqual([]);
  });

  it('any letter index can be the first selected', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(2));
    expect(result.current.path).toEqual([2]);
  });

  it('any non-already-selected letter can be appended (no adjacency on a wheel)', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.onLetterEnter(2));
    act(() => result.current.onLetterEnter(4));
    expect(result.current.path).toEqual([0, 2, 4]);
  });

  it('rejects re-using an already-selected letter', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.onLetterEnter(0));
    expect(result.current.path).toEqual([0]);
  });

  it('clear() resets', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.clear());
    expect(result.current.path).toEqual([]);
  });

  it('word() returns the spelled string', () => {
    const { result } = renderHook(() => usePracticeWheelDragSelect({ letters }));
    act(() => result.current.onLetterEnter(0));
    act(() => result.current.onLetterEnter(1));
    act(() => result.current.onLetterEnter(2));
    expect(result.current.word()).toBe('STA');
  });
});
