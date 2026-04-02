import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: (_, tag) => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  AnimatePresence.displayName = 'AnimatePresence';
  return { motion: motionObj, AnimatePresence };
});

vi.mock('../ModeCard', () => {
  const ModeCard = ({ title, badge }: any) => <div data-testid="mode-card">{title}{badge && <span data-testid="badge">{badge}</span>}</div>;
  ModeCard.displayName = 'ModeCard';
  return { __esModule: true, default: ModeCard };
});
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
}));
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner" />;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

const baseProps = {
  language: 'en',
  isAdmin: false,
  hasBlastAccess: false,
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards', () => {
  it('renders arena and practice cards', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByText('landing.arena')).toBeInTheDocument();
    expect(screen.getByText('landing.practice')).toBeInTheDocument();
  });

  it('renders adventure mode card', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByText('landing.adventureMode')).toBeInTheDocument();
  });

  it('shows blast mode only when isAdmin', () => {
    const { rerender } = render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByText('landing.blastMode')).not.toBeInTheDocument();

    rerender(<LandingChallengeCards {...baseProps} isAdmin={true} />);
    expect(screen.getByText('landing.blastMode')).toBeInTheDocument();
  });

  it('shows blast mode when hasBlastAccess', () => {
    render(<LandingChallengeCards {...baseProps} hasBlastAccess={true} />);
    expect(screen.getByText('landing.blastMode')).toBeInTheDocument();
  });

  it('renders daily challenge banner', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('daily-banner')).toBeInTheDocument();
  });

});
