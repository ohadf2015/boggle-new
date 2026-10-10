import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/landing/home/HomeDailyHero', () => {
  const HomeDailyHero = () => <div data-testid="home-daily-hero" />;
  return { __esModule: true, HomeDailyHero };
});
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => true }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({ userStats: { totalGamesPlayed: 5 }, isLoading: false }),
}));

const props = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards layout="screen"', () => {
  it('shows the live arena plus four modes and parks the rest behind More', () => {
    const { container, getByTestId } = render(<LandingChallengeCards {...props} layout="screen" />);
    const cubes = Array.from(container.querySelectorAll('[data-cube-key]'));
    expect(cubes).toHaveLength(5);
    expect(cubes[0].getAttribute('data-cube-key')).toBe('arena');
    expect(getByTestId('landing-cubes-more')).toHaveTextContent(/\+\d+/);
  });

  it('leaves the daily to the home itself', () => {
    const { container } = render(<LandingChallengeCards {...props} layout="screen" />);
    expect(container.querySelector('[data-testid="home-daily-hero"]')).toBeNull();
  });
});
