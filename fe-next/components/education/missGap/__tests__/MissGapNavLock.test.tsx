/**
 * @vitest-environment jsdom
 *
 * RED first — two writers of one boolean, and the student's screen scrolls again.
 *
 * The nav-hide signal is a plain `useState<boolean>` in `NavigationContext`
 * (`setIsInGame`), with no ref count. The student homework route has TWO
 * independent writers of it:
 *
 *   1. `MissGapShellLock chromeFree` — held for the whole route, because the
 *      global bottom nav is wrong chrome on a share-link surface AND its
 *      `has-global-bottom-nav` padding is the 59px of body height the critic
 *      measured on the pre-start screen.
 *   2. `MissGapGame` — taken when the student taps PLAY, released on exit.
 *
 * Writer 2's cleanup writes `false` unconditionally. So the moment a student
 * closes the game and lands back on the intro card — the single most common
 * path on this screen — the nav comes back, the padding comes back, and the
 * pre-start screen scrolls exactly as it did in the round the critic rejected.
 * The route lock is still mounted and still believes it holds the nav down;
 * nobody re-asserts it. That is pitfalls Class 1 (two owners of one value,
 * last writer wins) wearing a Class 3 coat (two paths to the same state that
 * do not behave identically).
 *
 * The fix is a ref-counted claim shared by both writers, in the same shape as
 * `useEducationShellLock`: nested claims nest, and the nav only comes back when
 * the LAST claim is released. These tests pin exactly that, and both of the
 * first two fail against the unconditional `setIsInGame(false)` cleanup.
 */
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setIsInGame = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGame,
}));

import { acquireMissGapNavLock, useMissGapNavLock } from '../useMissGapNavLock';

function Holder({ active = true }: { active?: boolean }) {
  useMissGapNavLock(active);
  return null;
}

describe('miss-gap nav lock — ref counted, because two components claim it', () => {
  beforeEach(() => {
    setIsInGame.mockClear();
    // Drain any count left by a previous test's unmount ordering.
    while (acquireMissGapNavLock.count > 0) acquireMissGapNavLock.__drainForTest();
    setIsInGame.mockClear();
  });

  it('given the route lock is still held, when the game unmounts, then the nav stays hidden', () => {
    // The exact live sequence: land on the intro (route lock), tap PLAY (game
    // lock), tap X (game unmounts). The student is back on the pre-start
    // screen, which must still be chrome-free and still fit 844.
    const route = render(<Holder />);
    const game = render(<Holder />);
    setIsInGame.mockClear();

    act(() => game.unmount());

    expect(setIsInGame).not.toHaveBeenCalledWith(false);

    // ...and only when the route itself goes does the app get its nav back.
    act(() => route.unmount());
    expect(setIsInGame).toHaveBeenCalledWith(false);
  });

  it('given no lock is held, when one is claimed, then the nav hides exactly once', () => {
    const a = render(<Holder />);
    const b = render(<Holder />);

    // One transition, not one call per claimant: a boolean setter called twice
    // is harmless but a re-entrant `true` during the release of a sibling is
    // how the flicker in NavigationProvider's effect showed up.
    expect(setIsInGame.mock.calls.filter(([v]) => v === true)).toHaveLength(1);

    act(() => {
      a.unmount();
      b.unmount();
    });
  });

  it('given active=false, when mounted, then it never touches the nav', () => {
    // The teacher compose card keeps the dashboard chrome it arrived with.
    const held = render(<Holder active={false} />);

    expect(setIsInGame).not.toHaveBeenCalled();

    act(() => held.unmount());
    expect(setIsInGame).not.toHaveBeenCalled();
  });

  it('given an over-release, when the count is already zero, then it never goes negative', () => {
    // A double-invoked cleanup (StrictMode) must not push the count below zero,
    // or the next real claim would fail to hide the nav.
    acquireMissGapNavLock.__drainForTest();
    acquireMissGapNavLock.__drainForTest();
    expect(acquireMissGapNavLock.count).toBe(0);

    const held = render(<Holder />);
    expect(setIsInGame).toHaveBeenCalledWith(true);
    act(() => held.unmount());
  });
});
