/**
 * LandingChallengeCards — mode_selected tracking
 *
 * Every clickable mode card (except the DailyChallengeBanner, which owns its
 * own funnel) must fire `trackModeSelected(<mode>, 'home')` so we can see
 * which landing card drives each game start in the funnel.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

const trackModeSelected = vi.fn();
const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: (...args: unknown[]) => trackModeSelected(...args),
  trackLandingCtaClick: (...args: unknown[]) => trackLandingCtaClick(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/landing/home/HomeDailyHero', () => {
  const HomeDailyHero = () => <div data-testid="home-daily-hero" />;
  HomeDailyHero.displayName = 'HomeDailyHero';
  return { __esModule: true, HomeDailyHero };
});

vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/utils/multiplayerProgressStorage', () => ({ isNewPlayer: () => false, getGamesCompleted: () => 0 }));
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner" />;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({ userStats: { totalGamesPlayed: 5 }, isLoading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: undefined }, canSeeInWorkModes: false }),
}));

vi.mock('@/utils/featureGates', () => ({ THRESHOLDS: { modeRoster: 3 } }));

const mockIsVeteran = vi.fn(() => false); // practice shows to all users
vi.mock('@/hooks/useIsPracticeVeteran', () => ({
  useIsPracticeVeteran: () => mockIsVeteran(),
}));

const baseProps = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards — mode_selected tracking', () => {
  beforeEach(() => {
    trackModeSelected.mockClear();
    trackLandingCtaClick.mockClear();
  });

  it.each([
    ['arena', 'arena'],
    ['blast', 'blast'],
  ])('clicking %s cube fires trackModeSelected(%s, "home")', (key, mode) => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const cube = container.querySelector(`[data-cube-key="${key}"]`) as HTMLElement;
    fireEvent.click(cube);
    expect(trackModeSelected).toHaveBeenCalledWith(mode, 'home');
  });

  // Practice is no longer a hub mode for any cohort — half of everyone who
  // entered it never reached a real game — so there is no cube left to click and
  // mode_selected can never carry 'practice' from the hub again.
  it('offers no practice cube to click, for any cohort', () => {
    mockIsVeteran.mockReturnValue(false);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="practice"]')).toBeNull();
    expect(trackModeSelected).not.toHaveBeenCalledWith('practice', 'home');
  });
});
