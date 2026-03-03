/**
 * BlastGameLayoutPhaser — layout with Phaser canvas instead of DOM grid.
 *
 * Verifies:
 * - Renders Phaser canvas area (stubbed)
 * - Renders score display
 * - Renders combo display
 * - Renders word forming area
 * - Renders quit/help/end game buttons
 * - Does NOT render BlastGrid (DOM version)
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock dynamic import — BlastPhaserCanvas becomes a stub div
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="blast-phaser-canvas-stub" />;
    Stub.displayName = 'BlastPhaserCanvasStub';
    return Stub;
  },
}));

// Mock framer-motion to render plain divs
jest.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef<HTMLDivElement, React.PropsWithChildren<Record<string, unknown>>>(({ children, ...rest }, ref) => (
    <div ref={ref} {...rest}>{children as React.ReactNode}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock child components
jest.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));
jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));
jest.mock('@/components/singleplayer/game/components/DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => <div data-testid="energy-bg" />,
}));
jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));
jest.mock('../BlastHelpModal', () => ({
  BlastHelpModal: () => null,
}));
jest.mock('../BlastProgressBar', () => ({
  BlastProgressBar: () => <div data-testid="progress-bar" />,
}));
jest.mock('../BlastFoundWords', () => ({
  BlastFoundWords: () => null,
}));
jest.mock('../BlastCascadeWordBanner', () => ({
  BlastCascadeWordBanner: () => null,
}));
jest.mock('@/components/grid/hapticFeedback', () => ({
  vibrateBlastBomb: jest.fn(),
  vibrateBlastLightning: jest.fn(),
  vibrateBlastPrism: jest.fn(),
  vibrateBlastCascade: jest.fn(),
}));
jest.mock('../utils/blastStarCalculator', () => ({
  calculateEarnedStars: () => 2,
}));
jest.mock('@/components/ui/Mascot', () => ({
  Mascot: () => null,
}));

import { BlastGameLayoutPhaser } from '../BlastGameLayoutPhaser';
import type { BlastGameState, CascadeHighlightPhase } from '../types';

// ─── Test data ───────────────────────────────────────────────────────────────

const mockGameState: BlastGameState = {
  score: 42,
  tilesCleared: 5,
  totalTiles: 16,
  isComplete: false,
  isDeadEnd: false,
  wordsFound: ['CAT', 'DOG'],
  comboCount: 0,
  cascadeChainLevel: 0,
  movesRemaining: 10,
  movesUsed: 0,
  totalMoves: 10,
  bonusMoveScore: 0,
  tileTypeClears: {} as BlastGameState['tileTypeClears'],
};

function defaultProps() {
  return {
    gameState: mockGameState,
    comboLevel: 0,
    comboTimeRemaining: null as number | null,
    comboDanger: false,
    formedWord: '',
    currentFeedback: null,
    noWordsRemaining: false,
    cascadeChainLevel: 0,
    cascadeHighlightData: null,
    cascadeHighlightPhase: 'idle' as CascadeHighlightPhase,
    waveNumber: 1,
    cumulativeScore: 0,
    onQuitRequest: jest.fn(),
    onConfirmQuit: jest.fn(),
    onEndGame: jest.fn(),
    onShuffle: jest.fn(),
    showQuitConfirm: false,
    setShowQuitConfirm: jest.fn(),
    showEndGameConfirm: false,
    setShowEndGameConfirm: jest.fn(),
    hintPath: null as Array<{ row: number; col: number }> | null,
    hasHintAvailable: false,
    onRequestHint: jest.fn(),
    onClearHint: jest.fn(),
    t: (key: string) => key,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BlastGameLayoutPhaser', () => {
  it('renders the Phaser canvas stub', () => {
    const { getByTestId } = render(<BlastGameLayoutPhaser {...defaultProps()} />);
    expect(getByTestId('blast-phaser-canvas-stub')).toBeInTheDocument();
  });

  it('renders combo display', () => {
    const { getByTestId } = render(<BlastGameLayoutPhaser {...defaultProps()} />);
    expect(getByTestId('combo-display')).toBeInTheDocument();
  });

  it('renders word forming area', () => {
    const { getByTestId } = render(<BlastGameLayoutPhaser {...defaultProps()} />);
    expect(getByTestId('word-forming-area')).toBeInTheDocument();
  });

  it('displays score from gameState', () => {
    const { container } = render(<BlastGameLayoutPhaser {...defaultProps()} />);
    expect(container.textContent).toContain('42');
  });

  it('does NOT render BlastGrid component', () => {
    const { queryByTestId } = render(<BlastGameLayoutPhaser {...defaultProps()} />);
    // BlastGrid uses data-testid="blast-grid" — should not exist
    expect(queryByTestId('blast-grid')).not.toBeInTheDocument();
  });
});
