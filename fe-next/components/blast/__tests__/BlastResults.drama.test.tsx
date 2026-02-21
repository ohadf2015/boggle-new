/**
 * BlastResults drama tests — score count-up, confetti on 3 stars, retrigger button.
 * TDD: written before implementation.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation engine in JSDOM
jest.mock('framer-motion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockMotionDiv({ children, ...rest }: any, ref: any) {
    const { initial, animate, exit, transition, whileHover, whileTap, style, ...htmlProps } = rest;
    return React.createElement('div', { ref, style, ...htmlProps }, children);
  });
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: any) => children,
  };
});

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

// Mock useBlastResultSaver — we don't want fetch calls in unit tests
jest.mock('../hooks/useBlastResultSaver', () => ({
  useBlastResultSaver: () => ({
    saved: false,
    personalBests: null,
    isNewBestScore: false,
    isNewBestCombo: false,
    error: null,
  }),
}));

// Mock canvas-confetti — capture calls for assertion
const mockConfetti = jest.fn();
jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: (...args: any[]) => mockConfetti(...args),
}));

import { BlastResults } from '../BlastResults';
import type { BlastResultsData } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResults(overrides: Partial<BlastResultsData> = {}): BlastResultsData {
  return {
    finalScore: 500,
    tilesCleared: 30,
    totalTiles: 36,
    clearPercentage: 83,
    wordsFound: ['cat', 'dog', 'bat'],
    bestWord: 'bat',
    maxCombo: 3,
    stars: 3,
    wavesCompleted: 1,
    waveResults: [],
    ...overrides,
  };
}

const defaultProps = {
  results: makeResults(),
  difficulty: 'medium' as const,
  language: 'en',
  onPlayAgain: jest.fn(),
  onBackToHome: jest.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastResults — confetti retrigger button', () => {
  beforeEach(() => {
    mockConfetti.mockClear();
  });

  it('shows confetti retrigger button when stars === 3', () => {
    render(<BlastResults {...defaultProps} results={makeResults({ stars: 3 })} />);
    expect(screen.getByTestId('confetti-retrigger')).toBeInTheDocument();
  });

  it('hides confetti retrigger button when stars === 2', () => {
    render(<BlastResults {...defaultProps} results={makeResults({ stars: 2, tilesCleared: 20, clearPercentage: 55 })} />);
    expect(screen.queryByTestId('confetti-retrigger')).not.toBeInTheDocument();
  });

  it('hides confetti retrigger button when stars === 1', () => {
    render(<BlastResults {...defaultProps} results={makeResults({ stars: 1, tilesCleared: 10, clearPercentage: 27 })} />);
    expect(screen.queryByTestId('confetti-retrigger')).not.toBeInTheDocument();
  });

  it('confetti retrigger button has aria-label for accessibility', () => {
    render(<BlastResults {...defaultProps} results={makeResults({ stars: 3 })} />);
    const btn = screen.getByTestId('confetti-retrigger');
    expect(btn).toHaveAttribute('aria-label');
    expect(btn.getAttribute('aria-label')).not.toBe('');
  });
});

describe('BlastResults — score count-up animation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConfetti.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('score starts at 0 on initial render (before animation completes)', () => {
    // Mock requestAnimationFrame to not fire automatically
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = jest.fn(); // no-op: never fires tick

    render(
      <BlastResults
        {...defaultProps}
        results={makeResults({ finalScore: 500, stars: 3 })}
      />
    );

    // The main score display should start at 0 (animation hasn't ticked yet)
    expect(screen.getByTestId('blast-score-display')).toHaveTextContent('0');

    global.requestAnimationFrame = originalRAF;
  });
});
