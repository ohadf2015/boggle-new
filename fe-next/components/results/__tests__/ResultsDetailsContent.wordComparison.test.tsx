/**
 * Wiring test: ResultsDetailsContent mounts ComparativeInsights + WordComparisonGrid
 * in multiplayer results when there are other players.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Player, WordObject } from '../types';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

// Mock heavy dynamic children — we only care about the comparison components being mounted
vi.mock('@/components/results/ResultsPlayerCard', () => ({
  __esModule: true,
  default: () => <div data-testid="results-player-card" />,
}));
vi.mock('@/components/results/BlastResultsSummary', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/components/results/WordHuntResultsSummary', () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock('@/components/results/ComparativeInsights', () => ({
  __esModule: true,
  default: () => <div data-testid="comparative-insights" />,
}));
vi.mock('@/components/results/WordComparisonGrid', () => ({
  __esModule: true,
  default: () => <div data-testid="word-comparison-grid" />,
}));
vi.mock('@/components/ui/CollapsibleSection', () => ({
  __esModule: true,
  default: ({ children, title }: { children?: React.ReactNode; title?: React.ReactNode }) => (
    <div data-testid="collapsible-section">
      <div>{title}</div>
      {children}
    </div>
  ),
}));

import { ResultsDetailsContent } from '../ResultsDetailsContent';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const makeWord = (word: string, score = word.length * 10): WordObject => ({
  word,
  score,
  validated: true,
  isDuplicate: false,
});

const makePlayer = (username: string, score: number): Player => ({
  username,
  score,
  allWords: [],
});

const baseProps = {
  currentPlayerData: makePlayer('Alice', 100),
  currentPlayerRank: 1,
  sortedScores: [makePlayer('Alice', 100), makePlayer('Bob', 80)],
  winner: makePlayer('Alice', 100),
  allPlayerWords: {
    Alice: [makeWord('cat'), makeWord('dog')],
    Bob: [makeWord('cat'), makeWord('fish')],
  },
  xpGainedData: null,
  levelUpData: null,
  currentPlayerArchetype: null,
  duplicateRuleDisabled: false,
  isCurrentUserWinner: true,
  username: 'Alice',
  currentPlayerValidWords: [{ word: 'cat', score: 30 }, { word: 'dog', score: 30 }],
  shareCardStats: { maxCombo: 0, longestWord: 'dog' },
  otherPlayers: [makePlayer('Bob', 80)],
  playerArchetypes: new Map(),
  missedWords: [],
  isHost: false,
  currentStreakCount: 0,
  t,
};

describe('ResultsDetailsContent — word comparison wiring', () => {
  it('renders ComparativeInsights when there are other players', () => {
    render(<ResultsDetailsContent {...baseProps} />);
    expect(screen.getByTestId('comparative-insights')).toBeInTheDocument();
  });

  it('renders WordComparisonGrid when there are other players', () => {
    render(<ResultsDetailsContent {...baseProps} />);
    expect(screen.getByTestId('word-comparison-grid')).toBeInTheDocument();
  });

  it('does NOT render comparison components in solo play (no other players)', () => {
    render(<ResultsDetailsContent {...baseProps} otherPlayers={[]} />);
    expect(screen.queryByTestId('comparative-insights')).not.toBeInTheDocument();
    expect(screen.queryByTestId('word-comparison-grid')).not.toBeInTheDocument();
  });
});
