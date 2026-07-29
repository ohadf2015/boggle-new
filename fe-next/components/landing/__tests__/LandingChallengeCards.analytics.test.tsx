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
vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: (...args: unknown[]) => trackModeSelected(...args),
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
  return { m: motionObj, AnimatePresence };
});

vi.mock('../ModeCard', () => {
  const ModeCard = ({ title, onClick }: any) => (
    <button type="button" data-testid={`mode-${title}`} onClick={onClick}>
      {title}
    </button>
  );
  ModeCard.displayName = 'ModeCard';
  return { __esModule: true, default: ModeCard };
});
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/utils/multiplayerProgressStorage', () => ({ isNewPlayer: () => false, getGamesCompleted: () => 0 }));
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner" />;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

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
  });

  it.each([
    ['landing.arena', 'arena'],
    ['landing.blastMode', 'blast'],
  ])('clicking %s card fires trackModeSelected(%s, "home")', (title, mode) => {
    render(<LandingChallengeCards {...baseProps} />);
    fireEvent.click(screen.getByTestId(`mode-${title}`));
    expect(trackModeSelected).toHaveBeenCalledWith(mode, 'home');
  });

  it('clicking practice card fires trackModeSelected("practice", "home")', () => {
    mockIsVeteran.mockReturnValue(false); // non-veteran sees practice
    render(<LandingChallengeCards {...baseProps} />);
    fireEvent.click(screen.getByTestId('mode-landing.practice'));
    expect(trackModeSelected).toHaveBeenCalledWith('practice', 'home');
  });
});
