/**
 * The adventure hub cube must survive the POPULARITY-RANKED order.
 *
 * `baseOrder` is the server's `cardOrder` when it ships one, and that list only
 * carries modes with play stats — adventure is not guaranteed to be in it, and
 * `DEFAULT_ORDER` does not carry it either. So the cube (and with it the
 * "continue your run" state) appeared or vanished depending on what the stats
 * endpoint happened to return: the Class-1 late-source flip in
 * .claude/rules/60-recurring-pitfalls.md. The other non-ranked modes are
 * force-appended for exactly this reason; adventure must be too.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: vi.fn(),
  trackLandingCtaClick: vi.fn(),
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

const mockIsNewPlayer = vi.fn(() => true);
const mockGamesCompleted = vi.fn(() => 0);
vi.mock('@/utils/multiplayerProgressStorage', () => ({
  isNewPlayer: () => mockIsNewPlayer(),
  getGamesCompleted: () => mockGamesCompleted(),
}));

const mockUserStats = vi.fn(() => ({ totalGamesPlayed: 0 }));
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({ userStats: mockUserStats() }),
}));

vi.mock('@/utils/featureGates', () => ({ THRESHOLDS: { modeRoster: 3 } }));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

const mockUserEmail = vi.fn<[], string | undefined>(() => undefined);
// Drives the in-work-mode gate (canSeeInWorkModes = admin OR beta tester). Named
// mockIsAdmin for history; admins are a subset of in-work access, so true/false
// here exercises the same gate beta testers now share.
const mockIsAdmin = vi.fn(() => false);
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: mockUserEmail() }, canSeeInWorkModes: mockIsAdmin() }),
}));

vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => false }));

vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner" />;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

const baseProps = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

/** A popularity-ranked server order, exactly as the endpoint ships it: no adventure. */
const RANKED = ['daily', 'arena', 'blast', 'connections', 'brainGym'] as const;

describe('LandingChallengeCards — adventure survives the ranked order', () => {
  it('Given the server order omits adventure, when an in-work user loads the hub, then the cube is still there', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(
      <LandingChallengeCards {...baseProps} cardOrder={[...RANKED] as never} />,
    );
    expect(container.querySelector('[data-cube-key="adventure"]')).toBeInTheDocument();
  });

  it('Given no server order at all, then the cube is still there', () => {
    mockIsAdmin.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-cube-key="adventure"]')).toBeInTheDocument();
  });

  it('Given a public player, then adventure stays hidden — it is still a beta preview', () => {
    mockIsAdmin.mockReturnValue(false);
    mockGamesCompleted.mockReturnValue(10);
    const { container } = render(
      <LandingChallengeCards {...baseProps} cardOrder={[...RANKED] as never} />,
    );
    expect(container.querySelector('[data-cube-key="adventure"]')).toBeNull();
  });
});
