/**
 * BlastPhaseScreens — Render tests for the 3 phase screen components.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastReadyScreen, BlastWaveTransitionScreen, BlastResultsScreen } from '../BlastPhaseScreens';

// Mock framer-motion to render children directly
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
}));

const mockT = (key: string, fallback?: string | Record<string, string | number>) => {
  if (typeof fallback === 'string') return fallback;
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
    expect(screen.getByText('blast.waveComplete')).toBeInTheDocument();
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
    fireEvent.click(screen.getByText('blast.nextWave'));
    expect(onNextWave).toHaveBeenCalledTimes(1);
  });
});

// ─── BlastResultsScreen ─────────────────────────────────────────────

describe('BlastResultsScreen', () => {
  const defaultProps = {
    results: {
      finalScore: 5000,
      wavesCompleted: 4,
      wordsFound: ['GAME', 'STAR', 'WORD', 'FIRE'],
      totalTilesCleared: 80,
      totalMoves: 20,
    },
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
    // Both wavesCompleted (4) and wordsFound.length (4) render as "4"
    const fours = screen.getAllByText('4');
    expect(fours).toHaveLength(2);
  });

  it('should display game over text', () => {
    render(<BlastResultsScreen {...defaultProps} />);
    expect(screen.getByText('blast.gameOver')).toBeInTheDocument();
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
    // finalScore (0), wavesCompleted (0), wordsFound.length (0)
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });
});
