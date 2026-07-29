/**
 * useSubmitGuard — ref-based one-shot guard against double-submit races.
 *
 * Party submit/vote/night-action handlers fire `onSendInput` then `setState`.
 * Because React state updates are async, two fast taps both pass a state-based
 * guard and emit duplicate actions. A ref flips synchronously, so the second
 * call is blocked in the same tick — before any re-render.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubmitGuard } from '../useSubmitGuard';

describe('useSubmitGuard', () => {
  it('runs the first call and blocks subsequent calls until reset', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useSubmitGuard());

    act(() => {
      result.current.run(fn);
      result.current.run(fn); // synchronous second tap — must be blocked
      result.current.run(fn);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-arms after reset()', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useSubmitGuard());

    act(() => result.current.run(fn));
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => result.current.reset());

    act(() => result.current.run(fn));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('reports locked state', () => {
    const { result } = renderHook(() => useSubmitGuard());
    expect(result.current.isLocked()).toBe(false);
    act(() => result.current.run(() => {}));
    expect(result.current.isLocked()).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isLocked()).toBe(false);
  });

  it('keeps a stable run/reset identity across renders', () => {
    const { result, rerender } = renderHook(() => useSubmitGuard());
    const firstRun = result.current.run;
    const firstReset = result.current.reset;
    rerender();
    expect(result.current.run).toBe(firstRun);
    expect(result.current.reset).toBe(firstReset);
  });
});
