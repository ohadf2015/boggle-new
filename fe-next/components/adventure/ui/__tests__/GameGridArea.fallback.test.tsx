/**
 * GameGridArea — Error boundary fallback tests.
 *
 * Verifies that when PhaserGameAdventure throws, the error boundary
 * falls back to rendering AdventureGrid.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { GridTileState } from '@/types/adventure';

// Enable Phaser grid so error boundary path is exercised
process.env.NEXT_PUBLIC_PHASER_GRID = 'true';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// PhaserGameAdventure throws on render to simulate load failure
jest.mock('@/components/phaser/PhaserGameAdventure', () => ({
  PhaserGameAdventure: () => {
    throw new Error('Phaser failed to load');
  },
}));

const mockAdventureGrid = jest.fn(() => <div data-testid="adventure-grid-fallback" />);
jest.mock('../../AdventureGrid', () => ({
  __esModule: true,
  default: React.forwardRef(function MockAdventureGrid(props: Record<string, unknown>, _ref: React.Ref<unknown>) {
    mockAdventureGrid(props);
    return <div data-testid="adventure-grid-fallback" />;
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: Record<string, unknown>) => (
      <div className={className as string} data-testid={rest['data-testid'] as string}>{children as React.ReactNode}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GameGridArea error boundary fallback', () => {
  // Suppress console.error for expected error boundary output
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders AdventureGrid when PhaserGameAdventure throws', () => {
    render(<GameGridArea {...defaultProps} />);
    expect(screen.getByTestId('adventure-grid-fallback')).toBeInTheDocument();
  });

  it('does not render PhaserGameAdventure when it throws', () => {
    render(<GameGridArea {...defaultProps} />);
    expect(screen.queryByTestId('phaser-game-adventure')).not.toBeInTheDocument();
  });
});
