/**
 * BlastLevelClearOverlay — React overlay shown during level-clear celebration.
 *
 * Displays:
 * - "LEVEL COMPLETE!" banner
 * - Star rating (1-3 stars) with staggered bounce animation
 * - Score counting up display
 * - Move bonus display (when applicable)
 * - "Next Wave" button after sequence completes
 *
 * RED phase: tests written before implementation.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('framer-motion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockMotionDiv({ children, ...rest }: any, ref: any) {
    return React.createElement('div', { ref, ...rest }, children);
  });
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: any) => children,
  };
});

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockAdaptiveDiv({ children, ...rest }: any, ref: any) {
    const { initial, animate, exit, transition, whileHover, whileTap, whileFocus, whileDrag, whileInView, layout, layoutId, skipAnimation, ...htmlProps } = rest;
    return React.createElement('div', { ref, ...htmlProps }, children);
  });
  return {
    AdaptiveMotion: { div: Div },
    AdaptiveAnimatePresence: ({ children }: any) => children,
  };
});

import { BlastLevelClearOverlay } from '../BlastLevelClearOverlay';

const defaultProps = {
  totalScore: 1250,
  moveBonus: 150,
  movesRemaining: 3,
  totalMoves: 20,
  stars: 2 as 1 | 2 | 3,
  onContinue: jest.fn(),
  isSequenceComplete: true,
};

describe('BlastLevelClearOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    defaultProps.onContinue = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the overlay container', () => {
    render(<BlastLevelClearOverlay {...defaultProps} />);
    expect(screen.getByTestId('level-clear-overlay')).toBeInTheDocument();
  });

  it('shows "LEVEL COMPLETE!" text', () => {
    render(<BlastLevelClearOverlay {...defaultProps} />);
    expect(screen.getByText('blast.levelComplete')).toBeInTheDocument();
  });

  it('renders the correct number of filled stars for 3 stars', () => {
    render(<BlastLevelClearOverlay {...defaultProps} stars={3} />);
    const starContainer = screen.getByLabelText('3 stars');
    expect(starContainer).toBeInTheDocument();
  });

  it('renders the correct number of filled stars for 1 star', () => {
    render(<BlastLevelClearOverlay {...defaultProps} stars={1} />);
    const starContainer = screen.getByLabelText('1 stars');
    expect(starContainer).toBeInTheDocument();
  });

  it('shows total score', () => {
    render(<BlastLevelClearOverlay {...defaultProps} totalScore={1250} />);
    expect(screen.getByText(/1250/)).toBeInTheDocument();
  });

  it('shows move bonus when movesRemaining > 0', () => {
    render(<BlastLevelClearOverlay {...defaultProps} moveBonus={150} movesRemaining={3} />);
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('does NOT show move bonus when movesRemaining is 0', () => {
    render(<BlastLevelClearOverlay {...defaultProps} moveBonus={0} movesRemaining={0} />);
    const bonusText = screen.queryByTestId('level-clear-bonus');
    expect(bonusText).not.toBeInTheDocument();
  });

  it('shows "Next Wave" button when sequence is complete', () => {
    render(<BlastLevelClearOverlay {...defaultProps} isSequenceComplete={true} />);
    expect(screen.getByTestId('level-clear-continue-btn')).toBeInTheDocument();
  });

  it('does NOT show "Next Wave" button when sequence is not complete', () => {
    render(<BlastLevelClearOverlay {...defaultProps} isSequenceComplete={false} />);
    expect(screen.queryByTestId('level-clear-continue-btn')).not.toBeInTheDocument();
  });

  it('calls onContinue when continue button is clicked', () => {
    const onContinue = jest.fn();
    render(<BlastLevelClearOverlay {...defaultProps} onContinue={onContinue} isSequenceComplete={true} />);

    const btn = screen.getByTestId('level-clear-continue-btn');
    btn.click();

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onContinue when overlay is clicked', () => {
    const onContinue = jest.fn();
    render(<BlastLevelClearOverlay {...defaultProps} onContinue={onContinue} isSequenceComplete={true} />);

    const overlay = screen.getByTestId('level-clear-overlay');
    overlay.click();

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onContinue when overlay is clicked before sequence completes', () => {
    const onContinue = jest.fn();
    render(<BlastLevelClearOverlay {...defaultProps} onContinue={onContinue} isSequenceComplete={false} />);

    const overlay = screen.getByTestId('level-clear-overlay');
    overlay.click();

    expect(onContinue).not.toHaveBeenCalled();
  });

  it('auto-advances after 5000ms when sequence is complete', () => {
    const onContinue = jest.fn();
    render(<BlastLevelClearOverlay {...defaultProps} onContinue={onContinue} isSequenceComplete={true} />);

    expect(onContinue).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does not auto-advance before sequence is complete', () => {
    const onContinue = jest.fn();
    render(<BlastLevelClearOverlay {...defaultProps} onContinue={onContinue} isSequenceComplete={false} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onContinue).not.toHaveBeenCalled();
  });

  it('shows 2 stars for 2-star rating', () => {
    render(<BlastLevelClearOverlay {...defaultProps} stars={2} />);
    const starContainer = screen.getByLabelText('2 stars');
    expect(starContainer).toBeInTheDocument();
  });
});
