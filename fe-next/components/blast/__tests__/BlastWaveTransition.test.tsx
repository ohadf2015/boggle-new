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

// Mock AdaptiveMotion to render plain divs (avoids AccessibilityContext + grid perf deps)
jest.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockAdaptiveDiv({ children, ...rest }: any, ref: any) {
    // Strip motion-only props that aren't valid HTML attributes
    const { initial, animate, exit, transition, whileHover, whileTap, whileFocus, whileDrag, whileInView, layout, layoutId, skipAnimation, ...htmlProps } = rest;
    return React.createElement('div', { ref, ...htmlProps }, children);
  });
  return {
    AdaptiveMotion: { div: Div },
    AdaptiveAnimatePresence: ({ children }: any) => children,
  };
});

import { BlastWaveTransition } from '../BlastWaveTransition';

const defaultProps = {
  waveNumber: 3,
  previousWaveScore: 45,
  previousWaveWords: 8,
  previousClearPercentage: 67,
  onAdvance: jest.fn(),
};

describe('BlastWaveTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    defaultProps.onAdvance = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the next wave number', () => {
    render(<BlastWaveTransition {...defaultProps} waveNumber={3} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('shows score stat', () => {
    render(<BlastWaveTransition {...defaultProps} previousWaveScore={45} />);
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows words found stat', () => {
    render(<BlastWaveTransition {...defaultProps} previousWaveWords={8} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows tiles cleared percentage', () => {
    render(<BlastWaveTransition {...defaultProps} previousClearPercentage={50} />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('auto-advances after 3000ms', () => {
    const onAdvance = jest.fn();
    render(<BlastWaveTransition {...defaultProps} onAdvance={onAdvance} />);

    expect(onAdvance).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('does not advance twice if auto-advance fires after click', () => {
    const onAdvance = jest.fn();
    render(<BlastWaveTransition {...defaultProps} onAdvance={onAdvance} />);

    const overlay = screen.getByTestId('wave-transition-overlay');
    overlay.click();
    expect(onAdvance).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('calls onAdvance when overlay is clicked', () => {
    const onAdvance = jest.fn();
    render(<BlastWaveTransition {...defaultProps} onAdvance={onAdvance} />);

    const overlay = screen.getByTestId('wave-transition-overlay');
    overlay.click();

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('shows wave clear text', () => {
    render(<BlastWaveTransition {...defaultProps} />);
    expect(screen.getByText('blast.waveClear')).toBeInTheDocument();
  });

  it('shows tap to continue text', () => {
    render(<BlastWaveTransition {...defaultProps} />);
    expect(screen.getByText('blast.tapToContinue')).toBeInTheDocument();
  });

  it('calls onAdvance when continue button is clicked', () => {
    const onAdvance = jest.fn();
    render(<BlastWaveTransition {...defaultProps} onAdvance={onAdvance} />);

    const continueBtn = screen.getByTestId('wave-continue-btn');
    continueBtn.click();

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
