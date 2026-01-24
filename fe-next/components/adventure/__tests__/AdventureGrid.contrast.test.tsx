/**
 * AdventureGrid Contrast Tests
 *
 * Tests for proper contrast between tile backgrounds and letter text
 * Bug: Letters are black on dark background, making them unreadable
 * Expected: Light background with dark text OR dark background with light text
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';

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

// ==============================================
// TESTS
// ==============================================

describe('AdventureGrid Contrast', () => {
  describe('Standard Tile Contrast', () => {
    it('should have light background on standard tiles for proper contrast', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      const firstCell = cells[0];

      // Standard tiles must have light background gradient
      // This ensures black text (text-neo-black) is readable
      expect(firstCell).toHaveClass('bg-gradient-to-br');
      expect(firstCell).toHaveClass('from-neo-white');
    });

    it('should have proper text color on standard tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      const firstCell = cells[0];

      // Standard tiles must have dark text for readability on light background
      expect(firstCell).toHaveClass('text-neo-black');
    });

    it('should apply world theming WITHOUT overriding base background', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      const firstCell = cells[0];

      // World theming classes should coexist with background gradient
      // The texture is an overlay, not a replacement for the background
      expect(firstCell).toHaveClass('tile-texture-meadows');
      expect(firstCell).toHaveClass('from-neo-white'); // Must still have light background
    });
  });

  describe('Selection Visual Feedback', () => {
    it('should have visible ring on selected tiles', () => {
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
      // Enhanced selection with thicker ring for better visibility
      expect(cells[0]).toHaveClass('ring-4');
      // Using lime for better visibility against world theming
      expect(cells[0]).toHaveClass('ring-neo-lime');
    });

    it('should scale up selected tiles for visual emphasis', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const selectedIndices = [0];

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
      // Framer motion applies scale via style, check the class indicates selection
      expect(cells[0]).toHaveClass('tile-selected-enhanced');
      // Higher z-index (z-20) for better layering above other tiles
      expect(cells[0]).toHaveClass('z-20');
    });
  });
});
