/**
 * GameGridArea — Phaser integration tests.
 *
 * Verifies:
 *   - comboCount prop is forwarded to PhaserGameAdventure as comboLevel
 *   - wordFeedback is forwarded to PhaserGameAdventure
 *   - onWordSubmit converts Phaser path cells to flat indices
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { GridTileState } from '@/types/adventure';

// ─── Track props passed to PhaserGameAdventure ────────────────────────────────

let capturedAdventureProps: Record<string, unknown> = {};

jest.mock('@/components/phaser/PhaserGameAdventure', () => ({
  PhaserGameAdventure: (props: Record<string, unknown>) => {
    capturedAdventureProps = props;
    return <div data-testid="phaser-game-adventure" />;
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/AdventureThemeContext', () => {
  const R = require('react');
  return {
    useHUDTheme: () => ({
      headerBg: 'bg-neo-navy/90', headerBorder: 'border-neo-black/40',
      sidebarBg: 'bg-neo-black/40', scoreAccent: 'text-neo-cyan',
      levelBadgeColor: 'bg-neo-black/40', levelBadgeText: 'text-neo-cyan',
      objectiveAccent: 'text-neo-lime', hintActiveColor: 'bg-neo-lime', hintActiveText: 'text-neo-black',
    }),
    AdventureThemeContext: R.createContext({ worldId: 1 }),
  };
});

jest.mock('../../themed/BoardFrame', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: unknown }) => R.createElement('div', { 'data-testid': 'board-frame' }, children),
  };
});

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: Record<string, unknown>) => (
      <div className={className as string} data-testid={rest['data-testid'] as string}>{children as React.ReactNode}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../AdventureGrid', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="adventure-grid" />),
}));

jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: jest.fn(({ word }: { word: string }) => (
    <div data-testid="word-forming-area" data-word={word} />
  )),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { GameGridArea } from '../GameGridArea';

// ─── Test data ────────────────────────────────────────────────────────────────

const baseTiles: GridTileState[] = Array.from({ length: 9 }, (_, i) => ({
  letter: String.fromCharCode(65 + i),
  id: `tile-${Math.floor(i / 3)}-${i % 3}`,
  row: Math.floor(i / 3),
  col: i % 3,
  type: 'standard' as const,
  isCleared: false,
  isSelected: false,
  isAdjacent: false,
  isInPath: false,
}));

const defaultProps = {
  tiles: baseTiles,
  gridSize: 3,
  selectedIndices: [] as number[],
  onTileSelect: jest.fn(),
  onWordSubmit: jest.fn(),
  onDragStart: jest.fn(),
  onDragEnter: jest.fn(),
  gridRef: { current: null },
  isInteractive: true,
  isDisabled: false,
  entryPhase: 'playing',
  showCascade: false,
  onCascadeComplete: jest.fn(),
  hintHighlightIndices: [] as number[],
  pathPoints: [] as Array<{ x: number; y: number; timestamp: number }>,
  validationError: null as string | null,
  isValidating: false,
  isWordValid: false,
  wasWordSubmitted: false,
  lastAccepted: null as { word: string; score: number } | null,
  selectedLength: 0,
  minWordLength: 3,
  hintLevel: 'none' as const,
  wordFeedback: null as WordFeedback | null,
  currentWord: '',
};

beforeEach(() => {
  capturedAdventureProps = {};
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GameGridArea Phaser integration', () => {
  it('renders PhaserGameAdventure', () => {
    render(<GameGridArea {...defaultProps} />);
    expect(screen.getByTestId('phaser-game-adventure')).toBeInTheDocument();
  });

  it('forwards comboCount as comboLevel to PhaserGameAdventure', () => {
    render(<GameGridArea {...defaultProps} comboCount={5} />);
    expect(capturedAdventureProps.comboLevel).toBe(5);
  });

  it('defaults comboLevel to 0 when comboCount is not provided', () => {
    render(<GameGridArea {...defaultProps} />);
    expect(capturedAdventureProps.comboLevel).toBe(0);
  });

  it('forwards wordFeedback to PhaserGameAdventure', () => {
    const feedback: WordFeedback = {
      id: '1',
      type: 'accepted',
      word: 'TEST',
      score: 30,
      timestamp: Date.now(),
    };
    render(<GameGridArea {...defaultProps} wordFeedback={feedback} />);
    expect(capturedAdventureProps.wordFeedback).toBe(feedback);
  });

  it('converts path cells to flat indices in onWordSubmit', () => {
    const onWordSubmit = jest.fn();
    render(<GameGridArea {...defaultProps} onWordSubmit={onWordSubmit} gridSize={3} />);

    // Simulate PhaserGameAdventure calling onWordSubmit with path cells
    const phaserOnWordSubmit = capturedAdventureProps.onWordSubmit as (
      word: string,
      path: Array<{ row: number; col: number; letter: string }>
    ) => void;

    act(() => {
      phaserOnWordSubmit('ABC', [
        { row: 0, col: 0, letter: 'A' },
        { row: 0, col: 1, letter: 'B' },
        { row: 0, col: 2, letter: 'C' },
      ]);
    });

    // row * gridSize + col: 0*3+0=0, 0*3+1=1, 0*3+2=2
    expect(onWordSubmit).toHaveBeenCalledWith('ABC', [0, 1, 2]);
  });

  it('converts path cells correctly for non-first-row tiles', () => {
    const onWordSubmit = jest.fn();
    render(<GameGridArea {...defaultProps} onWordSubmit={onWordSubmit} gridSize={3} />);

    const phaserOnWordSubmit = capturedAdventureProps.onWordSubmit as (
      word: string,
      path: Array<{ row: number; col: number; letter: string }>
    ) => void;

    act(() => {
      phaserOnWordSubmit('GEI', [
        { row: 2, col: 0, letter: 'G' },
        { row: 1, col: 1, letter: 'E' },
        { row: 2, col: 2, letter: 'I' },
      ]);
    });

    // 2*3+0=6, 1*3+1=4, 2*3+2=8
    expect(onWordSubmit).toHaveBeenCalledWith('GEI', [6, 4, 8]);
  });
});
