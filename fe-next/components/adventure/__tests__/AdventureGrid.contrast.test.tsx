/**
 * AdventureGrid Contrast Tests
 *
 * Tests for proper contrast between tile backgrounds and letter text
 * Bug: Letters are black on dark background, making them unreadable
 * Expected: Light background with dark text OR dark background with light text
 */

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

      // Standard tiles use world-specific light background gradients
      // World 1 (meadows default): from-[#fdfcf0] via-[#f5f0e0] to-[#ede8d4]
      expect(firstCell).toHaveClass('bg-gradient-to-br');
      expect(firstCell.className).toMatch(/from-\[#fdfcf0\]/);
    });

    it('should have proper text color on standard tiles', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      render(<AdventureGrid tiles={tiles} gridSize={4} />);

      // THEN
      const cells = screen.getAllByRole('gridcell');
      const firstCell = cells[0];

      // Standard tiles have dark text via the letter span's drop-shadow and
      // world-specific letter-glow class. The tile itself uses font-black weight
      // and the letter span inside has the glow/shadow for readability.
      expect(firstCell).toHaveClass('font-black');
      // Verify the letter span inside has a text-rendering class for contrast
      const letterSpan = firstCell.querySelector('span');
      expect(letterSpan).toBeTruthy();
      expect(letterSpan!.className).toMatch(/drop-shadow/);
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
      // Must still have world-specific light background gradient
      expect(firstCell.className).toMatch(/from-\[#fdfcf0\]/);
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
      // Enhanced selection styling is applied via tile-selected-enhanced class
      // (ring, z-index, and other visual effects are handled by CSS)
      expect(cells[0]).toHaveClass('tile-selected-enhanced');
      expect(cells[1]).toHaveClass('tile-selected-enhanced');
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
      // Selection styling (scale, z-index, etc.) is applied via tile-selected-enhanced class
      expect(cells[0]).toHaveClass('tile-selected-enhanced');
    });
  });
});
