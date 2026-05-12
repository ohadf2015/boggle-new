/**
 * LandingChallengeCards — visibility gates
 *
 * 1. Word Craft is closed-beta. Non-allowlisted players must NOT see the card
 *    at all (not even a locked one).
 * 2. After a player has finished even one multiplayer round, the "More Game
 *    Modes" expander must not collapse extras — surface every mode directly.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: vi.fn(),
  trackLandingCtaClick: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: () => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  AnimatePresence.displayName = 'AnimatePresence';
  return { motion: motionObj, AnimatePresence };
});

vi.mock('../ModeCard', () => {
  const ModeCard = ({ title }: any) => (
    <div data-testid={`mode-${title}`}>{title}</div>
  );
  ModeCard.displayName = 'ModeCard';
  return { __esModule: true, default: ModeCard };
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
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: mockUserEmail() } }),
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

describe('LandingChallengeCards — Word Craft beta gate', () => {
  it('does NOT render the wordCraft card for a non-beta user', () => {
    mockUserEmail.mockReturnValue('random@example.com');
    mockGamesCompleted.mockReturnValue(10); // veteran path so no collapse
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordcraft.modeTitle')).toBeNull();
  });

  it('renders the wordCraft card for an allowlisted beta email', () => {
    mockUserEmail.mockReturnValue('ohadf2015@gmail.com');
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('mode-wordcraft.modeTitle')).toBeInTheDocument();
  });

  it('does NOT render the wordCraft card when user is signed-out (no email)', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-wordcraft.modeTitle')).toBeNull();
  });
});

describe('LandingChallengeCards — collapse-after-MP gate', () => {
  it('renders the "More Game Modes" expander for a brand-new player (zero MP games)', () => {
    mockIsNewPlayer.mockReturnValue(true);
    mockGamesCompleted.mockReturnValue(0);
    mockUserStats.mockReturnValue({ totalGamesPlayed: 0 });
    mockUserEmail.mockReturnValue(undefined);
    render(<LandingChallengeCards {...baseProps} />);
    // Non-essential modes are tucked behind the <details> expander.
    expect(screen.getByTestId('landing-section-more')).toBeInTheDocument();
  });

  it('omits the expander once the player has completed any MP game', () => {
    mockIsNewPlayer.mockReturnValue(true); // would normally collapse
    mockGamesCompleted.mockReturnValue(1); // overrides — MP played at least once
    mockUserStats.mockReturnValue({ totalGamesPlayed: 1 });
    mockUserEmail.mockReturnValue(undefined);
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('landing-section-more')).toBeNull();
    // And every non-essential mode lives directly in the SP section.
    const spSection = screen.getByTestId('landing-section-sp');
    expect(spSection).toContainElement(screen.getByTestId('mode-landing.blastMode'));
    expect(spSection).toContainElement(screen.getByTestId('mode-landing.wordChainMode'));
  });
});

describe('LandingChallengeCards — Japanese locale gates', () => {
  it('hides connections card for Japanese locale', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(screen.queryByTestId('mode-landing.wordChainMode')).toBeNull();
  });

  it('shows connections card for English locale', () => {
    mockUserEmail.mockReturnValue(undefined);
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="en" />);
    expect(screen.getByTestId('mode-landing.wordChainMode')).toBeInTheDocument();
  });

  it('hides wordCraft card for Japanese locale even for beta users', () => {
    mockUserEmail.mockReturnValue('ohadf2015@gmail.com');
    mockGamesCompleted.mockReturnValue(10);
    render(<LandingChallengeCards {...baseProps} language="ja" />);
    expect(screen.queryByTestId('mode-wordcraft.modeTitle')).toBeNull();
  });
});
