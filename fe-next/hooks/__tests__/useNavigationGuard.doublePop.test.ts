/**
 * Two teardown pops for ONE phantom entry throw the player off the page.
 *
 * `history.go(-1)` is asynchronous. If a second guard mounts and plants its own
 * phantom BEFORE that pop lands, the pop moves the stack back past the new
 * phantom, and the second teardown's `go(-1)` then eats a REAL history entry.
 *
 * Live evidence (2026-09-11, classroom round end, dev server): a student in a
 * teacher's live game was thrown from
 * `/en/multiplayer?room=SSPBSW&classroom=true` all the way back to
 * `/en/join/SSPBSW` one second after the teacher ended the round — so the
 * results screen never rendered. The recorded trace was exactly
 * push → go(-1) → push → popstate → go(-1) → `/en/join/SSPBSW`.
 *
 * The invariant: this module never pops more history entries than it pushed.
 */
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigationGuard, resetPhantomPopStateForTests } from '../useNavigationGuard';

describe('useNavigationGuard — never pops more than it pushed', () => {
  let goSpy: ReturnType<typeof vi.spyOn>;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetPhantomPopStateForTests();
    goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    pushSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetPhantomPopStateForTests();
  });

  it('does not plant a second phantom while its own pop is still in flight', () => {
    const first = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false })
    );
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // Round ends on the same URL → teardown pops the phantom. Not landed yet.
    first.unmount();
    expect(goSpy).toHaveBeenCalledTimes(1);

    // A new guard mounts in that window (StrictMode remount, a rematch, or a
    // reconnect `startGame` re-enabling the guard).
    const second = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false })
    );
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // ...and tears down before the pop arrives. It pushed nothing, so it must
    // pop nothing — a second go(-1) here is the real entry the player loses.
    second.unmount();
    expect(goSpy).toHaveBeenCalledTimes(1);
  });

  it('plants the deferred phantom once the in-flight pop lands', () => {
    vi.useFakeTimers();
    try {
      const first = renderHook(() =>
        useNavigationGuard({ enabled: true, onNavigationAttempt: () => false })
      );
      first.unmount();
      expect(pushSpy).toHaveBeenCalledTimes(1);

      renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }));
      expect(pushSpy).toHaveBeenCalledTimes(1);

      // The in-flight pop lands, the stack settles, the guard plants its own.
      window.dispatchEvent(new PopStateEvent('popstate'));
      vi.advanceTimersByTime(200);
      expect(pushSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
