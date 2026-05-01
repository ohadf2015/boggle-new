/**
 * AdventureGrid Tests
 *
 * Tests for the adventure mode grid wrapper component
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState, TileType } from '@/types/adventure';

// Mock geometry module - default behavior allows all selections
vi.mock('../adventureGridGeometry', () => ({
  measureAdventureGrid: vi.fn().mockReturnValue({
    gridRect: { left: 0, top: 0, width: 256, height: 256, right: 256, bottom: 256, x: 0, y: 0, toJSON: () => ({}) },
    cellWidth: 60,
    cellHeight: 60,
    gridPaddingLeft: 0,
    gridPaddingTop: 0,
    gapX: 4,
    gapY: 4,
    cellWithGapWidth: 64,
    cellWithGapHeight: 64,
    timestamp: Date.now(),
  }),
  getCellAtPosition: vi.fn().mockImplementation((touchX: number, touchY: number, tiles: GridTileState[], gridSize: number) => {
    // Simple mock: calculate cell based on position
    const col = Math.floor(touchX / 64);
    const row = Math.floor(touchY / 64);
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
    const index = row * gridSize + col;
    const tile = tiles[index];
    if (!tile) return null;
    return {
      row,
      col,
      letter: tile.letter,
      distanceFromCenter: 5, // Always close to center (allows selection)
      cellRadius: 30,
    };
  }),
  getTileIndex: (row: number, col: number, gridSize: number) => row * gridSize + col,
  isWithinSelectionThreshold: vi.fn().mockReturnValue(true), // Allow all selections by default
  isDiagonalMove: vi.fn().mockReturnValue(false),
  isAdjacentCell: vi.fn().mockReturnValue(true), // Allow all adjacency by default
  hasExceededDeadzone: vi.fn().mockReturnValue(true), // Always exceed deadzone by default
  DEADZONE_THRESHOLD: 8,
  CELL_SELECTION_THRESHOLD: 0.85,
  DIAGONAL_SELECTION_THRESHOLD: 0.95,
}));

// ==============================================
// TEST FIXTURES
// ==============================================

function createMockTiles(size: number = 4): GridTileState[] {
  const letters = 'ABCDEFGHIJKLMNOP';
  const tiles: GridTileState[] = [];

  for (let i = 0; i < size * size; i++) {
    tiles.push({
      id: `tile-${i}`,
      letter: letters[i],
      type: 'standard',
      row: Math.floor(i / size),
      col: i % size,
      isCleared: false,
      isFrozen: false,
    });
  }

  return tiles;
}

function createTileWithType(
  index: number,
  type: TileType,
  extra: Partial<GridTileState> = {}
): GridTileState {
  return {
    id: `tile-${index}`,
    letter: 'A',
    type,
    row: Math.floor(index / 4),
    col: index % 4,
    isCleared: false,
    isFrozen: type === 'ice' ? true : false,
    ...extra,
  };
}

// ==============================================
// TESTS
// ==============================================

describe('AdventureGrid', () => {
  describe('Rendering', () => {
    it('should render the grid with all tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      expect(screen.getByRole('grid')).toBeInTheDocument();
      // Should have 16 cells (4x4)
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBe(16);
    });

    it('should display correct letters on tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });
  });

  describe('Special Tile Types', () => {
    it('should apply gold styling to gold tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[0] = createTileWithType(0, 'gold');

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveClass('tile-gold');
    });

    it('should apply ice styling to ice tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[5] = createTileWithType(5, 'ice');

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[5]).toHaveClass('tile-ice');
    });

    it('should apply bomb styling to bomb tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[10] = createTileWithType(10, 'bomb');

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[10]).toHaveClass('tile-bomb');
    });

    // Note: 'rainbow' tile type is not in current TileType; test omitted.

    it('should show frozen overlay on frozen ice tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[3] = createTileWithType(3, 'ice', { isFrozen: true });

      // WHEN
      const { container } = render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      expect(container.querySelector('.tile-frozen')).toBeInTheDocument();
    });
  });

  describe('Cleared Tiles', () => {
    it('should apply cleared styling to cleared tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[7] = { ...tiles[7], isCleared: true };

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[7]).toHaveClass('tile-cleared');
    });

    it('should not allow interaction with cleared tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[0] = { ...tiles[0], isCleared: true };
      const onTileSelect = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onTileSelect={onTileSelect}
          interactive
        />
      );

      // THEN
      const cells = screen.getAllByRole('gridcell');
      fireEvent.click(cells[0]);
      expect(onTileSelect).not.toHaveBeenCalled();
    });
  });

  describe('Tile Selection', () => {
    it('should highlight selected tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const selectedIndices = [0, 1, 5];

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={selectedIndices}
        />
      );

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveClass('tile-selected-enhanced');
      expect(cells[1]).toHaveClass('tile-selected-enhanced');
      expect(cells[5]).toHaveClass('tile-selected-enhanced');
      expect(cells[2]).not.toHaveClass('tile-selected-enhanced');
    });

    it('should call onTileSelect when tile is clicked', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onTileSelect = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onTileSelect={onTileSelect}
          interactive
        />
      );

      // THEN
      const cells = screen.getAllByRole('gridcell');
      fireEvent.click(cells[5]);
      expect(onTileSelect).toHaveBeenCalledWith(5, tiles[5]);
    });
  });

  describe('Word Formation', () => {
    it('should display formed word based on selected tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[0] = { ...tiles[0], letter: 'C' };
      tiles[1] = { ...tiles[1], letter: 'A' };
      tiles[2] = { ...tiles[2], letter: 'T' };
      const selectedIndices = [0, 1, 2];

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={selectedIndices}
          showWordPreview
        />
      );

      // THEN
      expect(screen.getByText('CAT')).toBeInTheDocument();
    });

    it('should call onDragEnd when drag ends with selected tiles', () => {
      // GIVEN — word submission on mouseUp is routed through onDragEnd
      // (not directly via onWordSubmit on the grid div)
      const tiles = createMockTiles(4);
      const onDragEnd = vi.fn();
      const selectedIndices = [0, 1, 2];

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={selectedIndices}
          onDragEnd={onDragEnd}
          interactive
        />
      );

      // Start a drag then release — onDragEnd fires via useGridGestures
      const firstCell = screen.getAllByRole('gridcell')[0];
      fireEvent.mouseDown(firstCell);
      const grid = screen.getByRole('grid');
      fireEvent.mouseUp(grid);

      // THEN
      expect(onDragEnd).toHaveBeenCalled();
    });
  });

  describe('Grid Size Variants', () => {
    it('should render 5x5 grid correctly', () => {
      // GIVEN
      const tiles = createMockTiles(5);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={5} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBe(25);
    });

    it('should apply correct grid layout via inline style', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      const { container } = render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const grid = container.querySelector('.adventure-grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible grid role', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('should have accessible cell roles', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells.length).toBe(16);
    });

    it('should have aria-labels on special tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[0] = createTileWithType(0, 'gold');

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-label', expect.stringContaining('gold'));
    });

    it('A11y Critical-2: aria-label includes "cleared" state for cleared tiles', () => {
      const tiles = createMockTiles(4);
      tiles[0] = { ...tiles[0], isCleared: true };

      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-label', expect.stringContaining('cleared'));
    });

    it('A11y Critical-2: aria-label includes "frozen" state for frozen tiles', () => {
      const tiles = createMockTiles(4);
      // Ice tiles are isFrozen by default in createTileWithType
      tiles[0] = createTileWithType(0, 'ice');

      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-label', expect.stringContaining('frozen'));
    });

    it('A11y Critical-2: aria-label keeps both type and state (gold + cleared)', () => {
      const tiles = createMockTiles(4);
      tiles[0] = { ...createTileWithType(0, 'gold'), isCleared: true };

      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      const cells = screen.getAllByRole('gridcell');
      const label = cells[0].getAttribute('aria-label') ?? '';
      expect(label).toMatch(/gold/);
      expect(label).toMatch(/cleared/);
    });

    it('should indicate selected state via aria-selected', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const selectedIndices = [0, 1];

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={selectedIndices}
        />
      );

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveAttribute('aria-selected', 'true');
      expect(cells[1]).toHaveAttribute('aria-selected', 'true');
      expect(cells[2]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Cascade Animation', () => {
    it('should apply cascade delay to tiles with cascadeDelay', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[0] = { ...tiles[0], cascadeDelay: 100 };
      tiles[1] = { ...tiles[1], cascadeDelay: 200 };

      // WHEN
      const { container } = render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[0]).toHaveStyle({ animationDelay: '100ms' });
      expect(cells[1]).toHaveStyle({ animationDelay: '200ms' });
    });
  });

  describe('Disabled State', () => {
    it('should disable all interactions when disabled prop is true', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onTileSelect = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onTileSelect={onTileSelect}
          interactive
          disabled
        />
      );

      // THEN
      const cells = screen.getAllByRole('gridcell');
      fireEvent.click(cells[0]);
      expect(onTileSelect).not.toHaveBeenCalled();
    });

    it('should apply disabled styling when disabled', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      const { container } = render(
        <AdventureGrid tiles={tiles} gridSize={4} disabled />
      );

      // THEN
      const grid = container.querySelector('.adventure-grid');
      expect(grid).toHaveClass('adventure-grid-disabled');
    });
  });

  describe('Drag Selection', () => {
    it('should call onDragStart when mouse is pressed on tile', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragStart = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragStart={onDragStart}
          interactive
        />
      );

      const cells = screen.getAllByRole('gridcell');
      fireEvent.mouseDown(cells[0]);

      // THEN
      expect(onDragStart).toHaveBeenCalledWith(0, tiles[0]);
    });

    it('should call onDragEnter when mouse enters tile during drag', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragEnter = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragEnter={onDragEnter}
          interactive
        />
      );

      const cells = screen.getAllByRole('gridcell');
      // Simulate drag: mouseDown on cell 0, then mouseEnter on cell 1
      fireEvent.mouseDown(cells[0]);
      fireEvent.mouseEnter(cells[1]);

      // THEN
      expect(onDragEnter).toHaveBeenCalledWith(1, tiles[1]);
    });

    it('should not call onDragEnter when not dragging', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragEnter = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragEnter={onDragEnter}
          interactive
        />
      );

      const cells = screen.getAllByRole('gridcell');
      // Just mouseEnter without mouseDown
      fireEvent.mouseEnter(cells[1]);

      // THEN
      expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('should call onDragEnd when mouse is released', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragEnd = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragEnd={onDragEnd}
          interactive
        />
      );

      const cells = screen.getAllByRole('gridcell');
      fireEvent.mouseDown(cells[0]);
      fireEvent.mouseUp(cells[0]);

      // THEN
      expect(onDragEnd).toHaveBeenCalled();
    });

    it('should not call drag handlers when disabled', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragStart = vi.fn();
      const onDragEnter = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          interactive
          disabled
        />
      );

      const cells = screen.getAllByRole('gridcell');
      fireEvent.mouseDown(cells[0]);
      fireEvent.mouseEnter(cells[1]);

      // THEN
      expect(onDragStart).not.toHaveBeenCalled();
      expect(onDragEnter).not.toHaveBeenCalled();
    });

    it('should handle touch events for drag selection', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragStart = vi.fn();

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragStart={onDragStart}
          interactive
        />
      );

      const cells = screen.getAllByRole('gridcell');
      // Touch events must include touches array with coordinates
      fireEvent.touchStart(cells[0], {
        touches: [{ clientX: 50, clientY: 50 }],
      });

      // THEN
      expect(onDragStart).toHaveBeenCalledWith(0, tiles[0]);
    });

    it('should handle touch move to select tiles during drag', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragStart = vi.fn();
      const onDragEnter = vi.fn();

      // Mock document.elementFromPoint to return grid cells
      const originalElementFromPoint = document.elementFromPoint;

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          interactive
        />
      );

      const grid = screen.getByRole('grid');
      const cells = screen.getAllByRole('gridcell');

      // Start drag on first cell with proper touch coordinates
      fireEvent.touchStart(cells[0], {
        touches: [{ clientX: 50, clientY: 50 }],
      });
      expect(onDragStart).toHaveBeenCalledWith(0, tiles[0]);

      // Mock elementFromPoint to return second cell (fallback only)
      document.elementFromPoint = vi.fn().mockReturnValue(cells[1]);

      // Simulate touch move to cell 1 (row 0, col 1)
      // With 64px cell size: col 1 center = 64 + 30 = 94, row 0 center = 30
      fireEvent.touchMove(grid, {
        touches: [{ clientX: 94, clientY: 30 }],
      });

      // THEN
      expect(onDragEnter).toHaveBeenCalledWith(1, tiles[1]);

      // Restore original
      document.elementFromPoint = originalElementFromPoint;
    });

    it('should not call onDragEnter twice for same tile during touch move', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onDragStart = vi.fn();
      const onDragEnter = vi.fn();

      const originalElementFromPoint = document.elementFromPoint;

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          interactive
        />
      );

      const grid = screen.getByRole('grid');
      const cells = screen.getAllByRole('gridcell');

      // Start drag with proper touch coordinates
      fireEvent.touchStart(cells[0], {
        touches: [{ clientX: 50, clientY: 50 }],
      });

      // Mock elementFromPoint to return second cell (fallback only)
      document.elementFromPoint = vi.fn().mockReturnValue(cells[1]);

      // Simulate multiple touch moves on same cell (cell 1 = row 0, col 1)
      // All coordinates within cell 1: x in [64, 127], y in [0, 63]
      fireEvent.touchMove(grid, { touches: [{ clientX: 94, clientY: 30 }] });
      fireEvent.touchMove(grid, { touches: [{ clientX: 95, clientY: 31 }] });
      fireEvent.touchMove(grid, { touches: [{ clientX: 96, clientY: 32 }] });

      // THEN - should only be called once despite multiple touch moves
      expect(onDragEnter).toHaveBeenCalledTimes(1);

      // Restore original
      document.elementFromPoint = originalElementFromPoint;
    });
  });
});
