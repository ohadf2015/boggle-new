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

import { BlastWaveIntro } from '../BlastWaveIntro';
import type { BlastObjective } from '../types';

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'blast.waveIntro.title': 'Wave {wave}',
    'blast.waveIntro.objectives': 'Objectives',
    'blast.waveIntro.go': 'GO!',
    'blast.waveIntro.moves': '{moves} Moves',
    'blast.objective.scoreTarget': 'Score {target} points',
    'blast.objective.collectType': 'Collect {target} {tileType} tiles',
    'blast.objective.clearAllType': 'Clear all {tileType} tiles',
    'blast.objective.wordLength': 'Find {target} words with {minWordLength}+ letters',
  };
  return map[key] || key;
};

const defaultProps = {
  waveNumber: 2,
  objectives: [
    { type: 'collect_type' as const, tileType: 'gem' as const, target: 3 },
  ] as BlastObjective[],
  movesAllowed: 18,
  onReady: jest.fn(),
  t: mockT,
};

describe('BlastWaveIntro', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    defaultProps.onReady = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders wave number', () => {
    render(<BlastWaveIntro {...defaultProps} />);
    expect(screen.getByText(/Wave 2/)).toBeInTheDocument();
  });

  it('renders objective labels', () => {
    render(<BlastWaveIntro {...defaultProps} />);
    expect(screen.getByText('Collect 3 gem tiles')).toBeInTheDocument();
  });

  it('renders move count', () => {
    render(<BlastWaveIntro {...defaultProps} movesAllowed={18} />);
    expect(screen.getByText('18 Moves')).toBeInTheDocument();
  });

  it('renders GO button', () => {
    render(<BlastWaveIntro {...defaultProps} />);
    expect(screen.getByTestId('wave-intro-go-btn')).toBeInTheDocument();
  });

  it('calls onReady when GO button is clicked', () => {
    const onReady = jest.fn();
    render(<BlastWaveIntro {...defaultProps} onReady={onReady} />);
    screen.getByTestId('wave-intro-go-btn').click();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('auto-advances after 4000ms', () => {
    const onReady = jest.fn();
    render(<BlastWaveIntro {...defaultProps} onReady={onReady} />);
    expect(onReady).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(4000); });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire onReady on click then auto-advance', () => {
    const onReady = jest.fn();
    render(<BlastWaveIntro {...defaultProps} onReady={onReady} />);
    screen.getByTestId('wave-intro-go-btn').click();
    act(() => { jest.advanceTimersByTime(4000); });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('renders multiple objectives', () => {
    const objectives: BlastObjective[] = [
      { type: 'clear_all_type', tileType: 'ice', target: 0 },
      { type: 'score_target', target: 40 },
    ];
    render(<BlastWaveIntro {...defaultProps} objectives={objectives} />);
    expect(screen.getByText('Clear all ice tiles')).toBeInTheDocument();
    expect(screen.getByText('Score 40 points')).toBeInTheDocument();
  });

  it('renders overlay with test id', () => {
    render(<BlastWaveIntro {...defaultProps} />);
    expect(screen.getByTestId('wave-intro-overlay')).toBeInTheDocument();
  });
});
