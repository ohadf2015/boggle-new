/**
 * LandingMobileCards — Boss Rush entry point
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
  },
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

import { LandingMobileCards } from '../LandingMobileCards';

const baseProps = {
  language: 'en',
  isMobilePortrait: true,
  isAdmin: false,
  hasBlastAccess: false,
  activePlayers: 0,
  t: (k: string) => {
    const map: Record<string, string> = {
      'adventure.bossRush.title': 'Boss Rush',
      'adventure.bossRush.subtitle': 'Defeat every boss in a row!',
    };
    return map[k] ?? k;
  },
  onSinglePlayerClick: vi.fn(),
  onShareClick: vi.fn(),
  dailyChallengeStats: {
    hasPlayed: false,
    hasSolved: null,
    currentStreak: 0,
    puzzleNumber: 1,
    loading: false,
  },
};

describe('LandingMobileCards — Boss Rush entry point', () => {
  it('renders a link to /adventure/boss-rush', () => {
    render(<LandingMobileCards {...baseProps} />);
    const link = screen.getByRole('link', { name: /boss rush/i });
    expect(link).toHaveAttribute('href', '/en/adventure/boss-rush');
  });
});
