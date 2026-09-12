/**
 * @vitest-environment jsdom
 *
 * RED first — the student homework surface must be chrome-free.
 *
 * The r3 contrast audit on `/en/education/miss-gap-assignment` at 390x844
 * flagged four controls. Three of them — QUESTS, FRIENDS, HOME — are the
 * GLOBAL bottom nav, all with `edgeRatio 0` (borderless against the navy), and
 * none of them belong on a homework surface reached from a share link. The
 * design addendum is explicit: game surfaces stay chrome-free, no tabs.
 *
 * `MissGapGame` already hides the nav once the student taps Start, so the
 * rounds themselves are clean. The INTRO screen — the one a student actually
 * lands on — still carried it, which is both a contrast failure and the
 * `has-global-bottom-nav` padding the shell lock has to fight.
 *
 * So the lock takes the nav down for the whole student route, not just once
 * play begins. The teacher's compose card keeps its chrome: it is a tool
 * surface the teacher reached from the dashboard, not a game.
 */
import { render } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';

const setIsInGame = vi.fn();
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => setIsInGame,
}));

import { MissGapShellLock } from '../MissGapShellLock';

beforeEach(() => {
  setIsInGame.mockClear();
});

afterEach(() => {
  document.body.className = '';
});

describe('MissGapShellLock chrome', () => {
  it('given chromeFree, when mounted, then the global bottom nav is hidden', () => {
    render(<MissGapShellLock chromeFree />);

    expect(setIsInGame).toHaveBeenCalledWith(true);
  });

  it('given chromeFree, when unmounted, then the nav comes back', () => {
    const { unmount } = render(<MissGapShellLock chromeFree />);
    setIsInGame.mockClear();

    unmount();

    expect(setIsInGame).toHaveBeenCalledWith(false);
  });

  it('given no chromeFree flag, when mounted, then the nav is left alone', () => {
    // The teacher compose card keeps the dashboard chrome it arrived with.
    render(<MissGapShellLock />);

    expect(setIsInGame).not.toHaveBeenCalledWith(true);
  });

  it('given chromeFree, when mounted, then it still locks the body scroll', () => {
    // The two locks are independent and both must hold — hiding the nav drops
    // the bottom-nav padding, but the cookie-sheet reservation needs the class.
    render(<MissGapShellLock chromeFree />);

    expect(document.body.classList.contains('edu-shell-locked')).toBe(true);
  });
});
