/**
 * GameGridArea Tests
 *
 * Verifies WordFormingArea integration for consistent word feedback in adventure mode.
 */

import { render, screen } from '@testing-library/react';
import { GameGridArea } from '../GameGridArea';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { GridTileState } from '@/types/adventure';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AdventureThemeContext', () => {
  const R = require('react');
  return {
    useHUDTheme: () => ({
      headerBg: 'bg-neo-navy/90',
      headerBorder: 'border-neo-black/40',
      sidebarBg: 'bg-neo-black/40',
      scoreAccent: 'text-neo-cyan',
      levelBadgeColor: 'bg-neo-black/40',
      levelBadgeText: 'text-neo-cyan',
      objectiveAccent: 'text-neo-lime',
      hintActiveColor: 'bg-neo-lime',
      hintActiveText: 'text-neo-black',
    }),
    AdventureThemeContext: R.createContext({ worldId: 1 }),
  };
});

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...rest }: Record<string, unknown>) => (
      <div className={className as string} data-testid={rest['data-testid'] as string}>{children as React.ReactNode}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../AdventureGrid', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef(function MockAdventureGrid(_props: Record<string, unknown>, _ref: unknown) {
      return <div data-testid="adventure-grid" />;
    }),
  };
});

vi.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: vi.fn(({ word, feedback, compact }: { word: string; letterCount?: number; feedback?: unknown; compact?: boolean }) => (
    <div data-testid="word-forming-area" data-word={word} data-has-feedback={!!feedback} data-compact={compact} />
  )),
}));

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
  onTileSelect: vi.fn(),
  onWordSubmit: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnter: vi.fn(),
  gridRef: { current: null },
  isInteractive: true,
  isDisabled: false,
  entryPhase: 'playing',
  showCascade: false,
  onCascadeComplete: vi.fn(),
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

describe('GameGridArea', () => {
  it('should render WordFormingArea component', () => {
    render(<GameGridArea {...defaultProps} />);
    expect(screen.getByTestId('word-forming-area')).toBeInTheDocument();
  });

  it('should pass currentWord to WordFormingArea', () => {
    render(<GameGridArea {...defaultProps} currentWord="TEST" selectedLength={4} />);
    const wfa = screen.getByTestId('word-forming-area');
    expect(wfa).toHaveAttribute('data-word', 'TEST');
  });

  it('should render WordFormingArea in compact mode', () => {
    render(<GameGridArea {...defaultProps} />);
    const wfa = screen.getByTestId('word-forming-area');
    expect(wfa).toHaveAttribute('data-compact', 'true');
  });

  it('should pass wordFeedback to WordFormingArea when accepted', () => {
    const feedback: WordFeedback = {
      id: '1',
      type: 'accepted',
      word: 'HELLO',
      score: 42,
      timestamp: Date.now(),
    };
    render(<GameGridArea {...defaultProps} wordFeedback={feedback} />);
    const wfa = screen.getByTestId('word-forming-area');
    expect(wfa).toHaveAttribute('data-has-feedback', 'true');
  });

  it('should pass wordFeedback to WordFormingArea when rejected', () => {
    const feedback: WordFeedback = {
      id: '2',
      type: 'rejected',
      word: 'XYZ',
      message: 'Not a word',
      timestamp: Date.now(),
    };
    render(<GameGridArea {...defaultProps} wordFeedback={feedback} />);
    const wfa = screen.getByTestId('word-forming-area');
    expect(wfa).toHaveAttribute('data-has-feedback', 'true');
  });

  it('should still show min word length hint when selection is too short', () => {
    render(<GameGridArea {...defaultProps} selectedLength={2} minWordLength={3} />);
    expect(screen.getByText(/adventure.hints.minLetters3/)).toBeInTheDocument();
  });

  it('should render adventure grid', () => {
    render(<GameGridArea {...defaultProps} />);
    expect(screen.getByTestId('adventure-grid')).toBeInTheDocument();
  });

  // Regression: mobile-landscape CSS rules in animations.css set explicit
  // width AND height on .game-board-frame. Inside the aspect-square flex
  // wrapper, flex-shrink shrinks width but not height, breaking the square
  // grid. The wrapper must carry the `adventure-grid-container` class so the
  // CSS override (.adventure-grid-container .game-board-frame { width:100%;
  // height:100% !important }) forces .game-board-frame to fill the square
  // parent. Mirrors .desktop-grid-container / .tv-grid-container pattern.
  it('should mark grid wrapper with adventure-grid-container class so .game-board-frame fills the square parent', () => {
    const { container } = render(<GameGridArea {...defaultProps} />);
    const wrapper = container.querySelector('.adventure-grid-container');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain('aspect-square');
  });
});
