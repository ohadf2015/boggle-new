import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

// Cubes layout mocks
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/landing/home/HomeDailyHero', () => ({
  __esModule: true,
  HomeDailyHero: () => <div data-testid="home-daily-hero" />,
}));

vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-banner" />,
}));
vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => false }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/hooks/useUserStats', () => ({ useUserStats: () => ({ userStats: { totalGamesPlayed: 5 }, isLoading: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: undefined }, canSeeInWorkModes: false }) }));
vi.mock('@/utils/multiplayerProgressStorage', () => ({ isNewPlayer: () => false, getGamesCompleted: () => 0 }));
vi.mock('@/utils/featureGates', () => ({ THRESHOLDS: { modeRoster: 3 } }));

const trackModeSelected = vi.fn();
const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: (...a: unknown[]) => trackModeSelected(...a),
  trackLandingCtaClick: (...a: unknown[]) => trackLandingCtaClick(...a),
}));

const baseProps = {
  language: 'en',
  activePlayers: 1234,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: { score: 800 }, // veteran-ish: practice hidden, all SP modes shown
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

beforeEach(() => {
  trackModeSelected.mockClear();
  trackLandingCtaClick.mockClear();
});

describe('LandingChallengeCards — cubes layout', () => {
  it('renders the bento cube layout with arena anchor', () => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const anchor = screen.getByTestId('mode-cube-anchor');
    expect(anchor).toBeInTheDocument();
    // arena anchor links to multiplayer + shows the live pill from activePlayers
    expect(anchor).toHaveAttribute('href', '/en/multiplayer');
    expect(screen.getByText(/1,234 landing\.playingNow/)).toBeInTheDocument();
  });

  it('renders daily challenge cube (hero node)', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('home-daily-hero')).toBeInTheDocument();
  });

  it('preserves analytics on cube click (mode_selected + landing_cta_clicked)', () => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const connectionsLink = container.querySelector('[data-cube-key="connections"]') as HTMLElement;
    fireEvent.click(connectionsLink);
    expect(trackModeSelected).toHaveBeenCalledWith('connections', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', { mode: 'connections', variant: 'blue' });
  });

  it('renders multiple cubes in the grid', () => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const cubes = container.querySelectorAll('[data-cube-key]');
    // Arena anchor + other SP modes
    expect(cubes.length).toBeGreaterThan(1);
    expect(container.querySelector('[data-cube-key="blast"]')).toBeInTheDocument();
  });
});
