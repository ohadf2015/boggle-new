import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useVisibilityPausedInterval } from './useVisibilityPausedInterval';

/** Drive document.hidden + fire the visibilitychange event the hook listens for. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useVisibilityPausedInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('runs the callback on the interval while the tab is visible', () => {
    const cb = vi.fn();
    renderHook(() => useVisibilityPausedInterval(cb, 1000));
    expect(cb).not.toHaveBeenCalled(); // does not fire on mount — call sites own their initial fetch
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('pauses the interval while the tab is hidden', () => {
    const cb = vi.fn();
    renderHook(() => useVisibilityPausedInterval(cb, 1000));
    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    setHidden(true);
    vi.advanceTimersByTime(5000); // hidden — no ticks
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('resumes ticking when the tab becomes visible again', () => {
    const cb = vi.fn();
    renderHook(() => useVisibilityPausedInterval(cb, 1000, { fireOnResume: false }));
    setHidden(true);
    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(0);

    setHidden(false); // resume, no catch-up fire
    expect(cb).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(2000);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('fires once immediately on resume when fireOnResume is set', () => {
    const cb = vi.fn();
    renderHook(() => useVisibilityPausedInterval(cb, 1000, { fireOnResume: true }));
    setHidden(true);
    setHidden(false);
    expect(cb).toHaveBeenCalledTimes(1); // catch-up fire on return
  });

  it('does nothing when disabled', () => {
    const cb = vi.fn();
    renderHook(() => useVisibilityPausedInterval(cb, 1000, { enabled: false }));
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('clears the interval and listener on unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useVisibilityPausedInterval(cb, 1000));
    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);
    unmount();
    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1); // no ticks after unmount
  });
});
