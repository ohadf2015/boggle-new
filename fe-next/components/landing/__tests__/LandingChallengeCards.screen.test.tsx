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
  it('shows the live arena plus four modes in the grid and parks the rest under More', () => {
    const { container } = render(<LandingChallengeCards {...props} layout="screen" />);
    const more = container.querySelector('[data-testid="landing-cubes-more"]');
    expect(more).not.toBeNull();
    const cubes = Array.from(container.querySelectorAll('[data-cube-key]'));
    const inGrid = cubes.filter((el) => !more!.contains(el));
    const parked = cubes.filter((el) => more!.contains(el));
    expect(inGrid).toHaveLength(5);
    expect(inGrid[0].getAttribute('data-cube-key')).toBe('arena');
    expect(parked.length).toBe(cubes.length - 5);
    expect(parked.length).toBeGreaterThan(0);
  });

  it('keeps the calm room out of the screen layout (it is parked under More)', () => {
    const { container } = render(<LandingChallengeCards {...props} layout="screen" />);
    expect(container.querySelector('[data-testid="landing-cubes-calm"]')).toBeNull();
  });
});
