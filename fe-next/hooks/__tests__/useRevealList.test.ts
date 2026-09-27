/**
 * useRevealList — top-N reveal/collapse logic for results word lists.
 *
 * Shared by UniqueWordsSection and MissedWords so the "show top 3 + expand"
 * declutter pattern lives in one place. Pure state logic, no rendering.
 */

import { renderHook, act } from '@testing-library/react';
import { useRevealList } from '../useRevealList';

describe('useRevealList', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('defaults to showing the first 3 items', () => {
    const { result } = renderHook(() => useRevealList(items));
    expect(result.current.visible).toEqual(['a', 'b', 'c']);
    expect(result.current.showAll).toBe(false);
  });

  it('honors a custom initialCount', () => {
    const { result } = renderHook(() => useRevealList(items, 2));
    expect(result.current.visible).toEqual(['a', 'b']);
  });

  it('reports hasMore and hiddenCount when list exceeds the cap', () => {
    const { result } = renderHook(() => useRevealList(items, 3));
    expect(result.current.hasMore).toBe(true);
    expect(result.current.hiddenCount).toBe(2);
  });

  it('reports no overflow when list fits within the cap', () => {
    const { result } = renderHook(() => useRevealList(['x', 'y'], 3));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.hiddenCount).toBe(0);
    expect(result.current.visible).toEqual(['x', 'y']);
  });

  it('reveals all items after toggle, then collapses back', () => {
    const { result } = renderHook(() => useRevealList(items, 3));

    act(() => result.current.toggle());
    expect(result.current.showAll).toBe(true);
    expect(result.current.visible).toEqual(items);

    act(() => result.current.toggle());
    expect(result.current.showAll).toBe(false);
    expect(result.current.visible).toEqual(['a', 'b', 'c']);
  });

  it('handles an empty list without overflow', () => {
    const { result } = renderHook(() => useRevealList([], 3));
    expect(result.current.visible).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.hiddenCount).toBe(0);
  });
});
