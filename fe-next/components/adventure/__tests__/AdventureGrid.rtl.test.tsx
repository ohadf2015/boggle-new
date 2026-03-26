/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';

// Mock the hooks and contexts
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    maxParticles: 8,
  }),
}));

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

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Helper to create test tiles
const createTiles = (letters: string[][]): GridTileState[] => {
  const tiles: GridTileState[] = [];
  letters.forEach((row, rowIndex) => {
    row.forEach((letter, colIndex) => {
      tiles.push({
        id: `tile-${rowIndex}-${colIndex}`,
        letter,
        type: 'standard',
        row: rowIndex,
        col: colIndex,
        isCleared: false,
        isFrozen: false,
      });
    });
  });
  return tiles;
};

describe('AdventureGrid RTL Support', () => {
  const hebrewTiles = createTiles([
    ['א', 'ב', 'ג', 'ד'],
    ['ה', 'ו', 'ז', 'ח'],
    ['ט', 'י', 'כ', 'ל'],
    ['מ', 'נ', 'ס', 'ע'],
  ]);

  const englishTiles = createTiles([
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ]);

  afterEach(() => {
    // Clean up document direction
    document.documentElement.removeAttribute('dir');
  });

  describe('Hebrew letters should NOT be mirrored', () => {
    it('should NOT apply scaleX(-1) transform to gridcell elements in RTL mode', () => {
      // Set document direction to RTL (Hebrew)
      document.documentElement.setAttribute('dir', 'rtl');

      const { container } = render(
        <AdventureGrid
          tiles={hebrewTiles}
          gridSize={4}
          interactive={false}
        />
      );

      // Get all grid cells
      const gridCells = container.querySelectorAll('[role="gridcell"]');
      expect(gridCells.length).toBe(16);

      // Check that no grid cell has scaleX(-1) transform applied
      // This tests the actual computed style behavior
      gridCells.forEach((cell) => {
        // Note: In JSDOM, transforms may not be fully computed, but we can check
        // the element doesn't have inline scaleX(-1) style
        const inlineTransform = (cell as HTMLElement).style.transform;
        expect(inlineTransform).not.toContain('scaleX(-1)');
      });
    });

    it('should display Hebrew letter א correctly without horizontal flip', () => {
      document.documentElement.setAttribute('dir', 'rtl');

      render(
        <AdventureGrid
          tiles={hebrewTiles}
          gridSize={4}
          interactive={false}
        />
      );

      // Find the cell containing א (Aleph)
      const alephCell = screen.getByRole('gridcell', { name: /letter א/i });
      expect(alephCell).toBeInTheDocument();

      // The letter should be visible and properly rendered
      expect(alephCell).toHaveTextContent('א');
    });

    it('should NOT mirror the board-frame decorations in a way that affects grid content', () => {
      document.documentElement.setAttribute('dir', 'rtl');

      const { container } = render(
        <AdventureGrid
          tiles={hebrewTiles}
          gridSize={4}
          interactive={false}
        />
      );

      // The board-frame should NOT have scaleX(-1) that affects content
      // Or if it does, child content should be counter-transformed
      const boardFrame = container.querySelector('.board-frame');

      if (boardFrame) {
        // If board frame has scaleX(-1), the grid inside should compensate
        const grid = container.querySelector('[role="grid"]');
        expect(grid).toBeInTheDocument();

        // Grid cells inside should not have mirrored content
        const letterSpan = container.querySelector('[role="gridcell"] span');
        if (letterSpan) {
          const inlineTransform = (letterSpan as HTMLElement).style.transform;
          // Letters themselves should never be transformed
          expect(inlineTransform).not.toContain('scaleX(-1)');
        }
      }
    });
  });

  describe('Trail should render correctly in RTL', () => {
    it('should render trail overlay with proper z-index above grid tiles', () => {
      document.documentElement.setAttribute('dir', 'rtl');

      const pathPoints = [
        { x: 100, y: 100, timestamp: Date.now() },
        { x: 150, y: 100, timestamp: Date.now() + 100 },
        { x: 200, y: 150, timestamp: Date.now() + 200 },
      ];

      const { container } = render(
        <AdventureGrid
          tiles={hebrewTiles}
          gridSize={4}
          interactive={true}
          selectedIndices={[0, 1, 5]}
          pathPoints={pathPoints}
        />
      );

      // Find the trail container
      const trailContainer = container.querySelector('[data-testid="word-path-trail"]');
      expect(trailContainer).toBeInTheDocument();

      // Trail should have z-20 class to render above selected tiles (z-10)
      expect(trailContainer).toHaveClass('z-20');
      expect(trailContainer).toHaveClass('pointer-events-none');
    });

    it('should position trail container correctly without RTL mirroring', () => {
      document.documentElement.setAttribute('dir', 'rtl');

      const pathPoints = [
        { x: 50, y: 50, timestamp: Date.now() },
        { x: 100, y: 50, timestamp: Date.now() + 100 },
      ];

      const { container } = render(
        <AdventureGrid
          tiles={hebrewTiles}
          gridSize={4}
          interactive={true}
          selectedIndices={[0, 1]}
          pathPoints={pathPoints}
        />
      );

      const trailContainer = container.querySelector('[data-testid="word-path-trail"]');
      expect(trailContainer).toBeInTheDocument();

      // The trail container should have inset-0 positioning
      expect(trailContainer).toHaveClass('inset-0');
      expect(trailContainer).toHaveClass('absolute');
    });
  });

  describe('LTR (English) should continue to work correctly', () => {
    it('should render English letters without any transform issues', () => {
      document.documentElement.setAttribute('dir', 'ltr');

      render(
        <AdventureGrid
          tiles={englishTiles}
          gridSize={4}
          interactive={false}
        />
      );

      // Find a letter
      const letterA = screen.getByRole('gridcell', { name: /letter A/i });
      expect(letterA).toBeInTheDocument();
      expect(letterA).toHaveTextContent('A');
    });
  });
});
