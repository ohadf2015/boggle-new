/**
 * The daily tile used to show a pulsing flame chip from the very first day.
 *
 * Measured 2026-08-01: 78% of players sit at a current streak of 0 or 1, so for
 * four out of five people that chip announced "1 day streak" — a number that is
 * not an achievement, animated to draw the eye anyway. A streak only reads as
 * something earned once it has survived a few days, so the chip now waits until
 * then and the board position carries the tile instead.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockStreak = 0;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-01-29',
  getPuzzleNumber: () => 123,
  getSecondsUntilNextDaily: () => 3600,
  formatCountdown: () => '01:00:00',
  getWordHuntStatusToday: () => null,
  getDailyStreak: () => ({ currentStreak: mockStreak }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

import DailyChallengeBanner from '../DailyChallengeBanner';
import { MIN_STREAK_TO_DISPLAY } from '../DailyChallengeBanner';

describe('DailyChallengeBanner streak chip threshold', () => {
  it.each([0, 1, 2])('hides the streak chip at a streak of %i', (streak) => {
    mockStreak = streak;
    render(<DailyChallengeBanner />);
    expect(screen.queryByText(/daily\.dayStreak/)).not.toBeInTheDocument();
  });

  it('shows the streak chip once the streak is worth mentioning', () => {
    mockStreak = MIN_STREAK_TO_DISPLAY;
    render(<DailyChallengeBanner />);
    expect(screen.getByText(/daily\.dayStreak/)).toBeInTheDocument();
  });

  it('keeps showing it for long streaks', () => {
    mockStreak = 42;
    render(<DailyChallengeBanner />);
    expect(screen.getByText(/daily\.dayStreak/)).toBeInTheDocument();
  });

  it('sets the threshold above the value most players actually hold', () => {
    expect(MIN_STREAK_TO_DISPLAY).toBeGreaterThan(1);
  });
});
