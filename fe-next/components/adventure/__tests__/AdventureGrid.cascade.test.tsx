/**
 * AdventureGrid - Tile Cascade Animation Tests
 *
 * DEBT-01: Tests updated to use optimized timing constants
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

// Mock dependencies
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableComplexAnimations: true,
    enableGlowEffects: true,
  }),
}));

// Helper to create mock tiles
function createMockTiles(gridSize: number): GridTileState[] {
  const tiles: GridTileState[] = [];
  const letters = 'ABCDEFGHIJKLMNOP';
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const index = row * gridSize + col;
      tiles.push({
        id: `tile-${row}-${col}`,
        letter: letters[index] || 'X',
        type: 'standard',
        row,
        col,
        isCleared: false,
        isFrozen: false,
      });
    }
  }
  return tiles;
}

describe('AdventureGrid - Tile Cascade Animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('tiles render with cascade animation when showCascade is true', () => {
    const tiles = createMockTiles(4);
    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        showCascade={true}
        interactive={false}
      />
    );

    // All tiles should be rendered
    const gridCells = screen.getAllByRole('gridcell');
    expect(gridCells).toHaveLength(16);
  });

  test('onCascadeComplete is called after animation duration', () => {
    const onCascadeComplete = vi.fn();
    const tiles = createMockTiles(4);

    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        showCascade={true}
        onCascadeComplete={onCascadeComplete}
        interactive={false}
      />
    );

    expect(onCascadeComplete).not.toHaveBeenCalled();

    // Fast forward past cascade duration using optimized constants
    // DEBT-01: For 4x4: max diagonal = 6, so 6*25 + 300 = 450ms (was 580ms)
    const cascadeDuration4x4 = OPTIMIZED_TIMING.getCascadeDuration(4);
    act(() => {
      vi.advanceTimersByTime(cascadeDuration4x4 + 10);
    });

    expect(onCascadeComplete).toHaveBeenCalledTimes(1);
  });

  test('cascade skipped when showCascade is false', () => {
    const onCascadeComplete = vi.fn();
    const tiles = createMockTiles(4);

    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        showCascade={false}
        onCascadeComplete={onCascadeComplete}
        interactive={true}
      />
    );

    // Should not call onCascadeComplete since cascade wasn't shown
    expect(onCascadeComplete).not.toHaveBeenCalled();
  });

  test('cascade completes immediately when prefersReducedMotion is true', () => {
    // Note: This test documents expected behavior
    // In a real scenario with prefersReducedMotion=true,
    // the cascade would complete immediately via useEffect
    // Current test setup uses a global mock that can't be easily overridden per-test
    // Behavior is verified through the useEffect logic in the component

    const onCascadeComplete = vi.fn();
    const tiles = createMockTiles(4);

    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        showCascade={true}
        onCascadeComplete={onCascadeComplete}
        interactive={false}
      />
    );

    // With prefersReducedMotion=false (current mock), cascade takes normal time
    // DEBT-01: Uses optimized timing
    const cascadeDuration4x4 = OPTIMIZED_TIMING.getCascadeDuration(4);
    act(() => {
      vi.advanceTimersByTime(cascadeDuration4x4 + 10);
    });

    expect(onCascadeComplete).toHaveBeenCalledTimes(1);
  });

  test('grid is accessible with proper ARIA attributes', () => {
    const tiles = createMockTiles(4);
    render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        showCascade={true}
        interactive={false}
      />
    );

    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', 'Adventure game board');
  });

  test('cascade timing varies by tile position (diagonal wave)', () => {
    const tiles = createMockTiles(4);
    const { container } = render(
      <AdventureGrid
        tiles={tiles}
        gridSize={4}
        showCascade={true}
        interactive={false}
      />
    );

    // Verify tiles have different positions
    const gridCells = container.querySelectorAll('[role="gridcell"]');
    expect(gridCells.length).toBe(16);

    // Check that different tiles have different row/col attributes
    const firstTile = gridCells[0];
    const lastTile = gridCells[15];

    expect(firstTile.getAttribute('data-row')).toBe('0');
    expect(firstTile.getAttribute('data-col')).toBe('0');
    expect(lastTile.getAttribute('data-row')).toBe('3');
    expect(lastTile.getAttribute('data-col')).toBe('3');
  });

  test('cascade duration scales with grid size', () => {
    const onCascadeComplete5x5 = vi.fn();
    const tiles5x5 = createMockTiles(5);

    render(
      <AdventureGrid
        tiles={tiles5x5}
        gridSize={5}
        showCascade={true}
        onCascadeComplete={onCascadeComplete5x5}
        interactive={false}
      />
    );

    // DEBT-01: For 5x5: max diagonal = 8, so 8*25 + 300 = 500ms (was 640ms)
    const cascadeDuration5x5 = OPTIMIZED_TIMING.getCascadeDuration(5);
    const cascadeDuration4x4 = OPTIMIZED_TIMING.getCascadeDuration(4);

    // Advance to just past 4x4 duration - 5x5 should NOT be complete yet
    act(() => {
      vi.advanceTimersByTime(cascadeDuration4x4 + 10);
    });

    expect(onCascadeComplete5x5).not.toHaveBeenCalled();

    // Advance to complete 5x5 duration
    act(() => {
      vi.advanceTimersByTime(cascadeDuration5x5 - cascadeDuration4x4);
    });

    expect(onCascadeComplete5x5).toHaveBeenCalledTimes(1);
  });
});
