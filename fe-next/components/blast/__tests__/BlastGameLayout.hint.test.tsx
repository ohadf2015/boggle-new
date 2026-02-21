import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  Bomb: () => <span data-testid="bomb-icon" />,
  HelpCircle: () => <span data-testid="help-icon" />,
  Lightbulb: () => <span data-testid="lightbulb-icon" />,
  Shuffle: () => <span data-testid="shuffle-icon" />,
  Star: () => <span data-testid="star-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/components/singleplayer/game/components/LetterTileWord', () => ({
  LetterTileWord: () => <div data-testid="letter-tile-word" />,
}));

jest.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

jest.mock('@/components/singleplayer/game/components/DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => <div data-testid="energy-bg" />,
}));

jest.mock('../BlastGrid', () => ({
  BlastGrid: ({ highlightedPath }: any) => (
    <div
      data-testid="blast-grid"
      data-highlighted={highlightedPath ? JSON.stringify(highlightedPath) : ''}
    />
  ),
}));

jest.mock('../BlastProgressBar', () => ({
  BlastProgressBar: () => <div data-testid="blast-progress-bar" />,
}));

jest.mock('../BlastFoundWords', () => ({
  BlastFoundWords: () => <div data-testid="blast-found-words" />,
}));

jest.mock('../BlastHelpModal', () => ({
  BlastHelpModal: () => <div data-testid="blast-help-modal" />,
}));

jest.mock('../BlastCascadeWordBanner', () => ({
  BlastCascadeWordBanner: () => <div data-testid="blast-cascade-banner" />,
}));

jest.mock('@/components/grid/hapticFeedback', () => ({
  vibrateBlastBomb: jest.fn(),
  vibrateBlastLightning: jest.fn(),
  vibrateBlastPrism: jest.fn(),
  vibrateBlastCascade: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { BlastGameLayout } from '../BlastGameLayout';
import type { BlastGameState, BlastTileState } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const t = (key: string) => key;

const makeGrid = (size = 4): string[][] =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => 'A'));

const makeTile = (row: number, col: number): BlastTileState => ({
  row,
  col,
  type: 'standard',
  isCleared: false,
  activationEffect: null,
  hitsRemaining: 0,
});

const makeTileStates = (size = 4): BlastTileState[][] =>
  Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => makeTile(r, c)),
  );

const defaultGameState: BlastGameState = {
  score: 0,
  wordsFound: ['CAT'],
  tilesCleared: 3,
  totalTiles: 16,
  comboCount: 0,
  isComplete: false,
  isDeadEnd: false,
  cascadeChainLevel: 0,
};

const baseProps = {
  grid: makeGrid(),
  tileStates: makeTileStates(),
  gridSize: 4,
  language: 'en' as const,
  explosions: [],
  scorePopups: [],
  cascadePhase: 'idle' as const,
  cascadeAnimationData: null,
  cascadeChainLevel: 0,
  cascadeHighlightData: null,
  cascadeHighlightPhase: 'idle' as const,
  gameState: defaultGameState,
  noWordsRemaining: true,
  waveNumber: 1,
  cumulativeScore: 0,
  scoreThreshold: undefined,
  comboLevel: 0,
  comboTimeRemaining: null,
  comboDanger: false,
  formedWord: '',
  currentFeedback: null,
  onWordSubmit: jest.fn(),
  onPathSubmit: jest.fn(),
  onWordChange: jest.fn(),
  onExplosionComplete: jest.fn(),
  onScorePopupComplete: jest.fn(),
  onShuffle: jest.fn(),
  onQuitRequest: jest.fn(),
  onConfirmQuit: jest.fn(),
  onEndGame: jest.fn(),
  showQuitConfirm: false,
  setShowQuitConfirm: jest.fn(),
  showEndGameConfirm: false,
  setShowEndGameConfirm: jest.fn(),
  t,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGameLayout dead-end hint panel', () => {
  it('shows hint button when hasHintAvailable=true and noWordsRemaining=true', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={true}
        hintPath={null}
      />,
    );
    expect(screen.getByText('blast.hint')).toBeInTheDocument();
  });

  it('hides hint button when hasHintAvailable=false', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={false}
        hintPath={null}
      />,
    );
    expect(screen.queryByText('blast.hint')).not.toBeInTheDocument();
  });

  it('hides hint button when hintPath is already active', () => {
    const hintPath = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={true}
        hintPath={hintPath}
      />,
    );
    expect(screen.queryByText('blast.hint')).not.toBeInTheDocument();
  });

  it('calls onRequestHint when hint button is clicked', () => {
    const onRequestHint = jest.fn();
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={true}
        hintPath={null}
        onRequestHint={onRequestHint}
      />,
    );
    fireEvent.click(screen.getByText('blast.hint'));
    expect(onRequestHint).toHaveBeenCalledTimes(1);
  });

  it('shows shuffle button in dead-end panel', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={false}
        hintPath={null}
      />,
    );
    expect(screen.getByText('blast.shuffle')).toBeInTheDocument();
  });

  it('shows end game button in dead-end panel', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={false}
        hintPath={null}
      />,
    );
    // The dead-end panel end game button
    const endGameButtons = screen.getAllByText('blast.giveUp');
    expect(endGameButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show dead-end panel when noWordsRemaining=false', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={false}
        hasHintAvailable={true}
        hintPath={null}
      />,
    );
    expect(screen.queryByText('blast.stuck')).not.toBeInTheDocument();
    expect(screen.queryByText('blast.hint')).not.toBeInTheDocument();
  });

  it('passes hintPath to BlastGrid as highlightedPath', () => {
    const hintPath = [{ row: 1, col: 2 }, { row: 1, col: 3 }];
    render(
      <BlastGameLayout
        {...baseProps}
        noWordsRemaining={true}
        hasHintAvailable={true}
        hintPath={hintPath}
      />,
    );
    const grid = screen.getByTestId('blast-grid');
    expect(grid.getAttribute('data-highlighted')).toBe(JSON.stringify(hintPath));
  });
});
