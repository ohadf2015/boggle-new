import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeDailyHero } from '../HomeDailyHero';
import { LaunchProvider, LAUNCH_HOLD_MS } from '../HomeLaunch';
import { LaunchHost } from '../LaunchHost';
import { dropLaunch } from '../launchStore';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch: vi.fn() }),
  usePathname: () => '/en',
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, prefetch: _p, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let wheelWord = 'PUZZLE';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'landing.home.wheelWord' ? wheelWord : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/useDailyChallengeStats', () => ({
  useDailyChallengeStats: () => ({
    countdown: '05:00:00',
    hasPlayed: false,
    hasSolved: false,
    streak: 0,
    puzzleNumber: 285,
    isClient: true,
    loading: false,
  }),
}));
vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => ({ loading: false, currentStreak: 0, completedDates: [], cycleStart: '' }),
}));
vi.mock('@/utils/dailyChallenge/storage', () => ({ getLastSevenDaysCompletion: () => [] }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

describe('HomeDailyHero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
    wheelWord = 'PUZZLE';
  });
  afterEach(() => {
    act(() => dropLaunch());
    vi.useRealTimers();
  });

  it('rings the mascot with one wheel tile per letter of the localized word', () => {
    wheelWord = 'חידות';
    render(<HomeDailyHero />);
    const tiles = screen.getByTestId('daily-wheel').querySelectorAll('[data-wheel-tile]');
    expect(Array.from(tiles).map((el) => el.textContent).join('')).toBe('חידות');
  });

  it('launches into the daily Word Wheel in the daily colour', () => {
    render(
      <>
        <LaunchProvider>
          <HomeDailyHero />
        </LaunchProvider>
        <LaunchHost />
      </>,
    );
    fireEvent.click(screen.getByTestId('home-daily-hero'));
    expect(screen.getByTestId('home-launch')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(LAUNCH_HOLD_MS);
    });
    expect(push).toHaveBeenCalledWith('/en/daily/word-wheel');
  });
});
