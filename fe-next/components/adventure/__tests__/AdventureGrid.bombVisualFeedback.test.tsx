/**
 * AdventureGrid Bomb Tile Visual Feedback Tests
 *
 * Tests for bomb tile visual indicators:
 * 1. Row highlight preview when bomb is selected (shows which tiles will be cleared)
 * 2. Explosion effect on ALL tiles in the row when bomb detonates
 * 3. Tooltip/badge explaining bomb clears the entire row
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';

// ==============================================
// MOCK SETUP
// ==============================================

// Mock the hooks
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

// Mock AdventureThemeContext
vi.mock('@/contexts/AdventureThemeContext', () => ({
  AdventureThemeContext: React.createContext({ worldId: 1 }),
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
  useTimerTheme: () => ({
    normal: { bg: 'bg-neo-navy/80', text: 'text-neo-white', shadow: '' },
    warning: { bg: 'bg-neo-orange/20', text: 'text-neo-orange', shadow: 'shadow-[0_0_12px_rgba(255,107,53,0.3)]' },
    danger: { bg: 'bg-neo-red/20', text: 'text-neo-red', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
    critical: { bg: 'bg-neo-red/30', text: 'text-neo-red', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
  }),
  useBossFightTheme: () => ({
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    phaseColors: {
      phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
      phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
      enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
    },
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock animations
vi.mock('@/components/animations', () => ({
  WordPathTrail: () => null,
  SelectionSparkle: () => null,
}));

// Mock BoardFrame
vi.mock('@/components/adventure/themed/BoardFrame', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="board-frame">{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
    dir: 'ltr',
  }),
}));

// ==============================================
// HELPERS
// ==============================================

function createTile(
  id: string,
  row: number,
  col: number,
  letter: string,
  type: GridTileState['type'] = 'standard',
  overrides?: Partial<GridTileState>
): GridTileState {
  return {
    id,
    row,
    col,
    letter,
    type,
    isCleared: false,
    ...overrides,
  };
}

function createGridWithBomb(bombRow: number, bombCol: number, gridSize: number = 4): GridTileState[] {
  const tiles: GridTileState[] = [];
  const letters = 'ABCDEFGHIJKLMNOP';

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const id = `${row}-${col}`;
      const letter = letters[row * gridSize + col];
      const isBomb = row === bombRow && col === bombCol;

      tiles.push(createTile(id, row, col, letter, isBomb ? 'bomb' : 'standard'));
    }
  }

  return tiles;
}

// ==============================================
// BOMB ROW HIGHLIGHT PREVIEW TESTS
// ==============================================

describe('Bomb Tile Row Highlight Preview', () => {
  it('should highlight entire row when bomb tile is selected', () => {
    // GIVEN - Grid with bomb at row 1, col 1
    const tiles = createGridWithBomb(1, 1, 4);
    const bombIndex = 1 * 4 + 1; // row 1, col 1 = index 5

    // WHEN - Bomb tile is selected
    const { container } = render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[bombIndex]}
        interactive
      />
    );

    // THEN - All tiles in row 1 should have bomb-row-preview class
    const row1Tiles = container.querySelectorAll('[data-row="1"]');
    expect(row1Tiles).toHaveLength(4);

    // Each tile in row 1 should have the preview highlight
    row1Tiles.forEach((tile) => {
      expect(tile).toHaveClass('bomb-row-preview');
    });
  });

  it('should NOT highlight other rows when bomb is selected', () => {
    // GIVEN - Grid with bomb at row 1
    const tiles = createGridWithBomb(1, 1, 4);
    const bombIndex = 1 * 4 + 1;

    // WHEN - Bomb tile is selected
    const { container } = render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[bombIndex]}
        interactive
      />
    );

    // THEN - Tiles in other rows should NOT have preview class
    const row0Tiles = container.querySelectorAll('[data-row="0"]');
    const row2Tiles = container.querySelectorAll('[data-row="2"]');
    const row3Tiles = container.querySelectorAll('[data-row="3"]');

    row0Tiles.forEach((tile) => {
      expect(tile).not.toHaveClass('bomb-row-preview');
    });
    row2Tiles.forEach((tile) => {
      expect(tile).not.toHaveClass('bomb-row-preview');
    });
    row3Tiles.forEach((tile) => {
      expect(tile).not.toHaveClass('bomb-row-preview');
    });
  });

  it('should remove row highlight when bomb is deselected', () => {
    // GIVEN - Grid with bomb at row 1
    const tiles = createGridWithBomb(1, 1, 4);
    const bombIndex = 1 * 4 + 1;

    // First render with bomb selected
    const { container, rerender } = render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[bombIndex]}
        interactive
      />
    );

    // Verify highlight is applied
    expect(container.querySelector('[data-row="1"]')).toHaveClass('bomb-row-preview');

    // WHEN - Bomb is deselected
    rerender(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[]}
        interactive
      />
    );

    // THEN - Row highlight should be removed
    const row1Tiles = container.querySelectorAll('[data-row="1"]');
    row1Tiles.forEach((tile) => {
      expect(tile).not.toHaveClass('bomb-row-preview');
    });
  });
});

// ==============================================
// BOMB ROW EXPLOSION EFFECT TESTS
// ==============================================

describe('Bomb Row Explosion Visual Effect', () => {
  it('should apply explosion effect to all tiles in bomb row when bomb explodes', () => {
    // GIVEN - Grid with bomb at row 1, col 1 with explode activation effect
    const tiles = createGridWithBomb(1, 1, 4);

    // Set activation effect on bomb tile
    const bombIndex = 1 * 4 + 1;
    tiles[bombIndex].activationEffect = 'explode';

    // ALSO set activation effect on OTHER tiles in the same row to show they're affected
    // Tiles in row 1: indices 4, 5 (bomb), 6, 7
    tiles[4].activationEffect = 'explode'; // row 1, col 0
    tiles[6].activationEffect = 'explode'; // row 1, col 2
    tiles[7].activationEffect = 'explode'; // row 1, col 3

    // WHEN - Render with activation effects
    const { container } = render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[]}
        interactive
      />
    );

    // THEN - All tiles in row 1 should have the explode effect class
    const row1Tiles = container.querySelectorAll('[data-row="1"]');
    row1Tiles.forEach((tile) => {
      expect(tile).toHaveClass('tile-effect-explode');
    });
  });

  it('should render shockwave elements on tiles with explode effect', () => {
    // GIVEN - Grid with explode effect on a row tile
    const tiles = createGridWithBomb(1, 1, 4);
    tiles[4].activationEffect = 'explode'; // row 1, col 0

    // WHEN
    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[]}
        interactive
      />
    );

    // THEN - Shockwave elements should be rendered
    expect(document.querySelector('.tile-explode-shockwave')).toBeInTheDocument();
    expect(document.querySelector('.tile-explode-debris')).toBeInTheDocument();
  });
});

// ==============================================
// BOMB TOOLTIP/BADGE TESTS
// ==============================================

describe('Bomb Tile Tooltip and Badge', () => {
  it('should render bomb tile with row-clear indicator badge', () => {
    // GIVEN - Grid with bomb tile
    const tiles = createGridWithBomb(1, 1, 4);

    // WHEN
    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[]}
        interactive
      />
    );

    // THEN - Bomb badge should have row indicator
    const bombBadge = document.querySelector('[data-row="1"][data-col="1"] .tile-bomb-row-indicator');
    // If badge doesn't exist yet, that's the bug we're fixing
    expect(bombBadge).toBeInTheDocument();
  });

  it('should have accessible description for bomb tile row-clearing behavior', () => {
    // GIVEN - Grid with bomb tile
    const tiles = createGridWithBomb(1, 1, 4);

    // WHEN
    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[]}
        interactive
      />
    );

    // THEN - Bomb tile should have aria-label with bomb tile type (via t() key)
    const bombTile = screen.getByRole('gridcell', { name: /adventure\.tiles\.aria\.bomb/i });
    expect(bombTile).toBeInTheDocument();
  });
});

// ==============================================
// COMBINED BEHAVIOR TESTS
// ==============================================

describe('Bomb Tile Combined Visual Behavior', () => {
  it('should show row preview during selection and apply effects on detonation', () => {
    // GIVEN - Grid with bomb
    const tiles = createGridWithBomb(1, 1, 4);
    const bombIndex = 5; // row 1, col 1

    // WHEN - First selected (preview state)
    const { container, rerender } = render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        selectedIndices={[bombIndex]}
        interactive
      />
    );

    // THEN - Row preview should be visible
    expect(container.querySelector('[data-row="1"]')).toHaveClass('bomb-row-preview');

    // WHEN - After detonation (all row tiles have explode effect)
    const tilesAfterDetonation = [...tiles];
    // Mark all row 1 tiles with explode effect
    for (let i = 4; i <= 7; i++) {
      tilesAfterDetonation[i] = { ...tilesAfterDetonation[i], activationEffect: 'explode' };
    }
    // Mark all row 1 tiles as cleared
    for (let i = 4; i <= 7; i++) {
      tilesAfterDetonation[i] = { ...tilesAfterDetonation[i], isCleared: true };
    }

    rerender(
      <AdventureGrid
        tiles={tilesAfterDetonation}
        gridSize={4}
        selectedIndices={[]}
        interactive
      />
    );

    // THEN - Explosion effect should be visible on all row tiles
    const row1Tiles = container.querySelectorAll('[data-row="1"]');
    row1Tiles.forEach((tile) => {
      expect(tile).toHaveClass('tile-effect-explode');
    });
  });
});
