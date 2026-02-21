import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Capture props passed to Mascot for assertion
const MockMascot = jest.fn(({ variant }: { variant: string }) => (
  <div data-testid={`mascot-${variant}`} />
));

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: (props: any) => MockMascot(props),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/components/singleplayer/game/components/DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => <div data-testid="energy-bg" />,
}));

jest.mock('../BlastGrid', () => ({
  BlastGrid: () => <div data-testid="blast-grid" />,
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

jest.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

jest.mock('@/components/singleplayer/game/components/LetterTileWord', () => ({
  LetterTileWord: () => <div data-testid="letter-tile-word" />,
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/grid/hapticFeedback', () => ({
  vibrateBlastBomb: jest.fn(),
  vibrateBlastLightning: jest.fn(),
  vibrateBlastPrism: jest.fn(),
  vibrateBlastCascade: jest.fn(),
}));

jest.mock('../utils/blastStarCalculator', () => ({
  calculateEarnedStars: jest.fn().mockReturnValue(2),
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
  hintPath: null,
  hasHintAvailable: false,
  onRequestHint: jest.fn(),
  onClearHint: jest.fn(),
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
