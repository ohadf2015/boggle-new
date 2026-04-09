/**
 * BlastPhaseScreens — Render tests for the 3 phase screen components.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastReadyScreen, BlastWaveTransitionScreen, BlastResultsScreen } from '../BlastPhaseScreens';
import type { BlastResultsData } from '@/components/blast/types';

// Mock framer-motion to render children directly
jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
        <div {...props}>{children}</div>
      ),
    },
  ),
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// Mock @number-flow/react — renders via a custom element that RTL can't match by text.
// Use vi.mock directly: vitest's jest-compat shim doesn't hoist jest.mock for this module.
vi.mock('@number-flow/react', () => ({
  __esModule: true,
  default: ({ value }: { value: number }) => <span>{value}</span>,
}));

// Mock react-rewards — side-effect only, stub to a no-op.
jest.mock('react-rewards', () => ({
  useReward: () => ({ reward: () => {}, isAnimating: false }),
}));

const mockT = (
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsWhenFallback?: Record<string, string | number>,
) => {
  // If second arg is a string, it's a fallback
  if (typeof fallbackOrParams === 'string') {
    const params = paramsWhenFallback;
    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        fallbackOrParams,
      );
    }
    return fallbackOrParams;
  }
  // Otherwise second arg may be params — append param values to key so tests can assert
  // against either the key OR the interpolated value.
  if (fallbackOrParams && typeof fallbackOrParams === 'object') {
    const values = Object.values(fallbackOrParams).map(String).join(' ');
    return `${key} ${values}`;
  }
  return key;
};

// ─── BlastReadyScreen ────────────────────────────────────────────────

describe('BlastReadyScreen', () => {
  it('should render the title', () => {
    render(<BlastReadyScreen onStart={jest.fn()} onBack={jest.fn()} t={mockT} />);
    expect(screen.getByText('blast.ready.title')).toBeInTheDocument();
  });

  it('should call onStart when play button is clicked', () => {
    const onStart = jest.fn();
    render(<BlastReadyScreen onStart={onStart} onBack={jest.fn()} t={mockT} />);
    fireEvent.click(screen.getByText('blast.ready.play'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = jest.fn();
    render(<BlastReadyScreen onStart={jest.fn()} onBack={onBack} t={mockT} />);
    fireEvent.click(screen.getByText('common.back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should display game rules', () => {
    render(<BlastReadyScreen onStart={jest.fn()} onBack={jest.fn()} t={mockT} />);
    expect(screen.getByText('blast.help')).toBeInTheDocument();
  });
});

// ─── BlastWaveTransitionScreen ───────────────────────────────────────

describe('BlastWaveTransitionScreen', () => {
  const defaultProps = {
    currentWave: 3,
    lastWaveStats: { score: 1500, words: 8, clearPct: 72 },
    stars: 2,
    onNextWave: jest.fn(),
    t: mockT,
  };

  it('should display wave number', () => {
    render(<BlastWaveTransitionScreen {...defaultProps} />);
    expect(screen.getByText(/blast\.waveComplete/)).toBeInTheDocument();
  });

  it('should display score, words, and clear percentage', () => {
    render(<BlastWaveTransitionScreen {...defaultProps} />);
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('should render the correct number of filled stars', () => {
    const { container } = render(<BlastWaveTransitionScreen {...defaultProps} />);
    const filledStars = container.querySelectorAll('.fill-amber-400');
    expect(filledStars).toHaveLength(2);
  });

  it('should call onNextWave when next button is clicked', () => {
    const onNextWave = jest.fn();
    render(<BlastWaveTransitionScreen {...defaultProps} onNextWave={onNextWave} />);
    fireEvent.click(screen.getByText(/blast\.nextWave/));
    expect(onNextWave).toHaveBeenCalledTimes(1);
  });
});

// ─── BlastResultsScreen ─────────────────────────────────────────────

const baseResults: BlastResultsData = {
  finalScore: 5000,
  tilesCleared: 80,
  totalTiles: 100,
  clearPercentage: 80,
  wordsFound: ['GAME', 'STARS', 'WORD', 'FIRE'],
  bestWord: 'STARS',
  maxCombo: 7,
  stars: 3,
  wavesCompleted: 4,
  waveResults: [
    { waveNumber: 1, score: 800, wordsFound: 3, clearPercentage: 70 },
    { waveNumber: 2, score: 1200, wordsFound: 5, clearPercentage: 80 },
    { waveNumber: 3, score: 1800, wordsFound: 6, clearPercentage: 90 },
    { waveNumber: 4, score: 1200, wordsFound: 4, clearPercentage: 60 },
  ],
};

describe('BlastResultsScreen', () => {
  const defaultProps = {
    results: baseResults,
    onPlayAgain: jest.fn(),
    onBack: jest.fn(),
    t: mockT,
  };

  it('should display the final score', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    expect(screen.getByText('5000')).toBeInTheDocument();
  });

  it('should display waves completed and word count', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    const fours = screen.getAllByText('4');
    expect(fours.length).toBeGreaterThanOrEqual(2);
  });

  it('should display game over text when no new record', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    expect(screen.getByText('blast.gameOver')).toBeInTheDocument();
  });

  it('should display newRecord heading when finalScore beats previousBest', () => {
    render(
      <BlastResultsScreen
        {...defaultProps}
        results={{ ...baseResults, previousBest: 4000 }}
      />,
    );
    expect(screen.getByText('blast.results.newRecord')).toBeInTheDocument();
    expect(screen.queryByText('blast.gameOver')).not.toBeInTheDocument();
  });

  it('should display PB delta when previousBest is present and score is higher', () => {
    render(
      <BlastResultsScreen
        {...defaultProps}
        results={{ ...baseResults, previousBest: 4200 }}
      />,
    );
    // mockT interpolates {delta} → 800
    expect(screen.getByText(/800/)).toBeInTheDocument();
  });

  it('should display rank percentile when provided', () => {
    render(
      <BlastResultsScreen
        {...defaultProps}
        results={{ ...baseResults, percentile: 92 }}
      />,
    );
    // blast.results.topPercent with {pct: 8} (top 8% since percentile is 92)
    expect(screen.getByText(/blast\.results\.topPercent/)).toBeInTheDocument();
  });

  it('should not render rank card when percentile is missing', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    expect(screen.queryByText(/blast\.results\.yourRank/)).not.toBeInTheDocument();
  });

  it('should display the best word', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    expect(screen.getByText('STARS')).toBeInTheDocument();
  });

  it('should display max combo', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should render badges when provided', () => {
    render(
      <BlastResultsScreen
        {...defaultProps}
        results={{
          ...baseResults,
          badges: [
            { id: 'combo-master', icon: 'zap', label: 'Combo Master', isNew: true },
            { id: 'wordsmith', icon: 'book', label: 'Wordsmith' },
          ],
        }}
      />,
    );
    expect(screen.getByText('Combo Master')).toBeInTheDocument();
    expect(screen.getByText('Wordsmith')).toBeInTheDocument();
  });

  it('should call onPlayAgain when play again button is clicked', () => {
    const onPlayAgain = jest.fn();
    render(<BlastResultsScreen {...defaultProps} onPlayAgain={onPlayAgain} />);
    fireEvent.click(screen.getByText('blast.playAgain'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('should call onBack when back button is clicked', () => {
    const onBack = jest.fn();
    render(<BlastResultsScreen {...defaultProps} onBack={onBack} />);
    fireEvent.click(screen.getByText('common.back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should handle null results gracefully', () => {
    render(<BlastResultsScreen {...defaultProps} results={null} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
