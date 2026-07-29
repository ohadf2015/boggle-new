/**
 * AdventureGrid Trail Integration Tests
 *
 * Tests WordPathTrail integration into AdventureGrid.
 * Verifies trail rendering, props passing, and data attributes.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';

// Mock WordPathTrail component
vi.mock('@/components/animations/WordPathTrail', () => {
  const WordPathTrail = ({ points, isValid, wasSubmitted }: any) => (
    <div
      data-testid="word-path-trail-mock"
      data-points={JSON.stringify(points)}
      data-is-valid={String(isValid)}
      data-was-submitted={String(wasSubmitted)}
    />
  );
  WordPathTrail.displayName = 'WordPathTrail';
  return { WordPathTrail };
});

// Note: useDevicePerformance is mocked globally in jest.setup.js

describe('AdventureGrid - WordPathTrail Integration', () => {
  // Test tile data
  const mockTiles: GridTileState[] = [
    { id: 'tile-0-0', letter: 'A', row: 0, col: 0, type: 'standard', isCleared: false },
    { id: 'tile-0-1', letter: 'B', row: 0, col: 1, type: 'standard', isCleared: false },
    { id: 'tile-0-2', letter: 'C', row: 0, col: 2, type: 'standard', isCleared: false },
    { id: 'tile-1-0', letter: 'D', row: 1, col: 0, type: 'standard', isCleared: false },
    { id: 'tile-1-1', letter: 'E', row: 1, col: 1, type: 'standard', isCleared: false },
    { id: 'tile-1-2', letter: 'F', row: 1, col: 2, type: 'standard', isCleared: false },
    { id: 'tile-2-0', letter: 'G', row: 2, col: 0, type: 'standard', isCleared: false },
    { id: 'tile-2-1', letter: 'H', row: 2, col: 1, type: 'standard', isCleared: false },
    { id: 'tile-2-2', letter: 'I', row: 2, col: 2, type: 'standard', isCleared: false },
  ];

  const mockPathPoints = [
    { x: 50, y: 50, timestamp: 1000 },
    { x: 100, y: 50, timestamp: 1100 },
    { x: 150, y: 100, timestamp: 1200 },
  ];

  describe('Trail Rendering', () => {
    it('should render trail when pathPoints has 2+ points', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={mockPathPoints}
          isWordValid={true}
          wasWordSubmitted={false}
        />
      );

      const trail = screen.getByTestId('word-path-trail');
      expect(trail).toBeInTheDocument();
    });

    it('should NOT render trail when pathPoints has fewer than 2 points', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={[{ x: 50, y: 50, timestamp: 1000 }]}
          isWordValid={true}
          wasWordSubmitted={false}
        />
      );

      expect(screen.queryByTestId('word-path-trail')).not.toBeInTheDocument();
    });

    it('should NOT render trail when pathPoints is undefined', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          isWordValid={true}
          wasWordSubmitted={false}
        />
      );

      expect(screen.queryByTestId('word-path-trail')).not.toBeInTheDocument();
    });

    it('should NOT render trail when pathPoints is empty', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={[]}
          isWordValid={true}
          wasWordSubmitted={false}
        />
      );

      expect(screen.queryByTestId('word-path-trail')).not.toBeInTheDocument();
    });
  });

  describe('Trail Props', () => {
    it('should pass isValid prop to WordPathTrail', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={mockPathPoints}
          isWordValid={true}
          wasWordSubmitted={false}
        />
      );

      const trailMock = screen.getByTestId('word-path-trail-mock');
      expect(trailMock).toHaveAttribute('data-is-valid', 'true');
    });

    it('should pass wasSubmitted prop to WordPathTrail', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={mockPathPoints}
          isWordValid={true}
          wasWordSubmitted={true}
        />
      );

      const trailMock = screen.getByTestId('word-path-trail-mock');
      expect(trailMock).toHaveAttribute('data-was-submitted', 'true');
    });

    it('should pass pathPoints to WordPathTrail', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={mockPathPoints}
          isWordValid={true}
          wasWordSubmitted={false}
        />
      );

      const trailMock = screen.getByTestId('word-path-trail-mock');
      const passedPoints = JSON.parse(
        trailMock.getAttribute('data-points') || '[]'
      );
      expect(passedPoints).toEqual(mockPathPoints);
    });
  });

  describe('Tile Data Attributes', () => {
    it('should have data-row attribute on tiles', () => {
      const { container } = render(
        <AdventureGrid tiles={mockTiles} gridSize={3} />
      );

      const tiles = container.querySelectorAll('[role="gridcell"]');
      expect(tiles[0]).toHaveAttribute('data-row', '0');
      expect(tiles[1]).toHaveAttribute('data-row', '0');
      expect(tiles[3]).toHaveAttribute('data-row', '1');
    });

    it('should have data-col attribute on tiles', () => {
      const { container } = render(
        <AdventureGrid tiles={mockTiles} gridSize={3} />
      );

      const tiles = container.querySelectorAll('[role="gridcell"]');
      expect(tiles[0]).toHaveAttribute('data-col', '0');
      expect(tiles[1]).toHaveAttribute('data-col', '1');
      expect(tiles[2]).toHaveAttribute('data-col', '2');
    });

    it('should have correct data-row and data-col for each tile', () => {
      const { container } = render(
        <AdventureGrid tiles={mockTiles} gridSize={3} />
      );

      const tiles = container.querySelectorAll('[role="gridcell"]');

      // Test a few specific tiles
      // Tile at row 0, col 0
      expect(tiles[0]).toHaveAttribute('data-row', '0');
      expect(tiles[0]).toHaveAttribute('data-col', '0');

      // Tile at row 1, col 2
      expect(tiles[5]).toHaveAttribute('data-row', '1');
      expect(tiles[5]).toHaveAttribute('data-col', '2');

      // Tile at row 2, col 1
      expect(tiles[7]).toHaveAttribute('data-row', '2');
      expect(tiles[7]).toHaveAttribute('data-col', '1');
    });
  });

  describe('Trail Container', () => {
    it('should have pointer-events-none on trail container', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={mockPathPoints}
        />
      );

      const trailContainer = screen.getByTestId('word-path-trail');
      expect(trailContainer).toHaveClass('pointer-events-none');
    });

    it('should have absolute positioning on trail container', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={3}
          pathPoints={mockPathPoints}
        />
      );

      const trailContainer = screen.getByTestId('word-path-trail');
      expect(trailContainer).toHaveClass('absolute');
      expect(trailContainer).toHaveClass('inset-0');
    });
  });
});
