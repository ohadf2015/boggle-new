import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => <div data-testid="mascot" />,
}));

// Mock the new orphaned components to verify they render
 
const MockBlastComboStreakBadge = vi.fn((_props: any) => <div data-testid="combo-streak-badge" />);
vi.mock('../BlastComboStreakBadge', () => ({
  BlastComboStreakBadge: (props: any) => MockBlastComboStreakBadge(props),
}));

 
const MockBlastHotTileOverlay = vi.fn((_props: any) => <div data-testid="blast-hot-tile-container" />);
vi.mock('../BlastHotTileOverlay', () => ({
  BlastHotTileOverlay: (props: any) => MockBlastHotTileOverlay(props),
}));

 
const MockBlastReactiveBackground = vi.fn((_props: any) => <div data-testid="blast-reactive-bg" />);
vi.mock('../BlastReactiveBackground', () => ({
  __esModule: true,
  default: (props: any) => MockBlastReactiveBackground(props),
}));

 
const MockBlastBoardIntensity = vi.fn(({ children }: any) => <div data-testid="blast-board-intensity">{children}</div>);
vi.mock('../BlastBoardIntensity', () => ({
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
  t,
};

// ---------------------------------------------------------------------------
// Tests: Wiring of orphaned features
// ---------------------------------------------------------------------------

describe('BlastGameLayout orphaned feature wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
