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

    it('should apply rainbow styling to rainbow tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      tiles[15] = createTileWithType(15, 'rainbow');

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      expect(cells[15]).toHaveClass('tile-rainbow');
    });

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
      const onTileSelect = jest.fn();

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
      expect(cells[0]).toHaveClass('tile-selected');
      expect(cells[1]).toHaveClass('tile-selected');
      expect(cells[5]).toHaveClass('tile-selected');
      expect(cells[2]).not.toHaveClass('tile-selected');
    });

    it('should call onTileSelect when tile is clicked', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onTileSelect = jest.fn();

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

    it('should call onWordSubmit when word is submitted', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const onWordSubmit = jest.fn();
      const selectedIndices = [0, 1, 2];

      // WHEN
      render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={selectedIndices}
          onWordSubmit={onWordSubmit}
          interactive
        />
      );

      // Simulate word submission (e.g., by releasing touch/mouse)
      const grid = screen.getByRole('grid');
      fireEvent.mouseUp(grid);

      // THEN
      expect(onWordSubmit).toHaveBeenCalledWith('ABC', selectedIndices);
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

    it('should apply correct grid layout classes', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      const { container } = render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const grid = container.querySelector('.adventure-grid');
      expect(grid).toHaveClass('grid-cols-4');
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
      const onTileSelect = jest.fn();

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
});
