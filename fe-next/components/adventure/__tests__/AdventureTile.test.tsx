// @vitest-environment jsdom
/**
 * AdventureTile Component Tests
 *
 * TDD RED Phase: Tests for individual tile rendering extracted from AdventureGrid
 *
 * Tests cover:
 * - Tile selection states
 * - Special tile type rendering (gold, ice, bomb, rainbow, chain, time)
 * - Cascade animations
 * - World theming
 * - Accessibility (ARIA labels)
 * - Performance (reduced motion)
 * - Activation effects
 * - Event handlers
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdventureThemeContext } from '@/contexts/AdventureThemeContext';
import type { GridTileState } from '@/types/adventure';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, onClick, onMouseDown, onMouseEnter, onTouchStart, ...props }: any) =>
      React.createElement(
        'div',
        {
          className,
          onClick,
          onMouseDown,
          onMouseEnter,
          onTouchStart,
          'data-motion': 'true',
          ...props,
        },
        children
      ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock hooks
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

vi.mock('@/hooks/useCascadeAnimation', () => ({
  useCascadeAnimation: () => ({
    delays: new Map(),
    startCascade: vi.fn(),
  }),
}));

// Mock TileBadge component
vi.mock('../TileBadge', () => ({
  TileBadge: ({ type }: { type: string }) => (
    <div data-testid={`tile-badge-${type}`}>Badge: {type}</div>
  ),
}));

// Import component AFTER mocks
import { AdventureTile } from '../AdventureTile';

describe('AdventureTile', () => {
  const baseTile: GridTileState = {
    id: 'tile-0',
    letter: 'A',
    row: 0,
    col: 0,
    type: 'standard',
    isCleared: false,
    isFrozen: false,
  };

  const defaultProps = {
    tile: baseTile,
    index: 0,
    isSelected: false,
    isHintHighlighted: false,
    canInteract: true,
    worldId: 1,
    bombRowPreview: null,
    showCascade: false,
    cascadeComplete: true,
    getCascadeDelay: () => 0,
    prefersReducedMotion: false,
    enableComplexAnimations: true,
    onTileClick: vi.fn(),
    onTileDragStart: vi.fn(),
    onTileDragEnter: vi.fn(),
    getTileAriaLabel: (tile: GridTileState) => `Letter ${tile.letter}`,
  };

  describe('Basic Rendering', () => {
    it('should render tile with letter', () => {
      render(<AdventureTile {...defaultProps} />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should have role="gridcell"', () => {
      const { container } = render(<AdventureTile {...defaultProps} />);
      const gridcell = container.querySelector('[role="gridcell"]');
      expect(gridcell).toBeInTheDocument();
    });

    it('should have correct aria-label', () => {
      const { container } = render(<AdventureTile {...defaultProps} />);
      const gridcell = container.querySelector('[role="gridcell"]');
      expect(gridcell).toHaveAttribute('aria-label', 'Letter A');
    });

    it('should have data-row and data-col attributes', () => {
      const { container } = render(<AdventureTile {...defaultProps} />);
      const gridcell = container.querySelector('[role="gridcell"]');
      expect(gridcell).toHaveAttribute('data-row', '0');
      expect(gridcell).toHaveAttribute('data-col', '0');
    });

    it('should render as framer m.div', () => {
      const { container } = render(<AdventureTile {...defaultProps} />);
      const motionDiv = container.querySelector('[data-motion="true"]');
      expect(motionDiv).toBeInTheDocument();
    });
  });

  describe('Selection States', () => {
    it('should apply selected class when isSelected=true', () => {
      const { container } = render(<AdventureTile {...defaultProps} isSelected={true} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-selected-enhanced');
    });

    it('should have aria-selected=true when selected', () => {
      const { container } = render(<AdventureTile {...defaultProps} isSelected={true} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveAttribute('aria-selected', 'true');
    });

    it('should have aria-selected=false when not selected', () => {
      const { container } = render(<AdventureTile {...defaultProps} isSelected={false} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveAttribute('aria-selected', 'false');
    });

    it('should NOT apply selected class when isSelected=false', () => {
      const { container } = render(<AdventureTile {...defaultProps} isSelected={false} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('tile-selected-enhanced');
    });
  });

  describe('Tile Types', () => {
    it('should apply tile-gold class for gold tiles', () => {
      const goldTile = { ...baseTile, type: 'gold' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={goldTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-gold');
    });

    it('should render gold tile with yellow gradient', () => {
      const goldTile = { ...baseTile, type: 'gold' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={goldTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile?.className).toContain('from-neo-yellow');
    });

    it('should apply tile-ice class for ice tiles', () => {
      const iceTile = { ...baseTile, type: 'ice' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={iceTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-ice');
    });

    it('should apply tile-bomb class for bomb tiles', () => {
      const bombTile = { ...baseTile, type: 'bomb' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={bombTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-bomb');
    });

    // Note: 'rainbow' and 'chain' tile types are not in current TileType; tests omitted.

    it('should apply tile-time class for time tiles', () => {
      const timeTile = { ...baseTile, type: 'time' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={timeTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-time');
    });
  });

  describe('TileBadge Integration', () => {
    it('should render TileBadge component', () => {
      render(<AdventureTile {...defaultProps} />);
      expect(screen.getByTestId('tile-badge-standard')).toBeInTheDocument();
    });

    it('should pass tile type to TileBadge', () => {
      const goldTile = { ...baseTile, type: 'gold' as const };
      render(<AdventureTile {...defaultProps} tile={goldTile} />);
      expect(screen.getByTestId('tile-badge-gold')).toBeInTheDocument();
    });
  });

  describe('Standard Tile Styling', () => {
    it('should apply letter-tile-gradient class to standard tiles', () => {
      const { container } = render(<AdventureTile {...defaultProps} worldId={1} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('letter-tile-gradient');
    });

    it('should apply text-neo-black to standard tiles', () => {
      const { container } = render(<AdventureTile {...defaultProps} worldId={2} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('text-neo-black');
    });

    it('should use same gradient class regardless of worldId', () => {
      const { container } = render(<AdventureTile {...defaultProps} worldId={3} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('letter-tile-gradient');
    });

    it('should NOT apply letter-tile-gradient to special tiles (gold)', () => {
      const goldTile = { ...baseTile, type: 'gold' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={goldTile} worldId={1} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('letter-tile-gradient');
    });

    it('should have responsive border radius via inline style', () => {
      const { container } = render(<AdventureTile {...defaultProps} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile?.getAttribute('style')).toContain('clamp(4px, 1cqi, 8px)');
    });

    it('should have font-size from CSS variable', () => {
      const { container } = render(<AdventureTile {...defaultProps} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveStyle({ fontSize: 'var(--cell-font-size)' });
    });
  });

  describe('Enhanced Effects (Complex Animations)', () => {
    it('should apply enhanced class for gold tiles when complex animations enabled', () => {
      const goldTile = { ...baseTile, type: 'gold' as const };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={goldTile} enableComplexAnimations={true} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-gold-enhanced');
    });

    it('should NOT apply enhanced class when complex animations disabled', () => {
      const goldTile = { ...baseTile, type: 'gold' as const };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={goldTile} enableComplexAnimations={false} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('tile-gold-enhanced');
    });

    it('should apply enhanced class for ice tiles', () => {
      const iceTile = { ...baseTile, type: 'ice' as const };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={iceTile} enableComplexAnimations={true} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-ice-enhanced');
    });

    it('should NOT apply enhanced class for cleared ice tiles', () => {
      const iceTile = { ...baseTile, type: 'ice' as const, isCleared: true };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={iceTile} enableComplexAnimations={true} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('tile-ice-enhanced');
    });

    it('should apply enhanced class for bomb tiles', () => {
      const bombTile = { ...baseTile, type: 'bomb' as const };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={bombTile} enableComplexAnimations={true} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-bomb-enhanced');
    });

    // Note: 'rainbow' and 'chain' enhanced classes not supported; tests omitted.

    it('should apply enhanced class for time tiles', () => {
      const timeTile = { ...baseTile, type: 'time' as const };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={timeTile} enableComplexAnimations={true} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-time-enhanced');
    });
  });

  describe('Activation Effects', () => {
    it('should apply melt activation effect class', () => {
      const iceTile = { ...baseTile, type: 'ice' as const, activationEffect: 'melt' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={iceTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-effect-melt');
    });

    it('should apply explode activation effect class', () => {
      const bombTile = { ...baseTile, type: 'bomb' as const, activationEffect: 'explode' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={bombTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-effect-explode');
    });

    it('should apply collect activation effect class', () => {
      const goldTile = { ...baseTile, type: 'gold' as const, activationEffect: 'collect' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={goldTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-effect-collect');
    });

    it('should apply timeBonus activation effect class', () => {
      const timeTile = { ...baseTile, type: 'time' as const, activationEffect: 'timeBonus' as const };
      const { container } = render(<AdventureTile {...defaultProps} tile={timeTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-effect-timeBonus');
    });
  });

  describe('State Classes', () => {
    it('should apply cleared class when tile is cleared', () => {
      const clearedTile = { ...baseTile, isCleared: true };
      const { container } = render(<AdventureTile {...defaultProps} tile={clearedTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-cleared');
    });

    it('should apply frozen class for frozen ice tiles', () => {
      const frozenTile = { ...baseTile, type: 'ice' as const, isFrozen: true };
      const { container } = render(<AdventureTile {...defaultProps} tile={frozenTile} />);
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('tile-frozen');
    });

    it('should NOT apply frozen class for non-ice tiles', () => {
      const tile = { ...baseTile, type: 'gold' as const, isFrozen: true };
      const { container } = render(<AdventureTile {...defaultProps} tile={tile} />);
      const tileElement = container.querySelector('[role="gridcell"]');
      expect(tileElement).not.toHaveClass('tile-frozen');
    });
  });

  describe('Bomb Row Preview', () => {
    it('should apply bomb-row-preview class when tile in bomb row', () => {
      const tileInRow1 = { ...baseTile, row: 1, col: 2 };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={tileInRow1} bombRowPreview={1} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('bomb-row-preview');
    });

    it('should NOT apply bomb-row-preview class when tile NOT in bomb row', () => {
      const tileInRow2 = { ...baseTile, row: 2, col: 1 };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={tileInRow2} bombRowPreview={1} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('bomb-row-preview');
    });

    it('should NOT apply bomb-row-preview when bombRowPreview is null', () => {
      const tileInRow1 = { ...baseTile, row: 1, col: 2 };
      const { container } = render(
        <AdventureTile {...defaultProps} tile={tileInRow1} bombRowPreview={null} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('bomb-row-preview');
    });
  });

  describe('Hint Highlighting', () => {
    it('should apply hint highlight classes when isHintHighlighted=true and NOT selected', () => {
      const { container } = render(
        <AdventureTile {...defaultProps} isHintHighlighted={true} isSelected={false} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).toHaveClass('bg-neo-lime');
      expect(tile).toHaveClass('text-neo-black');
      expect(tile).toHaveClass('z-10');
      expect(tile).toHaveClass('animate-pulse');
    });

    it('should NOT apply hint highlight when tile is selected', () => {
      const { container } = render(
        <AdventureTile {...defaultProps} isHintHighlighted={true} isSelected={true} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      // Should not have hint classes (isSelected takes priority)
      expect(tile).not.toHaveClass('animate-pulse');
    });

    it('should NOT apply hint highlight when isHintHighlighted=false', () => {
      const { container } = render(
        <AdventureTile {...defaultProps} isHintHighlighted={false} isSelected={false} />
      );
      const tile = container.querySelector('[role="gridcell"]');
      expect(tile).not.toHaveClass('animate-pulse');
    });
  });

  describe('Event Handlers', () => {
    it('should call onTileClick when tile is clicked', () => {
      const onTileClick = vi.fn();
      const { container } = render(<AdventureTile {...defaultProps} onTileClick={onTileClick} />);
      const tile = container.querySelector('[role="gridcell"]');
      fireEvent.click(tile!);
      expect(onTileClick).toHaveBeenCalledWith(0, baseTile);
    });

    it('should call onTileDragStart when mouse pressed', () => {
      const onTileDragStart = vi.fn();
      const { container } = render(<AdventureTile {...defaultProps} onTileDragStart={onTileDragStart} />);
      const tile = container.querySelector('[role="gridcell"]');
      fireEvent.mouseDown(tile!);
      expect(onTileDragStart).toHaveBeenCalled();
    });

    it('should call onTileDragEnter when mouse enters', () => {
      const onTileDragEnter = vi.fn();
      const { container } = render(<AdventureTile {...defaultProps} onTileDragEnter={onTileDragEnter} />);
      const tile = container.querySelector('[role="gridcell"]');
      fireEvent.mouseEnter(tile!);
      expect(onTileDragEnter).toHaveBeenCalledWith(0, baseTile);
    });

    it('should call onTileDragStart when touch starts', () => {
      const onTileDragStart = vi.fn();
      const { container } = render(<AdventureTile {...defaultProps} onTileDragStart={onTileDragStart} />);
      const tile = container.querySelector('[role="gridcell"]');
      fireEvent.touchStart(tile!);
      expect(onTileDragStart).toHaveBeenCalled();
    });
  });

  describe('Cascade Animation', () => {
    it('should use cascade delay when showCascade=true', () => {
      const getCascadeDelay = vi.fn(() => 50);
      render(
        <AdventureTile
          {...defaultProps}
          showCascade={true}
          cascadeComplete={false}
          getCascadeDelay={getCascadeDelay}
        />
      );
      expect(getCascadeDelay).toHaveBeenCalledWith(0, 0); // tile at row=0, col=0
    });
  });
});
