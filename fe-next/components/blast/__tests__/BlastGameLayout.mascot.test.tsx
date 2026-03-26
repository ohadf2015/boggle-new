import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Capture props passed to Mascot for assertion
const MockMascot = vi.fn(({ variant }: { variant: string }) => (
  <div data-testid={`mascot-${variant}`} />
));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: (props: any) => MockMascot(props),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/singleplayer/game/components/DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => <div data-testid="energy-bg" />,
}));

vi.mock('../BlastGrid', () => ({
  BlastGrid: () => <div data-testid="blast-grid" />,
}));

vi.mock('../BlastProgressBar', () => ({
  BlastProgressBar: () => <div data-testid="blast-progress-bar" />,
}));

vi.mock('../BlastFoundWords', () => ({
  BlastFoundWords: () => <div data-testid="blast-found-words" />,
}));

vi.mock('../BlastHelpModal', () => ({
  BlastHelpModal: () => <div data-testid="blast-help-modal" />,
}));

vi.mock('../BlastCascadeWordBanner', () => ({
  BlastCascadeWordBanner: () => <div data-testid="blast-cascade-banner" />,
}));

vi.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

vi.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/grid/hapticFeedback', () => ({
  vibrateBlastBomb: vi.fn(),
  vibrateBlastLightning: vi.fn(),
  vibrateBlastPrism: vi.fn(),
  vibrateBlastCascade: vi.fn(),
}));

vi.mock('../utils/blastStarCalculator', () => ({
  calculateEarnedStars: vi.fn().mockReturnValue(2),
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
  wordsFound: [],
  tilesCleared: 3,
  totalTiles: 16,
  isComplete: false,
  comboCount: 0,
  isDeadEnd: false,
  cascadeChainLevel: 0,
  movesRemaining: 10,
  movesUsed: 0,
  totalMoves: 10,
  bonusMoveScore: 0,
  tileTypeClears: {} as BlastGameState['tileTypeClears'],
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
  noWordsRemaining: false,
  waveNumber: 1,
  cumulativeScore: 0,
  comboLevel: 0,
  comboTimeRemaining: null,
  comboDanger: false,
  formedWord: '',
  currentFeedback: null,
  onWordSubmit: vi.fn(),
  onPathSubmit: vi.fn(),
  onWordChange: vi.fn(),
  onExplosionComplete: vi.fn(),
  onScorePopupComplete: vi.fn(),
  onShuffle: vi.fn(),
  onQuitRequest: vi.fn(),
  onConfirmQuit: vi.fn(),
  onEndGame: vi.fn(),
  showQuitConfirm: false,
  setShowQuitConfirm: vi.fn(),
  showEndGameConfirm: false,
  setShowEndGameConfirm: vi.fn(),
  hintPath: null,
  hasHintAvailable: false,
  onRequestHint: vi.fn(),
  onClearHint: vi.fn(),
  t,
};

beforeEach(() => {
  MockMascot.mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGameLayout - powerup mascot', () => {
  it('shows powerup mascot when a hint path is active (power-up active)', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        hintPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }]}
      />,
    );
    expect(screen.getByTestId('mascot-powerup')).toBeInTheDocument();
  });

  it('hides powerup mascot when no hint path is active (no power-up)', () => {
    render(<BlastGameLayout {...baseProps} hintPath={null} />);
    expect(screen.queryByTestId('mascot-powerup')).not.toBeInTheDocument();
  });

  it('renders powerup mascot with animated prop so the GIF has CSS enhancement', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        hintPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }]}
      />,
    );
    expect(MockMascot).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'powerup', animated: true }),
    );
  });

  it('renders powerup mascot container with pointer-events-none so it cannot block tile selection', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        hintPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }]}
      />,
    );
    const mascot = screen.getByTestId('mascot-powerup');
    const container = mascot.parentElement;
    expect(container?.className).toContain('pointer-events-none');
  });

  it('renders powerup mascot container with absolute positioning as an overlay', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        hintPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }]}
      />,
    );
    const mascot = screen.getByTestId('mascot-powerup');
    const container = mascot.parentElement;
    expect(container?.className).toContain('absolute');
  });
});
