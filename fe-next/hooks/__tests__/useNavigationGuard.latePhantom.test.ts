// @vitest-environment happy-dom
/**
 * A phantom pop that lands AFTER the 1s claim TTL must still not open
 * "Leave the Hunt?" at the start of the next Quick Play round.
 *
 * Round end calls history.go(-1). The pop is async. If the player sits on
 * results longer than PHANTOM_POP_TTL_MS, the claim is dropped so the next
 * guard can plant. The browser can still deliver that go(-1) when the new
 * round's pushState runs — and the new guard reads it as Back, opening the
 * quit dialog over a board the player cannot touch (body pointer-events:none).
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationGuard, resetPhantomPopStateForTests } from '../useNavigationGuard';

describe('useNavigationGuard — late phantom pop after the claim TTL', () => {
  beforeEach(() => {
    resetPhantomPopStateForTests();
    vi.useFakeTimers();
    vi.spyOn(window.history, 'go').mockImplementation(() => {});
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetPhantomPopStateForTests();
  });

  it('does not treat a pop that lands after the TTL as a back press on the next round', () => {
    const first = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }),
    );
    // Round ends on the same URL. go(-1) is in flight; the pop has not landed.
    first.unmount();

    // Player reads results longer than the claim TTL. The next round may now plant.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const onNavigationAttempt = vi.fn(() => false);
    renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt }));

    // The deferred go(-1) arrives as the new board's guard is listening.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onNavigationAttempt).not.toHaveBeenCalled();
  });

  it('still guards a real back press after the late phantom has been swallowed', () => {
    const first = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }),
    );
    first.unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const onNavigationAttempt = vi.fn(() => false);
    renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt }));

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Past the guard's rapid-fire debounce, so this is a second press, not a double event.
    act(() => {
      vi.advanceTimersByTime(150);
    });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onNavigationAttempt).toHaveBeenCalledTimes(1);
  });

  it('guards a real back press if the late pop never arrives', () => {
    const first = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }),
    );
    first.unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const onNavigationAttempt = vi.fn(() => false);
    renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt }));

    // The deferred pop was lost. After the post-plant window, Back is real again.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onNavigationAttempt).toHaveBeenCalledTimes(1);
  });
});
