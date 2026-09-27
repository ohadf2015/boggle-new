/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DesktopStatsPanel } from '../DesktopStatsPanel';

// Mock the framer-motion module
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => <div {...props}>{children}</div>,
  },
}));

// Mock CircularTimer component
vi.mock('@/components/CircularTimer', () => ({
  __esModule: true,
  default: ({ remainingTime, totalTime }: { remainingTime: number; totalTime: number }) => (
    <div data-testid="circular-timer" data-remaining={remainingTime} data-total={totalTime}>
      {remainingTime}s
    </div>
  ),
}));

// Mock ComboDisplay component
vi.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: ({ comboLevel }: { comboLevel: number }) => (
    <div data-testid="combo-display" data-level={comboLevel}>
      {comboLevel}x combo
    </div>
  ),
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'common.score': 'Score',
    'singlePlayer.wordsFound': 'Words Found',
  };
  return translations[key] || key;
};

describe('DesktopStatsPanel', () => {
  const defaultProps = {
    score: 150,
    remainingTime: 60,
    totalTime: 120,
    comboLevel: 3,
    maxCombo: 5,
    wordsFound: 10,
    totalBoardWords: null,
    targetHighScore: null,
    isPracticeMode: false,
    comboCoinReward: null,
    onCoinAnimationComplete: vi.fn(),
    t: mockT,
  };

  describe('Timer display', () => {
    it('should render circular timer in timed mode', () => {
      // GIVEN default props (not practice mode)
      // WHEN component is rendered
      render(<DesktopStatsPanel {...defaultProps} />);

      // THEN timer should be visible
      const timer = screen.getByTestId('circular-timer');
      expect(timer).toBeInTheDocument();
      expect(timer).toHaveAttribute('data-remaining', '60');
      expect(timer).toHaveAttribute('data-total', '120');
    });

    it('should NOT render timer in practice mode', () => {
      // GIVEN practice mode is enabled
      const props = { ...defaultProps, isPracticeMode: true };

      // WHEN component is rendered
      render(<DesktopStatsPanel {...props} />);

      // THEN timer should NOT be visible
      expect(screen.queryByTestId('circular-timer')).not.toBeInTheDocument();
    });
  });

  describe('Score display', () => {
    it('should display current score', () => {
      // GIVEN a score of 150
      // WHEN component is rendered
      render(<DesktopStatsPanel {...defaultProps} />);

      // THEN score should be displayed (display multiplier is 1x)
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
    });

    it('should display score with locale formatting for large numbers', () => {
      // GIVEN a large score
      const props = { ...defaultProps, score: 1500 };

      // WHEN component is rendered
      render(<DesktopStatsPanel {...props} />);

      // THEN score should be formatted with display multiplier
      expect(screen.getByText(/1.?500/)).toBeInTheDocument();
    });
  });

  describe('Combo display', () => {
    it('should render combo display with correct level', () => {
      // GIVEN combo level 3
      // WHEN component is rendered
      render(<DesktopStatsPanel {...defaultProps} />);

      // THEN combo display should show level 3
      const comboDisplay = screen.getByTestId('combo-display');
      expect(comboDisplay).toBeInTheDocument();
      expect(comboDisplay).toHaveAttribute('data-level', '3');
    });
  });

  describe('Words found', () => {
    it('should display words found count', () => {
      // GIVEN 10 words found
      // WHEN component is rendered
      render(<DesktopStatsPanel {...defaultProps} />);

      // THEN words found should be displayed
      expect(screen.getByText('Words Found')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show total board words when available', () => {
      // GIVEN total board words
      const props = { ...defaultProps, totalBoardWords: 50 };

      // WHEN component is rendered
      render(<DesktopStatsPanel {...props} />);

      // THEN sub-value should show total
      expect(screen.getByText('/ 50')).toBeInTheDocument();
    });
  });
});
