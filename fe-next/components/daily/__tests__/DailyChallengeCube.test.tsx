/**
 * DailyChallengeCube — the bento-native daily hero used by the `cubes` homepage
 * arm when the `landing-daily-cube-v1` flag is `cube`. It must speak the mode-cube
 * design language (full-bleed cube art, neo-brutalist tile, shared idle sheen)
 * while still surfacing the live daily data: puzzle #, countdown, streak, and the
 * win/loss outcome once played.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// The component reads its live data from the shared hook — mock it so each test
// drives the exact daily state it wants.
const mockStats = vi.fn();
vi.mock('@/hooks/useDailyChallengeStats', () => ({
  useDailyChallengeStats: () => mockStats(),
}));

import DailyChallengeCube from '../DailyChallengeCube';

const baseStats = {
  countdown: '01:00:00',
  hasPlayed: false,
  hasSolved: false,
  streak: 0,
  puzzleNumber: 123,
  isClient: true,
};

describe('DailyChallengeCube', () => {
  beforeEach(() => mockStats.mockReturnValue(baseStats));

  it('renders the daily cube art (cube grammar, not the floating mascot)', () => {
    render(<DailyChallengeCube />);
    const art = screen.getByTestId('daily-challenge-cube').querySelector('img');
    expect(art).toHaveAttribute('src', '/modes/cubes/daily.png');
    expect(art).toHaveAttribute('alt', '');
  });

  it('links to the daily challenge route and carries the shared sheen', () => {
    render(<DailyChallengeCube />);
    expect(screen.getByTestId('daily-challenge-cube')).toHaveAttribute('href', '/en/daily');
    expect(screen.getByTestId('cube-sheen')).toHaveClass('cube-sheen');
  });

  it('shows puzzle number and countdown', () => {
    render(<DailyChallengeCube />);
    expect(screen.getByText('#123')).toBeInTheDocument();
    expect(screen.getByText('01:00:00')).toBeInTheDocument();
  });

  it('shows a streak chip only when the streak is positive', () => {
    const { rerender } = render(<DailyChallengeCube />);
    expect(screen.queryByText(/daily\.dayStreak/)).not.toBeInTheDocument();

    mockStats.mockReturnValue({ ...baseStats, streak: 5 });
    rerender(<DailyChallengeCube />);
    expect(screen.getByText(/5 daily\.dayStreak/)).toBeInTheDocument();
  });

  it('shows the won badge when the player solved today', () => {
    mockStats.mockReturnValue({ ...baseStats, hasPlayed: true, hasSolved: true });
    render(<DailyChallengeCube />);
    expect(screen.getByTestId('won-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('lost-badge')).not.toBeInTheDocument();
  });

  it('shows the lost badge when the player played but missed today', () => {
    mockStats.mockReturnValue({ ...baseStats, hasPlayed: true, hasSolved: false });
    render(<DailyChallengeCube />);
    expect(screen.getByTestId('lost-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('won-badge')).not.toBeInTheDocument();
  });
});
