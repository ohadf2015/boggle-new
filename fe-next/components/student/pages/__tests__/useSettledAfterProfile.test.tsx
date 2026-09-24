/**
 * The lesson hooks (`useStudentProgress`, `usePracticeLessons`) gate on the
 * derived `isAuthenticated` (= user AND profile). On a cold load the session
 * lands first: the hooks settle to an EMPTY list with `isLoading: false`, and
 * only refetch once the profile row arrives — without flipping `isLoading` back
 * on. Rendering "No lessons yet" in that window is a flash of a false state
 * (pitfall class 1). The page waits until the lists have been re-delivered
 * after the profile landed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettledAfterProfile } from '../useSettledAfterProfile';

afterEach(() => vi.useRealTimers());

describe('useSettledAfterProfile', () => {
  it('is settled at once when the profile was already there at mount', () => {
    const a: unknown[] = [];
    const { result } = renderHook(() => useSettledAfterProfile(true, [a]));
    expect(result.current).toBe(true);
  });

  it('is NOT settled while the profile is missing, nor right after it lands with the same stale lists', () => {
    const stale: unknown[] = [];
    const { result, rerender } = renderHook(({ p, lists }) => useSettledAfterProfile(p, lists), {
      initialProps: { p: false, lists: [stale] as unknown[][] },
    });
    expect(result.current).toBe(false);
    rerender({ p: true, lists: [stale] });
    expect(result.current).toBe(false);
  });

  it('settles once every list has been re-delivered after the profile landed', () => {
    const a0: unknown[] = [];
    const b0: unknown[] = [];
    const { result, rerender } = renderHook(({ p, lists }) => useSettledAfterProfile(p, lists), {
      initialProps: { p: false, lists: [a0, b0] as unknown[][] },
    });
    rerender({ p: true, lists: [a0, b0] });
    rerender({ p: true, lists: [[], b0] });
    expect(result.current).toBe(false);
    rerender({ p: true, lists: [[], []] });
    expect(result.current).toBe(true);
  });

  it('never holds forever: gives up waiting after the deadline', () => {
    vi.useFakeTimers();
    const a0: unknown[] = [];
    const { result, rerender } = renderHook(({ p, lists }) => useSettledAfterProfile(p, lists, 5000), {
      initialProps: { p: false, lists: [a0] as unknown[][] },
    });
    rerender({ p: true, lists: [a0] });
    act(() => { vi.advanceTimersByTime(5001); });
    expect(result.current).toBe(true);
  });
});
