import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'layoutId', 'variants'].includes(k)))}>{children}</div>
  ));
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    motion: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock child components
jest.mock('../SurvivalLiveRanks', () => ({
  SurvivalLiveRanks: () => <div data-testid="live-ranks">Live Ranks</div>,
}));

jest.mock('../SurvivalLootPanel', () => ({
  SurvivalLootPanel: () => <div data-testid="loot-panel">Loot Panel</div>,
}));

jest.mock('../SurvivalHeader', () => ({
  SurvivalHeader: () => <div data-testid="survival-header">Header</div>,
}));

jest.mock('../SurvivalClueBoxes', () => {
  const MockClueBoxes = React.forwardRef((_: unknown, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} data-testid="clue-boxes">Clue Boxes</div>
  ));
  MockClueBoxes.displayName = 'MockSurvivalClueBoxes';
  return { SurvivalClueBoxes: MockClueBoxes };
});

jest.mock('../SurvivalLifeBar', () => ({
  SurvivalLifeBar: () => <div data-testid="life-bar">Life Bar</div>,
}));

jest.mock('../SurvivalGridSection', () => ({
  SurvivalGridSection: () => <div data-testid="grid-section">Grid</div>,
}));

jest.mock('../AccumulatedScoreDisplay', () => ({
  AccumulatedScoreDisplay: () => <div data-testid="score-display">Score</div>,
}));

jest.mock('@/components/Avatar', () => {
  return function MockAvatar() {
    return <div data-testid="avatar" />;
  };
});

import { SurvivalDesktopLayout, type SurvivalDesktopLayoutProps } from '../SurvivalDesktopLayout';
import type { LetterGrid } from '@/types';

const mockGrid: LetterGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const mockT = (key: string) => key;

const baseProps: SurvivalDesktopLayoutProps = {
  isTv: false,
  // Game state
  grid: mockGrid,
  isGameOver: false,
  eliminatedLetters: new Set(),
  onWordSubmit: jest.fn(),
  onWordChange: jest.fn(),
  highlightedPath: [],
  // Life
  lifePoints: 80,
  isLifeGaining: false,
  lifeGainAmount: null,
  skipAnimations: false,
  onLifeGainComplete: jest.fn(),
  // Score
  liveScore: 100,
  lastScoreIncrement: null,
  isScoreAnimating: false,
  // Clues
  currentHint: null,
  targetWord: 'HELLO',
  attempts: [],
  accumulatedClues: new Map(),
  revealedLetters: new Set(),
  knownLetters: new Set(),
  latestAttemptFeedback: null,
  showFeedbackOverlay: false,
  isClueGaining: false,
  clueContainerRef: { current: null },
  gameDir: 'ltr' as const,
  // Loot panel
  discoveredWords: [],
  hintStage: 0,
  // Leaderboard
  puzzleDate: '2026-02-07',
  language: 'en',
  currentPlayerId: null,
  currentGuestFingerprint: null,
  // Quit
  onQuitClick: jest.fn(),
  t: mockT,
};

describe('SurvivalDesktopLayout', () => {
  it('renders 3-column layout with live ranks, game area, and loot panel', () => {
    render(<SurvivalDesktopLayout {...baseProps} />);
    expect(screen.getByTestId('live-ranks')).toBeInTheDocument();
    expect(screen.getByTestId('loot-panel')).toBeInTheDocument();
    expect(screen.getByTestId('grid-section')).toBeInTheDocument();
  });

  it('renders survival header in center column', () => {
    render(<SurvivalDesktopLayout {...baseProps} />);
    expect(screen.getByTestId('survival-header')).toBeInTheDocument();
  });

  it('renders clue boxes in center column', () => {
    render(<SurvivalDesktopLayout {...baseProps} />);
    expect(screen.getByTestId('clue-boxes')).toBeInTheDocument();
  });

  it('renders life bar in center column', () => {
    render(<SurvivalDesktopLayout {...baseProps} />);
    expect(screen.getByTestId('life-bar')).toBeInTheDocument();
  });

  it('uses wider columns in TV mode', () => {
    const { container } = render(<SurvivalDesktopLayout {...baseProps} isTv={true} />);
    const gridEl = container.querySelector('[data-testid="desktop-grid"]');
    expect(gridEl).toBeInTheDocument();
    // TV mode uses 320px columns
    expect(gridEl).toHaveStyle({ gridTemplateColumns: '320px 1fr 320px' });
  });

  it('uses narrower columns in desktop mode', () => {
    const { container } = render(<SurvivalDesktopLayout {...baseProps} isTv={false} />);
    const gridEl = container.querySelector('[data-testid="desktop-grid"]');
    expect(gridEl).toBeInTheDocument();
    expect(gridEl).toHaveStyle({ gridTemplateColumns: '280px 1fr 280px' });
  });
});
