import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';
import { getCardOrder, type GameModeStats } from '@/lib/landing/fetchGameModeStats';

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
  const ModeCard = ({ title }: any) => <div data-testid="mode-card">{title}</div>;
  ModeCard.displayName = 'ModeCard';
  return { __esModule: true, default: ModeCard };
});
vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner">daily</div>;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});
vi.mock('@/hooks/useIsPracticeVeteran', () => ({
  useIsPracticeVeteran: () => false,
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

describe('LandingChallengeCards reordering', () => {
  it('renders daily then arena first by default', () => {
    render(<LandingChallengeCards {...baseProps} />);
    // Daily banner first (pinned), then arena (pinned), then practice, blast, adventure
    expect(screen.getByTestId('daily-banner')).toBeInTheDocument();
    const cards = screen.getAllByTestId('mode-card');
    // Quick Play is injected right after daily, so it leads the ModeCard list.
    expect(cards[0]).toHaveTextContent('landing.quickPlay');
    expect(cards[1]).toHaveTextContent('landing.arena');
    expect(cards[2]).toHaveTextContent('landing.practice');
    expect(cards[3]).toHaveTextContent('landing.blastMode');
    expect(cards[4]).toHaveTextContent('landing.adventureMode');
  });

  it('pins daily+arena first, reorders rest by popularity', () => {
    const stats: GameModeStats[] = [
      { mode: 'adventure', playCount: 500 },
      { mode: 'daily', playCount: 300 },
      { mode: 'practice', playCount: 200 },
      { mode: 'arena', playCount: 100 },
      { mode: 'blast', playCount: 50 },
    ];
    // Pre-compute order server-side (like production does)
    const cardOrder = getCardOrder(stats);
    render(<LandingChallengeCards {...baseProps} cardOrder={cardOrder} />);
    const cards = screen.getAllByTestId('mode-card');
    // Daily (banner) + injected quickPlay lead, then arena pinned, then adventure > practice > blast.
    expect(cards[0]).toHaveTextContent('landing.quickPlay');
    expect(cards[1]).toHaveTextContent('landing.arena');
    expect(cards[2]).toHaveTextContent('landing.adventureMode');
    expect(cards[3]).toHaveTextContent('landing.practice');
    expect(cards[4]).toHaveTextContent('landing.blastMode');
  });

  it('shows blast in regular order when most popular', () => {
    const stats: GameModeStats[] = [
      { mode: 'blast', playCount: 9999 },
      { mode: 'practice', playCount: 10 },
      { mode: 'arena', playCount: 5 },
      { mode: 'daily', playCount: 3 },
      { mode: 'adventure', playCount: 1 },
    ];
    const cardOrder = getCardOrder(stats);
    render(<LandingChallengeCards {...baseProps} cardOrder={cardOrder} />);
    const cards = screen.getAllByTestId('mode-card');
    // Blast is most popular, so after pinned daily+arena it comes first
    expect(cards[0]).toHaveTextContent('landing.quickPlay');
    expect(cards[1]).toHaveTextContent('landing.arena');
    expect(cards[2]).toHaveTextContent('landing.blastMode');
  });
});
