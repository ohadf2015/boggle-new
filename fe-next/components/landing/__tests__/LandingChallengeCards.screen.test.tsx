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

describe('LandingChallengeCards home', () => {
  it('shows the live arena first and every other mode on the page', () => {
    const { container, queryByTestId } = render(<LandingChallengeCards {...props} />);
    expect(queryByTestId('landing-cubes-more')).toBeNull();
    const cubes = Array.from(container.querySelectorAll('[data-cube-key]'));
    expect(cubes[0].getAttribute('data-cube-key')).toBe('arena');
    expect(cubes.length).toBeGreaterThanOrEqual(7);
  });

  it('leaves the daily to the home itself', () => {
    const { container } = render(<LandingChallengeCards {...props} />);
    expect(container.querySelector('[data-testid="home-daily-hero"]')).toBeNull();
  });
});
