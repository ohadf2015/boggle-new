import React from 'react';
import { render, act } from '@testing-library/react';

/**
 * Regression guard for the "cleanup returned from a nested callback" leak.
 *
 * The podium's score counter starts its count-up animation inside a
 * `setTimeout`. A cleanup returned from *that* callback is discarded — only a
 * function returned from the `useEffect` body is honoured. So unmounting after
 * the delay elapsed used to leave the `animate()` controls running and the
 * motion-value subscription attached.
 */

const stopSpy = vi.fn();
const unsubSpy = vi.fn();

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    animate: vi.fn(() => ({ stop: stopSpy })),
    useTransform: () => ({ on: () => unsubSpy, get: () => 0 }),
  };
});

vi.mock('../../../components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock('../../../utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

import TvResultsWinnersPodium from '../TvResultsWinnersPodium';

const players = [
  { username: 'Ann', score: 30, wordCount: 5 },
  { username: 'Bo', score: 20, wordCount: 4 },
  { username: 'Cy', score: 10, wordCount: 3 },
];

const t = (path: string) => path;

describe('TvResultsWinnersPodium — count-up cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stopSpy.mockClear();
    unsubSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops the animation and unsubscribes when unmounted after the start delay', () => {
    const { unmount } = render(
      <TvResultsWinnersPodium
        players={players}
        show3rd
        show2nd
        show1st
        showConfetti={false}
        t={t}
      />
    );

    // Let every staggered start delay elapse so the animations are live.
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    unmount();

    expect(stopSpy).toHaveBeenCalled();
    expect(unsubSpy).toHaveBeenCalled();
  });
});
