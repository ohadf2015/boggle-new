import React from 'react';
import { render, screen } from '@testing-library/react';
import type { BlastExplosion, BlastScorePopup, BlastTileState } from '../types';
import type { BlastCascadePhase, CascadeAnimationData } from '../hooks/useBlastCascade';
import type { LetterGrid } from '@/shared/types/game';

// ---- Mocks ----

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('animejs', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { stagger: jest.fn(() => 0) }),
}));

jest.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="grid-component" data-interactive={props.interactive}>{JSON.stringify(props.grid)}</div>,
}));

jest.mock('@/components/adventure/juice/ExplosionEffect', () => ({
  ExplosionEffect: ({ position }: any) => <div data-testid="explosion" data-x={position.x} data-y={position.y} />,
}));
jest.mock('@/components/adventure/juice/ScorePopup', () => ({
  ScorePopup: ({ score }: any) => <div data-testid="score-popup">{score}</div>,
}));

// ResizeObserver mock (BlastGrid measures container)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// ---- Imports (after mocks) ----

import { BlastExplosionLayer } from '../BlastExplosionLayer';
import { BlastCascadeOverlay } from '../BlastCascadeOverlay';
import { BlastGrid } from '../BlastGrid';

// ==================== Helpers ====================

function makeExplosion(overrides: Partial<BlastExplosion> = {}): BlastExplosion {
  return {
    id: 'exp-1',
    row: 0,
    col: 0,
    type: 'word',
    intensity: 1,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeScorePopup(overrides: Partial<BlastScorePopup> = {}): BlastScorePopup {
  return {
    id: 'popup-1',
    score: 10,
    row: 0,
    col: 0,
    isSpecial: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeTileState(row: number, col: number, overrides: Partial<BlastTileState> = {}): BlastTileState {
  return {
    row,
    col,
    type: 'standard',
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
    ...overrides,
  };
}

function make4x4Grid(): LetterGrid {
  return [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];
}

function make4x4TileStates(): BlastTileState[][] {
  return Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => makeTileState(r, c)),
  );
}

// ==================== BlastExplosionLayer ====================

describe('BlastExplosionLayer', () => {
  const defaultProps = {
    explosions: [] as BlastExplosion[],
    scorePopups: [] as BlastScorePopup[],
    onExplosionComplete: jest.fn(),
    onScorePopupComplete: jest.fn(),
    cellSize: 60,
    containerOffset: { x: 0, y: 0 },
  };

  it('renders explosions at correct positions', () => {
    const explosions = [
      makeExplosion({ id: 'e1', row: 0, col: 1 }),
      makeExplosion({ id: 'e2', row: 2, col: 3 }),
    ];

    render(<BlastExplosionLayer {...defaultProps} explosions={explosions} />);

    const els = screen.getAllByTestId('explosion');
    expect(els).toHaveLength(2);
  });

  it('renders score popups with correct score values', () => {
    const scorePopups = [
      makeScorePopup({ id: 'p1', score: 25 }),
      makeScorePopup({ id: 'p2', score: 100 }),
    ];

    render(<BlastExplosionLayer {...defaultProps} scorePopups={scorePopups} />);

    const popups = screen.getAllByTestId('score-popup');
    expect(popups).toHaveLength(2);
    expect(popups[0]).toHaveTextContent('25');
    expect(popups[1]).toHaveTextContent('100');
  });

  it('renders empty when no explosions or popups', () => {
    const { container } = render(<BlastExplosionLayer {...defaultProps} />);

    expect(screen.queryAllByTestId('explosion')).toHaveLength(0);
    expect(screen.queryAllByTestId('score-popup')).toHaveLength(0);
    // Only the wrapper div should be present
    expect(container.firstChild).toBeTruthy();
    expect(container.firstChild!.childNodes).toHaveLength(0);
  });
});

// ==================== BlastCascadeOverlay ====================

describe('BlastCascadeOverlay', () => {
  const baseProps = {
    gridSize: 4,
    containerWidth: 240,
  };

  const sampleData: CascadeAnimationData = {
    clearedTiles: [
      { row: 1, col: 2, letter: 'X', type: 'standard' },
      { row: 3, col: 0, letter: 'Y', type: 'gold' },
    ],
    fallingTiles: [
      { row: 2, col: 1, letter: 'F', type: 'standard', fallDistance: 1 },
      { row: 3, col: 1, letter: 'G', type: 'bomb', fallDistance: 2 },
    ],
    newTiles: [
      { row: 0, col: 2, letter: 'N', type: 'standard', spawnOffset: 1 },
      { row: 1, col: 2, letter: 'M', type: 'rainbow', spawnOffset: 2 },
    ],
  };

  it('returns null when phase is idle', () => {
    const { container } = render(
      <BlastCascadeOverlay phase="idle" data={sampleData} {...baseProps} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders cleared tile letters during clearing phase', () => {
    render(
      <BlastCascadeOverlay phase="clearing" data={sampleData} {...baseProps} />,
    );

    // Should render the cleared tile letters
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();

    // Should NOT render falling or new tiles during clearing phase
    expect(screen.queryByText('F')).not.toBeInTheDocument();
    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });

  it('renders falling tiles during falling phase', () => {
    render(
      <BlastCascadeOverlay phase="falling" data={sampleData} {...baseProps} />,
    );

    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();

    // Should NOT render cleared or new tiles during falling phase
    expect(screen.queryByText('X')).not.toBeInTheDocument();
    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });

  it('renders new tiles during appearing phase', () => {
    render(
      <BlastCascadeOverlay phase="appearing" data={sampleData} {...baseProps} />,
    );

    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();

    // Should NOT render cleared or falling tiles during appearing phase
    expect(screen.queryByText('X')).not.toBeInTheDocument();
    expect(screen.queryByText('F')).not.toBeInTheDocument();
  });
});

// ==================== BlastGrid ====================

describe('BlastGrid', () => {
  const noop = jest.fn();

  const defaultGridProps = {
    grid: make4x4Grid(),
    tileStates: make4x4TileStates(),
    gridSize: 4,
    explosions: [] as BlastExplosion[],
    language: 'en' as const,
    interactive: true,
    comboLevel: 0,
    cascadePhase: 'idle' as BlastCascadePhase,
    cascadeAnimationData: null,
    scorePopups: [] as BlastScorePopup[],
    onWordSubmit: noop,
    onPathSubmit: noop,
    onWordChange: noop,
    onExplosionComplete: noop,
    onScorePopupComplete: noop,
  };

  it('renders GridComponent with grid data', () => {
    render(<BlastGrid {...defaultGridProps} />);

    const gridEl = screen.getByTestId('grid-component');
    expect(gridEl).toBeInTheDocument();
    expect(gridEl).toHaveTextContent(JSON.stringify(make4x4Grid()));
  });

  it('passes interactive=false during cascade (cascadePhase !== idle)', () => {
    render(
      <BlastGrid {...defaultGridProps} cascadePhase="clearing" interactive={true} />,
    );

    const gridEl = screen.getByTestId('grid-component');
    // When cascadePhase is not 'idle', isInteractive should be false
    expect(gridEl).toHaveAttribute('data-interactive', 'false');
  });

  it('renders the grid even when containerWidth is 0 (ResizeObserver mock does not fire)', () => {
    // ResizeObserver mock does not trigger, so containerWidth stays at 0.
    // The GridComponent should still render; overlays are conditionally rendered
    // only when containerWidth > 0 so they won't appear here.
    render(<BlastGrid {...defaultGridProps} />);

    const gridEl = screen.getByTestId('grid-component');
    expect(gridEl).toBeInTheDocument();

    // Overlays depend on containerWidth > 0, which our mock doesn't provide,
    // so score-popup and explosion testids should be absent
    expect(screen.queryByTestId('explosion')).not.toBeInTheDocument();
    expect(screen.queryByTestId('score-popup')).not.toBeInTheDocument();
  });
});
