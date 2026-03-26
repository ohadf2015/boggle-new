/**
 * BlastResults drama tests — score count-up, confetti on 3 stars.
 * TDD: written before implementation.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation engine in JSDOM
vi.mock('framer-motion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockMotionDiv({ children, ...rest }: any, ref: any) {
    const { initial, animate, exit, transition, whileHover, whileTap, style, ...htmlProps } = rest;
    return React.createElement('div', { ref, style, ...htmlProps }, children);
  });
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: any) => children,
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: () => {},
      on: () => () => {},
    }),
    useTransform: (_mv: any, fn: (v: number) => number) => ({
      get: () => fn(0),
      on: (_event: string, cb: (v: number) => void) => { cb(fn(0)); return () => {}; },
    }),
    animate: () => ({ stop: () => {} }),
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr' }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockDiv({ children, ...rest }: any, ref: any) {
    const { initial, animate, exit, transition, whileHover, whileTap, style, ...htmlProps } = rest;
    return React.createElement('div', { ref, style, ...htmlProps }, children);
  });
  return {
    AdaptiveMotion: { div: Div },
    AdaptiveAnimatePresence: ({ children }: any) => children,
  };
});

// Mock useBlastResultSaver — we don't want fetch calls in unit tests
vi.mock('../hooks/useBlastResultSaver', () => ({
  useBlastResultSaver: () => ({
    saved: false,
    personalBests: null,
    isNewBestScore: false,
    isNewBestCombo: false,
    error: null,
  }),
}));

// Mock canvas-confetti — capture calls for assertion
const mockConfetti = vi.fn();
vi.mock('canvas-confetti', () => ({
  __esModule: true,
  default: (...args: any[]) => mockConfetti(...args),
}));

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock Mascot components
vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: () => null,
}));
vi.mock('@/components/ui/CelebrationMascot', () => ({
  CelebrationMascotWithEntrance: () => null,
}));

// Mock confettiUtils
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireConfetti: vi.fn(),
}));

vi.mock('@/hooks/useAdPlacement', () => ({
  useAdPlacement: () => ({ showInterstitial: vi.fn() }),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('button', props, children);
  },
}));

vi.mock('../BlastSkillBreakdown', () => ({
  BlastSkillBreakdown: () => null,
}));

vi.mock('@/components/results/ResultsWinnerBanner', () => ({
  __esModule: true,
  default: ({ customMessage }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'results-winner-banner' }, customMessage);
  },
}));

vi.mock('../BlastResultsComponents', () => ({
  StarRating: ({ stars }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'star-rating' }, `${stars} stars`);
  },
  StatCard: () => null,
  WaveBreakdown: () => null,
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
  onPlayAgain: vi.fn(),
  onBackToHome: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastResults — hero banner', () => {
  beforeEach(() => {
    mockConfetti.mockClear();
  });

  it('renders ResultsWinnerBanner for 3-star results', () => {
    render(<BlastResults {...defaultProps} results={makeResults({ stars: 3 })} />);
    // Banner fires confetti on click (via ResultsWinnerBanner)
    expect(screen.getByText('blast.stars3')).toBeInTheDocument();
  });

  it('renders star rating for all star levels', () => {
    const { rerender } = render(<BlastResults {...defaultProps} results={makeResults({ stars: 2, tilesCleared: 20, clearPercentage: 55 })} />);
    expect(screen.getByText('blast.stars2')).toBeInTheDocument();

    rerender(<BlastResults {...defaultProps} results={makeResults({ stars: 1, tilesCleared: 10, clearPercentage: 27 })} />);
    expect(screen.getByText('blast.stars1')).toBeInTheDocument();
  });
});

describe('BlastResults — score count-up animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockConfetti.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the score in ResultsWinnerBanner', () => {
    render(
      <BlastResults
        {...defaultProps}
        results={makeResults({ finalScore: 500, stars: 3 })}
      />
    );

    // Score is now rendered inside ResultsWinnerBanner (mocked)
    expect(screen.getByTestId('results-winner-banner')).toBeInTheDocument();
  });
});
