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
  return { m: motionObj, AnimatePresence };
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
const mockIsVeteran = vi.fn(() => false);
vi.mock('@/hooks/useIsPracticeVeteran', () => ({
  useIsPracticeVeteran: () => mockIsVeteran(),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
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

describe('LandingChallengeCards reordering (MP/SP split)', () => {
  it('non-veteran: practice in featured row above SP grid; SP grid has every other solo mode', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('daily-banner')).toBeInTheDocument();
    const mpSection = screen.getByTestId('landing-section-mp');
    const spSection = screen.getByTestId('landing-section-sp');
    const featuredRow = screen.getByTestId('landing-section-practice-featured');
    expect(mpSection).toHaveTextContent('landing.arena');
    expect(mpSection).not.toHaveTextContent('landing.practice');
    expect(featuredRow).toHaveTextContent('landing.practice');
    expect(spSection).not.toHaveTextContent('landing.practice');
    expect(spSection).toHaveTextContent('landing.blastMode');
    expect(spSection).toHaveTextContent('landing.wordChainMode');
    expect(spSection).toHaveTextContent('landing.brainTraining');
  });

  it('renders MP section before SP section in DOM (discovery hierarchy)', () => {
    render(<LandingChallengeCards {...baseProps} />);
    const cards = screen.getAllByTestId('mode-card');
    // Arena (MP) comes before any SP card
    expect(cards[0]).toHaveTextContent('landing.arena');
    // Remaining cards still include practice (in featured row) and blast (in SP)
    const otherTexts = cards.slice(1).map((c) => c.textContent);
    expect(otherTexts).toEqual(
      expect.arrayContaining(['landing.practice', 'landing.blastMode'])
    );
  });

  it('veteran: practice present as a normal SP cube but NOT promoted to the featured row', () => {
    // Stable return (not Once): useIsPracticeVeteran returns a consistent value
    // across renders, and the component now re-renders once post-mount (the
    // hydration-safe `mounted` gate) which would exhaust a one-shot mock.
    mockIsVeteran.mockReturnValue(true);
    try {
      render(<LandingChallengeCards {...baseProps} />);
      // No promoted featured row for veterans...
      expect(screen.queryByTestId('landing-section-practice-featured')).toBeNull();
      // ...but practice is still present as a normal mode cube/card.
      expect(screen.getByText('landing.practice')).toBeInTheDocument();
      expect(screen.queryByText('landing.quickPlay')).toBeNull();
    } finally {
      mockIsVeteran.mockReturnValue(false); // restore default for sibling tests
    }
  });

  it('renders blast when most popular (still inside SP section)', () => {
    const stats: GameModeStats[] = [
      { mode: 'blast', playCount: 9999 },
      { mode: 'practice', playCount: 10 },
      { mode: 'arena', playCount: 5 },
      { mode: 'daily', playCount: 3 },
      { mode: 'adventure', playCount: 1 },
    ];
    const cardOrder = getCardOrder(stats);
    render(<LandingChallengeCards {...baseProps} cardOrder={cardOrder} />);
    const spSection = screen.getByTestId('landing-section-sp');
    expect(spSection).toHaveTextContent('landing.blastMode');
    // arena (MP) stays in MP section even though practice/blast/arena stats vary
    const mpSection = screen.getByTestId('landing-section-mp');
    expect(mpSection).toHaveTextContent('landing.arena');
  });
});
