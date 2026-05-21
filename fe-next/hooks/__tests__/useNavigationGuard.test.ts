/**
 * useNavigationGuard tests
 *
 * Focus: the teardown go(-1) must pop the phantom history entry ONLY when the
 * guard is disabled while staying on the page (game over → results). When the
 * player has navigated away (quit → router.push changed the URL), popping would
 * bounce them back — the exact race that produced a black screen on exit.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationGuard } from '../useNavigationGuard';

const GAME_URL = 'http://localhost:3000/en/daily/word-hunt';
const AWAY_URL = 'http://localhost:3000/en/daily';

describe('useNavigationGuard', () => {
  let goSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, '', GAME_URL);
    goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});
  });

  afterEach(() => {
    goSpy.mockRestore();
  });

  it('pops the phantom entry on teardown when still on the same URL (staying)', () => {
    // GIVEN the guard is active on the game URL
    const { unmount } = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }),
    );

    // WHEN the guard tears down while we're still on that URL
    unmount();

    // THEN it pops its phantom history entry exactly once
    expect(goSpy).toHaveBeenCalledWith(-1);
    expect(goSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT pop history on teardown after navigating away (no bounce)', () => {
    // GIVEN the guard is active
    const { unmount } = renderHook(() =>
      useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }),
    );

    // WHEN the URL has changed (a quit → router.push to /daily)
    act(() => {
      window.history.pushState({}, '', AWAY_URL);
    });
    unmount();

    // THEN it must not go(-1) — that would bounce the user back to the game
    expect(goSpy).not.toHaveBeenCalled();
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
