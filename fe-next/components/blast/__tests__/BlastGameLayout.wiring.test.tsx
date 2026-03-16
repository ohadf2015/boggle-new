import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
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

jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
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

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: () => <div data-testid="mascot" />,
}));

// Mock the new orphaned components to verify they render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockBlastComboStreakBadge = jest.fn((_props: any) => <div data-testid="combo-streak-badge" />);
jest.mock('../BlastComboStreakBadge', () => ({
  BlastComboStreakBadge: (props: any) => MockBlastComboStreakBadge(props),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockBlastHotTileOverlay = jest.fn((_props: any) => <div data-testid="blast-hot-tile-container" />);
jest.mock('../BlastHotTileOverlay', () => ({
  BlastHotTileOverlay: (props: any) => MockBlastHotTileOverlay(props),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockBlastReactiveBackground = jest.fn((_props: any) => <div data-testid="blast-reactive-bg" />);
jest.mock('../BlastReactiveBackground', () => ({
  __esModule: true,
  default: (props: any) => MockBlastReactiveBackground(props),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockBlastBoardIntensity = jest.fn(({ children }: any) => <div data-testid="blast-board-intensity">{children}</div>);
jest.mock('../BlastBoardIntensity', () => ({
  __esModule: true,
  default: (props: any) => MockBlastBoardIntensity(props),
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
// Tests: Wiring of orphaned features
// ---------------------------------------------------------------------------

describe('BlastGameLayout orphaned feature wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders BlastComboStreakBadge when streak prop is provided with active streak', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        streak={{ level: 3, isActive: true, multiplier: 1.6 }}
        arcRef={{ current: null }}
      />,
    );
    expect(MockBlastComboStreakBadge).toHaveBeenCalledWith(
      expect.objectContaining({
        streak: { level: 3, isActive: true, multiplier: 1.6 },
      }),
    );
  });

  it('does not render BlastComboStreakBadge when streak is not provided', () => {
    render(<BlastGameLayout {...baseProps} />);
    expect(MockBlastComboStreakBadge).not.toHaveBeenCalled();
  });

  it('renders BlastHotTileOverlay when hotTiles are provided', () => {
    const hotTiles = [{ row: 0, col: 1, multiplier: 3, createdAt: 1000, expiresAt: 9000 }];
    render(<BlastGameLayout {...baseProps} hotTiles={hotTiles} isHotPhase={true} />);
    expect(MockBlastHotTileOverlay).toHaveBeenCalledWith(
      expect.objectContaining({
        hotTiles,
        gridSize: 4,
      }),
    );
  });

  it('does not render BlastHotTileOverlay when hotTiles not provided', () => {
    render(<BlastGameLayout {...baseProps} />);
    expect(MockBlastHotTileOverlay).not.toHaveBeenCalled();
  });

  it('renders BlastReactiveBackground when intensity is provided', () => {
    render(<BlastGameLayout {...baseProps} intensity={3} />);
    expect(MockBlastReactiveBackground).toHaveBeenCalledWith(
      expect.objectContaining({ intensity: 3 }),
    );
  });

  it('wraps grid in BlastBoardIntensity when intensity is provided', () => {
    render(<BlastGameLayout {...baseProps} intensity={4} />);
    expect(MockBlastBoardIntensity).toHaveBeenCalledWith(
      expect.objectContaining({ intensity: 4 }),
    );
    // Board intensity should contain the blast grid
    const boardIntensity = screen.getByTestId('blast-board-intensity');
    expect(boardIntensity.querySelector('[data-testid="blast-grid"]')).toBeTruthy();
  });

  it('does not render reactive background or board intensity when intensity is 0 or not provided', () => {
    render(<BlastGameLayout {...baseProps} />);
    expect(MockBlastReactiveBackground).not.toHaveBeenCalled();
    expect(MockBlastBoardIntensity).not.toHaveBeenCalled();
  });
});
