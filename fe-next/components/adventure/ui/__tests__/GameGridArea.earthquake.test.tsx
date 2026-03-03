/**
 * Tests for GameGridArea earthquake prop forwarding.
 * Verifies earthquakeState and fireRoundActive are passed to PhaserGameAdventure.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Enable Phaser grid for these tests
process.env.NEXT_PUBLIC_PHASER_GRID = 'true';

// Track props passed to PhaserGameAdventure
let capturedProps: Record<string, unknown> = {};

jest.mock('@/components/phaser/PhaserGameAdventure', () => ({
  PhaserGameAdventure: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid="phaser-game-adventure" />;
  },
}));

jest.mock('../../AdventureGrid', () => {
  return React.forwardRef(function MockGrid(_: unknown, _ref: unknown) {
    return <div data-testid="adventure-grid" />;
  });
});

jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MockMotionDiv(
      { children, ...rest }: { children?: React.ReactNode; [key: string]: unknown },
      ref: React.Ref<HTMLDivElement>
    ) {
      return <div ref={ref} {...rest}>{children}</div>;
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/AdventureThemeContext', () => ({
  useHUDTheme: () => ({
    headerBg: 'bg-neo-navy/90', headerBorder: 'border-neo-black/40',
    sidebarBg: 'bg-neo-black/40', scoreAccent: 'text-neo-cyan',
    levelBadgeColor: 'bg-neo-black/40', levelBadgeText: 'text-neo-cyan',
    objectiveAccent: 'text-neo-lime', hintActiveColor: 'bg-neo-lime', hintActiveText: 'text-neo-black',
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

import { GameGridArea } from '../GameGridArea';

const baseProps = {
  tiles: [
    { id: 'tile-0-0', letter: 'A', type: 'standard' as const, row: 0, col: 0, isCleared: false, isFrozen: false },
    { id: 'tile-0-1', letter: 'B', type: 'standard' as const, row: 0, col: 1, isCleared: false, isFrozen: false },
    { id: 'tile-1-0', letter: 'C', type: 'standard' as const, row: 1, col: 0, isCleared: false, isFrozen: false },
    { id: 'tile-1-1', letter: 'D', type: 'standard' as const, row: 1, col: 1, isCleared: false, isFrozen: false },
  ],
  gridSize: 2,
  selectedIndices: [] as number[],
  onTileSelect: jest.fn(),
  onWordSubmit: jest.fn(),
  onDragStart: jest.fn(),
  onDragEnter: jest.fn(),
  gridRef: { current: null } as React.RefObject<HTMLDivElement | null>,
  isInteractive: true,
  isDisabled: false,
  entryPhase: 'playing',
  showCascade: false,
  onCascadeComplete: jest.fn(),
  hintHighlightIndices: [] as number[],
  pathPoints: [] as Array<{ x: number; y: number; timestamp: number }>,
  validationError: null,
  isValidating: false,
  isWordValid: false,
  wasWordSubmitted: false,
  lastAccepted: null,
  selectedLength: 0,
  minWordLength: 3,
  hintLevel: 'none' as const,
};

describe('GameGridArea - earthquake props forwarding', () => {
  beforeEach(() => {
    capturedProps = {};
  });

  it('should pass earthquakeState to PhaserGameAdventure', () => {
    render(<GameGridArea {...baseProps} earthquakeState="warning" />);

    expect(capturedProps.earthquakeState).toBe('warning');
  });

  it('should pass fireRoundActive=true to PhaserGameAdventure', () => {
    render(<GameGridArea {...baseProps} fireRoundActive={true} />);

    expect(capturedProps.fireRoundActive).toBe(true);
  });

  it('should default fireRoundActive to false when not provided', () => {
    render(<GameGridArea {...baseProps} />);

    expect(capturedProps.fireRoundActive).toBe(false);
  });

  it('should forward earthquakeState changes on rerender', () => {
    const { rerender } = render(
      <GameGridArea {...baseProps} earthquakeState="idle" />
    );

    expect(capturedProps.earthquakeState).toBe('idle');

    rerender(<GameGridArea {...baseProps} earthquakeState="shaking" />);

    expect(capturedProps.earthquakeState).toBe('shaking');
  });
});
