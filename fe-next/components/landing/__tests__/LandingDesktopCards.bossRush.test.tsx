/**
 * LandingDesktopCards — Boss Rush entry point
 *
 * Ensures the Boss Rush mode has a reachable entry point on the landing page.
 * Before this test, /adventure/boss-rush was orphaned (zero inbound links).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ dir: 'ltr', language: 'en', t: (k: string) => k, setLanguage: vi.fn() }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));

vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
}));

vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: vi.fn(),
}));

vi.mock('@/components/daily/DailyChallengeBanner', () => ({
  default: () => <div data-testid="daily-challenge-banner" />,
}));

import { LandingDesktopCards } from '../LandingDesktopCards';

const baseProps = {
  language: 'en',
  isAdmin: false,
  hasBlastAccess: false,
  activePlayers: 0,
  openRooms: 0,
  totalPlayers: 0,
  playerAllTimeBest: null,
  t: (k: string) => {
    const map: Record<string, string> = {
      'adventure.bossRush.title': 'Boss Rush',
      'adventure.bossRush.subtitle': 'Defeat every boss in a row!',
    };
    return map[k] ?? k;
  },
  onShareClick: vi.fn(),
  dailyChallengeStats: {
    hasPlayed: false,
    hasSolved: null,
    currentStreak: 0,
    puzzleNumber: 1,
    loading: false,
  },
};

describe('LandingDesktopCards — Boss Rush entry point', () => {
  it('renders a link to /adventure/boss-rush', () => {
    render(<LandingDesktopCards {...baseProps} />);

    const link = screen.getByRole('link', { name: /boss rush/i });
    expect(link).toHaveAttribute('href', '/en/adventure/boss-rush');
  });

  it('shows the Boss Rush title', () => {
    render(<LandingDesktopCards {...baseProps} />);
    expect(screen.getByText('Boss Rush')).toBeInTheDocument();
  });
});
