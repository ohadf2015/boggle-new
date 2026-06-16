import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';
import { getCardOrder, type GameModeStats } from '@/lib/landing/fetchGameModeStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/daily/DailyChallengeCube', () => {
  const DailyChallengeCube = () => <div data-testid="daily-challenge-cube" />;
  DailyChallengeCube.displayName = 'DailyChallengeCube';
  return { __esModule: true, default: DailyChallengeCube };
});

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));

vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
}));

vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner">daily</div>;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

const mockIsVeteran = vi.fn(() => false);
vi.mock('@/hooks/useIsPracticeVeteran', () => ({
  useIsPracticeVeteran: () => mockIsVeteran(),
}));

const mockUserStats = vi.fn(() => ({ userStats: { totalGamesPlayed: 5 }, isLoading: false }));
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => mockUserStats(),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: undefined }, canSeeInWorkModes: false }),
}));

vi.mock('@/utils/multiplayerProgressStorage', () => ({
  isNewPlayer: () => false,
  getGamesCompleted: () => 10,
}));

vi.mock('@/utils/featureGates', () => ({ THRESHOLDS: { modeRoster: 3 } }));

const baseProps = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards reordering', () => {
  it('non-veteran: practice cube renders; every mode visible when 5+ games', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('daily-challenge-cube')).toBeInTheDocument();
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="arena"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cube-key="practice"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cube-key="blast"]')).toBeInTheDocument();
    expect(container.querySelector('[data-cube-key="connections"]')).toBeInTheDocument();
  });

  it('renders arena cube (always visible on home)', () => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const arenaLink = container.querySelector('[data-cube-key="arena"]');
    expect(arenaLink).toBeInTheDocument();
    expect(arenaLink?.getAttribute('href')).toBe('/en/multiplayer');
  });

  it('veteran: practice cube entirely absent', () => {
    mockIsVeteran.mockReturnValue(true);
    try {
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-cube-key="practice"]')).toBeNull();
      expect(screen.queryByText('landing.quickPlay')).toBeNull();
    } finally {
      mockIsVeteran.mockReturnValue(false);
    }
  });

  it('renders blast cube when most popular', () => {
    const stats: GameModeStats[] = [
      { mode: 'blast', playCount: 9999 },
      { mode: 'practice', playCount: 10 },
      { mode: 'arena', playCount: 5 },
      { mode: 'daily', playCount: 3 },
      { mode: 'adventure', playCount: 1 },
    ];
    const cardOrder = getCardOrder(stats);
    const { container } = render(<LandingChallengeCards {...baseProps} cardOrder={cardOrder} />);
    expect(container.querySelector('[data-cube-key="blast"]')).toBeInTheDocument();
    // arena stays visible too (always)
    expect(container.querySelector('[data-cube-key="arena"]')).toBeInTheDocument();
  });
});
