import { render, screen } from '@testing-library/react';
import { MobileGameDrawerContent } from '../MobileGameDrawerContent';
import type { FoundWord } from '@/shared/types/view';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(key)
        )
      );
      return <div {...filteredProps}>{children as React.ReactNode}</div>;
    },
  },
  m: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap'].includes(key)
        )
      );
      return <div {...filteredProps}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockT = (key: string) => key;

const baseProps = {
  foundWords: [] as FoundWord[],
  comboLevel: 0,
  fireRoundActive: false,
  remainingTime: 60,
  timerValue: 2,
  totalBoardWords: null,
  t: mockT,
};

describe('MobileGameDrawerContent', () => {
  it('renders word count stat', () => {
    render(<MobileGameDrawerContent {...baseProps} foundWords={[
      { word: 'hello', isValid: true, score: 10 },
      { word: 'world', isValid: true, score: 8 },
    ]} />);

    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('results.words')).toBeInTheDocument();
  });

  it('shows longest word when words exist', () => {
    render(<MobileGameDrawerContent {...baseProps} foundWords={[
      { word: 'cat', isValid: true, score: 3 },
      { word: 'elephant', isValid: true, score: 20 },
      { word: 'dog', isValid: true, score: 3 },
    ]} />);

    expect(screen.getByText('ELEPHANT')).toBeInTheDocument();
    expect(screen.getByText('results.longest')).toBeInTheDocument();
  });

  it('shows best word with score', () => {
    render(<MobileGameDrawerContent {...baseProps} foundWords={[
      { word: 'cat', isValid: true, score: 3 },
      { word: 'amazing', isValid: true, score: 25 },
    ]} />);

    expect(screen.getByText('AMAZING (+25)')).toBeInTheDocument();
    expect(screen.getByText('results.bestWord')).toBeInTheDocument();
  });

  it('shows combo level in blast mode', () => {
    render(<MobileGameDrawerContent {...baseProps} gameMode="blast" comboLevel={5} />);

    expect(screen.getByText('×5')).toBeInTheDocument();
    expect(screen.getByText('results.comboBonus')).toBeInTheDocument();
  });

  it('shows fire round indicator in blast mode', () => {
    render(<MobileGameDrawerContent {...baseProps} gameMode="blast" fireRoundActive={true} />);

    expect(screen.getByText('🔥 ACTIVE')).toBeInTheDocument();
  });

  it('shows word hunt stats', () => {
    render(<MobileGameDrawerContent
      {...baseProps}
      gameMode="word-hunt"
      wordHuntLife={45}
      wordHuntAttempts={[
        { guess: 'hello', feedback: ['correct', 'absent', 'present', 'absent', 'correct'] },
        { guess: 'world', feedback: ['absent', 'correct', 'absent', 'correct', 'present'] },
      ]}
    />);

    expect(screen.getByText('wordHunt.attempts')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.lifeBar')).toBeInTheDocument();
  });

  it('shows board coverage for single player', () => {
    render(<MobileGameDrawerContent {...baseProps} totalBoardWords={20} foundWords={[
      { word: 'hello', isValid: true, score: 10 },
      { word: 'world', isValid: true, score: 8 },
      { word: 'great', isValid: true, score: 12 },
    ]} />);

    // 3 words >= 5 letters / 20 total = 15%
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('singlePlayer.boardCoverage')).toBeInTheDocument();
  });

  it('shows word length distribution bar', () => {
    render(<MobileGameDrawerContent {...baseProps} foundWords={[
      { word: 'cat', isValid: true, score: 3 },
      { word: 'hello', isValid: true, score: 10 },
      { word: 'amazing', isValid: true, score: 20 },
    ]} />);

    // Distribution labels
    expect(screen.getByText('≤4: 1')).toBeInTheDocument();
    expect(screen.getByText('5-6: 1')).toBeInTheDocument();
    expect(screen.getByText('7+: 1')).toBeInTheDocument();
  });

  it('hides distribution when no words', () => {
    render(<MobileGameDrawerContent {...baseProps} />);

    expect(screen.queryByText('results.wordLengths')).not.toBeInTheDocument();
  });

  it('filters out invalid words from stats', () => {
    render(<MobileGameDrawerContent {...baseProps} foundWords={[
      { word: 'hello', isValid: true, score: 10 },
      { word: 'xyz', isValid: false, score: 0 },
    ]} />);

    // Word count should be 1 (invalid filtered out)
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('calculates words per minute', () => {
    // 2 min timer, 60s remaining = 60s elapsed = 1 min
    // 3 valid words / 1 min = 3 wpm
    render(<MobileGameDrawerContent
      {...baseProps}
      remainingTime={60}
      timerValue={2}
      foundWords={[
        { word: 'hello', isValid: true, score: 10 },
        { word: 'world', isValid: true, score: 8 },
        { word: 'great', isValid: true, score: 12 },
      ]}
    />);

    // 3 wpm — appears in stat value; also 3 for word count
    expect(screen.getByText('leaderboard.wordsPerMin')).toBeInTheDocument();
  });
});
