/**
 * useNavigationGuard tests
 *
 * Focus: the teardown phantom-pop must NOT race an in-flight client navigation.
 * A quit confirms → `router.push('/daily')` (async) and the guard disables in
 * the same commit. A go(-1) in the cleanup runs before the push commits
 * location.href, so the back-nav wins and the push is dropped — the user is
 * stranded (web: stuck in game; native: the Capacitor WebView blanks to BLACK =
 * the "exit mid-daily-challenge → black screen" report). Reading location.href
 * at cleanup can't detect this (still the game URL), so the consumer passes a
 * deterministic `leaving` flag: when set, the teardown skips the pop entirely.
 * When the guard disables while STAYING (game over → results on the same URL),
 * `leaving` is false and the phantom is popped so the back button still works.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationGuard } from '../useNavigationGuard';

const GAME_URL = 'http://localhost:3000/en/daily/word-hunt';

describe('useNavigationGuard', () => {
  let goSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, '', GAME_URL);
    goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});
  });

  afterEach(() => {
    goSpy.mockRestore();
  });

  it('does NOT pop on teardown when leaving=true — a go(-1) race-cancels the quit nav (black screen)', () => {
    // GIVEN the guard armed, then the consumer flips `leaving` on quit confirm
    // (same commit that disables the guard and fires router.push)
    const { rerender, unmount } = renderHook(
      ({ leaving }) =>
        useNavigationGuard({ enabled: !leaving, onNavigationAttempt: () => false, leaving }),
      { initialProps: { leaving: false } },
    );
    rerender({ leaving: true });
    unmount();

    // THEN it must NOT pop; that would cancel the in-flight router.push
    expect(goSpy).not.toHaveBeenCalled();
  });

  it('pops the phantom on teardown when we genuinely stayed (game over → results, not leaving)', () => {
    // GIVEN the guard is active and we stay on the same URL (results render here)
    const { unmount } = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }),
    );

    // WHEN it tears down while NOT leaving and still on the phantom URL
    unmount();

    // THEN it pops the phantom entry exactly once so back works normally after
    expect(goSpy).toHaveBeenCalledWith(-1);
    expect(goSpy).toHaveBeenCalledTimes(1);
  });

  it('routes a back-button press to onNavigationAttempt while enabled', () => {
    // GIVEN a guard that blocks navigation
    const onNavigationAttempt = vi.fn(() => false);
    renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt }));

    // WHEN the browser back button fires
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // THEN the consumer's handler decides what to do
    expect(onNavigationAttempt).toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    // GIVEN the guard is disabled (e.g. practice / game over)
    const { unmount } = renderHook(() =>
      useNavigationGuard({ enabled: false, onNavigationAttempt: () => false }),
    );

    // WHEN it tears down
    unmount();

    // THEN no history manipulation happens
    expect(goSpy).not.toHaveBeenCalled();
  });
});
