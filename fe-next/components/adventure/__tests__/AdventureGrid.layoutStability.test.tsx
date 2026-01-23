/**
 * AdventureGrid Layout Stability Tests
 *
 * Tests for ensuring the grid layout remains stable when word preview
 * and feedback elements appear/disappear.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';

// Mock geometry module
jest.mock('../adventureGridGeometry', () => ({
  measureAdventureGrid: jest.fn().mockReturnValue({
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
  getCellAtPosition: jest.fn().mockReturnValue(null),
  getTileIndex: (row: number, col: number, gridSize: number) => row * gridSize + col,
  isWithinSelectionThreshold: jest.fn().mockReturnValue(true),
  isDiagonalMove: jest.fn().mockReturnValue(false),
  hasExceededDeadzone: jest.fn().mockReturnValue(true),
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

// ==============================================
// TESTS
// ==============================================

describe('AdventureGrid Layout Stability', () => {
  describe('Word Preview Space Reservation', () => {
    it('should reserve space for word preview even when no word is formed', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN - render with showWordPreview but no selection
      const { container } = render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={[]}
          showWordPreview
        />
      );

      // THEN - should have a word preview container with minimum height
      const wordPreviewContainer = container.querySelector('[data-testid="word-preview-container"]');
      expect(wordPreviewContainer).toBeInTheDocument();
      expect(wordPreviewContainer).toHaveClass('min-h-[44px]');
    });

    it('should maintain consistent height when word appears', () => {
      // GIVEN
      const tiles = createMockTiles(4);
      const selectedIndices = [0, 1, 2];

      // WHEN - render with word formed
      const { container, rerender } = render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={[]}
          showWordPreview
        />
      );

      const containerBefore = container.querySelector('[data-testid="word-preview-container"]');
      const heightBefore = containerBefore?.className;

      // Rerender with selection
      rerender(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={selectedIndices}
          showWordPreview
        />
      );

      const containerAfter = container.querySelector('[data-testid="word-preview-container"]');
      const heightAfter = containerAfter?.className;

      // THEN - container classes should include min-h in both cases
      expect(heightBefore).toContain('min-h-[44px]');
      expect(heightAfter).toContain('min-h-[44px]');
    });

    it('should show word preview text when word is formed', () => {
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

    it('should have invisible placeholder when no word is formed but showWordPreview is true', () => {
      // GIVEN
      const tiles = createMockTiles(4);

      // WHEN
      const { container } = render(
        <AdventureGrid
          tiles={tiles}
          gridSize={4}
          selectedIndices={[]}
          showWordPreview
        />
      );

      // THEN - placeholder should exist but be invisible
      const placeholder = container.querySelector('[data-testid="word-preview-placeholder"]');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveClass('invisible');
    });
  });
});
