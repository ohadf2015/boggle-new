/**
 * AdventureGrid Letter Pop Animation Tests
 *
 * Tests for spring physics selection animations and sparkle effects
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdventureGrid from '../AdventureGrid';
import type { GridTileState } from '@/types/adventure';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Mock dependencies
vi.mock('@/hooks/useDevicePerformance');
vi.mock('@/components/animations', () => ({
  WordPathTrail: () => <div data-testid="word-path-trail" />,
  SelectionSparkle: ({ position, triggerKey }: { position: { x: number; y: number } | null; triggerKey: number }) => (
    <div data-testid="selection-sparkle" data-position={position ? JSON.stringify(position) : null} data-key={triggerKey} />
  ),
}));

const mockUseDevicePerformance = useDevicePerformance as jest.MockedFunction<typeof useDevicePerformance>;

// Mock tiles (4x4 grid)
const mockTiles: GridTileState[] = [
  { id: 'tile-0-0', row: 0, col: 0, letter: 'A', type: 'standard', isCleared: false },
  { id: 'tile-0-1', row: 0, col: 1, letter: 'B', type: 'standard', isCleared: false },
  { id: 'tile-0-2', row: 0, col: 2, letter: 'C', type: 'standard', isCleared: false },
  { id: 'tile-0-3', row: 0, col: 3, letter: 'D', type: 'standard', isCleared: false },
  { id: 'tile-1-0', row: 1, col: 0, letter: 'E', type: 'standard', isCleared: false },
  { id: 'tile-1-1', row: 1, col: 1, letter: 'F', type: 'standard', isCleared: false },
  { id: 'tile-1-2', row: 1, col: 2, letter: 'G', type: 'standard', isCleared: false },
  { id: 'tile-1-3', row: 1, col: 3, letter: 'H', type: 'standard', isCleared: false },
  { id: 'tile-2-0', row: 2, col: 0, letter: 'I', type: 'standard', isCleared: false },
  { id: 'tile-2-1', row: 2, col: 1, letter: 'J', type: 'standard', isCleared: false },
  { id: 'tile-2-2', row: 2, col: 2, letter: 'K', type: 'standard', isCleared: false },
  { id: 'tile-2-3', row: 2, col: 3, letter: 'L', type: 'standard', isCleared: false },
  { id: 'tile-3-0', row: 3, col: 0, letter: 'M', type: 'standard', isCleared: false },
  { id: 'tile-3-1', row: 3, col: 1, letter: 'N', type: 'standard', isCleared: false },
  { id: 'tile-3-2', row: 3, col: 2, letter: 'O', type: 'standard', isCleared: false },
  { id: 'tile-3-3', row: 3, col: 3, letter: 'P', type: 'standard', isCleared: false },
];

describe('AdventureGrid - Letter Pop Animation', () => {
  beforeEach(() => {
    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      maxParticles: 20,
      targetFPS: 60,
      throttleMs: 16,
      reduceParticles: false,
      isSlowConnection: false,
      isMobile: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Spring animation on selection', () => {
    it('should render tiles with motion.div when enabled', () => {
      const { container } = render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          selectedIndices={[0]}
          interactive={true}
        />
      );

      const tiles = container.querySelectorAll('[role="gridcell"]');
      expect(tiles.length).toBe(16);

      // Motion.div should have motion attributes
      const firstTile = tiles[0];
      expect(firstTile).toBeInTheDocument();
    });

    it('should apply selection state to selected tile', () => {
      const { container } = render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          selectedIndices={[0, 1]}
          interactive={true}
        />
      );

      const firstTile = container.querySelector('[data-row="0"][data-col="0"]');
      const secondTile = container.querySelector('[data-row="0"][data-col="1"]');
      const thirdTile = container.querySelector('[data-row="0"][data-col="2"]');

      expect(firstTile).toHaveAttribute('aria-selected', 'true');
      expect(secondTile).toHaveAttribute('aria-selected', 'true');
      expect(thirdTile).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Reduced motion fallback', () => {
    it('should skip animations when prefersReducedMotion is true', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        prefersReducedMotion: true,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 0,
        targetFPS: 60,
        throttleMs: 16,
        reduceParticles: true,
        isSlowConnection: false,
        isMobile: false,
      });

      const { container } = render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          selectedIndices={[0]}
          interactive={true}
        />
      );

      // Should still render tiles
      const tiles = container.querySelectorAll('[role="gridcell"]');
      expect(tiles.length).toBe(16);

      // Animation should be instant (checked via motion props in component)
      // We can't directly test Framer Motion internal state, but we verify
      // that the component renders correctly with reduced motion settings
    });
  });

  describe('Sparkle triggers on selection', () => {
    it('should trigger sparkle on mousedown', () => {
      const mockOnDragStart = vi.fn();

      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={true}
          onDragStart={mockOnDragStart}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];

      // Simulate mousedown with position
      fireEvent.mouseDown(firstTile, { clientX: 100, clientY: 150 });

      // Verify SelectionSparkle receives position
      const sparkle = screen.getByTestId('selection-sparkle');
      const positionData = sparkle.getAttribute('data-position');

      expect(positionData).toBeTruthy();
      if (positionData) {
        const position = JSON.parse(positionData);
        expect(position).toEqual({ x: 100, y: 150 });
      }

      // Verify key is set (timestamp-based)
      const keyData = sparkle.getAttribute('data-key');
      expect(keyData).toBeTruthy();
      expect(Number(keyData)).toBeGreaterThan(0);
    });

    it('should trigger sparkle on touchstart', () => {
      const mockOnDragStart = vi.fn();

      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={true}
          onDragStart={mockOnDragStart}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];

      // Simulate touchstart with position
      fireEvent.touchStart(firstTile, {
        touches: [{ clientX: 200, clientY: 250 }],
      });

      // Verify SelectionSparkle receives position
      const sparkle = screen.getByTestId('selection-sparkle');
      const positionData = sparkle.getAttribute('data-position');

      expect(positionData).toBeTruthy();
      if (positionData) {
        const position = JSON.parse(positionData);
        expect(position).toEqual({ x: 200, y: 250 });
      }
    });

    it('should not trigger sparkle when animations are disabled', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: true,
        prefersReducedMotion: false,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 4,
        targetFPS: 30,
        throttleMs: 33,
        reduceParticles: true,
        isSlowConnection: false,
        isMobile: true,
      });

      const mockOnDragStart = vi.fn();

      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={true}
          onDragStart={mockOnDragStart}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];
      fireEvent.mouseDown(firstTile, { clientX: 100, clientY: 150 });

      // Sparkle component should not be rendered at all on low-end devices
      expect(screen.queryByTestId('selection-sparkle')).not.toBeInTheDocument();
    });
  });

  describe('Sparkle respects device performance', () => {
    it('should not render sparkle on low-end devices', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: true,
        prefersReducedMotion: false,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 4,
        targetFPS: 30,
        throttleMs: 33,
        reduceParticles: true,
        isSlowConnection: false,
        isMobile: true,
      });

      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={true}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];
      fireEvent.mouseDown(firstTile, { clientX: 100, clientY: 150 });

      // Sparkle component should not be rendered at all on low-end devices
      expect(screen.queryByTestId('selection-sparkle')).not.toBeInTheDocument();
    });

    it('should render sparkle on capable devices', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        prefersReducedMotion: false,
        enableComplexAnimations: true,
        enableGlowEffects: true,
        maxParticles: 20,
        targetFPS: 60,
        throttleMs: 16,
        reduceParticles: false,
        isSlowConnection: false,
        isMobile: false,
      });

      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={true}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];
      fireEvent.mouseDown(firstTile, { clientX: 100, clientY: 150 });

      // On capable device, sparkle should trigger
      const sparkle = screen.getByTestId('selection-sparkle');
      const positionData = sparkle.getAttribute('data-position');
      expect(positionData).not.toBeNull();
    });
  });

  describe('Multiple tile selections', () => {
    it('should update sparkle key on each new selection', () => {
      vi.useFakeTimers();
      const { container } = render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={true}
        />
      );

      const tiles = screen.getAllByRole('gridcell');

      // First selection
      fireEvent.mouseDown(tiles[0], { clientX: 100, clientY: 100 });
      const sparkle1 = screen.getByTestId('selection-sparkle');
      const key1 = sparkle1.getAttribute('data-key');

      // Small delay to ensure different timestamp
      vi.advanceTimersByTime(10);

      // Second selection
      fireEvent.mouseDown(tiles[1], { clientX: 200, clientY: 100 });
      const sparkle2 = screen.getByTestId('selection-sparkle');
      const key2 = sparkle2.getAttribute('data-key');

      // Keys should be different (timestamp-based)
      expect(key1).not.toBe(key2);
      vi.useRealTimers();
    });
  });

  describe('Non-interactive mode', () => {
    it('should not trigger sparkles when interactive is false', () => {
      render(
        <AdventureGrid
          tiles={mockTiles}
          gridSize={4}
          interactive={false}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];
      fireEvent.mouseDown(firstTile, { clientX: 100, clientY: 150 });

      // Sparkle should not be triggered
      const sparkle = screen.getByTestId('selection-sparkle');
      const positionData = sparkle.getAttribute('data-position');
      expect(positionData).toBeNull();
    });

    it('should not trigger sparkles on cleared tiles', () => {
      const clearedTiles = mockTiles.map((tile, i) =>
        i === 0 ? { ...tile, isCleared: true } : tile
      );

      render(
        <AdventureGrid
          tiles={clearedTiles}
          gridSize={4}
          interactive={true}
        />
      );

      const firstTile = screen.getAllByRole('gridcell')[0];
      fireEvent.mouseDown(firstTile, { clientX: 100, clientY: 150 });

      // Sparkle should not be triggered on cleared tile
      const sparkle = screen.getByTestId('selection-sparkle');
      const positionData = sparkle.getAttribute('data-position');
      expect(positionData).toBeNull();
    });
  });
});
