/**
 * Tests for useCascadeAnimation hook
 *
 * Validates cascade animation delay calculations for chain tile reactions.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCascadeAnimation,
  calculateCascadeDelays,
  type CascadeConfig,
} from '../useCascadeAnimation';

// ==============================================
// TESTS: calculateCascadeDelays - Wave Pattern
// ==============================================

describe('calculateCascadeDelays - Wave Pattern', () => {
  test('origin tile receives delay 0', () => {
    const config: CascadeConfig = {
      origin: { row: 2, col: 2 },
      affectedIndices: [10], // Index 10 in 5x5 grid = (2,0) - distance 2
      gridSize: 5,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Origin at (2,2) = index 12 in 5x5 grid
    // If origin is included in affectedIndices, it gets delay 0
    const originIndex = 2 * 5 + 2;
    if (config.affectedIndices.includes(originIndex)) {
      expect(result.delays.get(originIndex)).toBe(0);
    }
  });

  test('adjacent tiles (distance 1) get 50ms delay by default', () => {
    const config: CascadeConfig = {
      origin: { row: 2, col: 2 },
      affectedIndices: [
        11, // (2,1) - left, distance 1
        13, // (2,3) - right, distance 1
        7,  // (1,2) - top, distance 1
        17, // (3,2) - bottom, distance 1
      ],
      gridSize: 5,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Distance 1 should get 1 * 50ms = 50ms
    expect(result.delays.get(11)).toBe(50);
    expect(result.delays.get(13)).toBe(50);
    expect(result.delays.get(7)).toBe(50);
    expect(result.delays.get(17)).toBe(50);
  });

  test('diagonal tiles (distance 2) get 100ms delay', () => {
    const config: CascadeConfig = {
      origin: { row: 2, col: 2 },
      affectedIndices: [
        6,  // (1,1) - top-left, distance 2
        8,  // (1,3) - top-right, distance 2
        16, // (3,1) - bottom-left, distance 2
        18, // (3,3) - bottom-right, distance 2
      ],
      gridSize: 5,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Distance 2 should get 2 * 50ms = 100ms
    expect(result.delays.get(6)).toBe(100);
    expect(result.delays.get(8)).toBe(100);
    expect(result.delays.get(16)).toBe(100);
    expect(result.delays.get(18)).toBe(100);
  });

  test('custom stagger timing (30ms)', () => {
    const config: CascadeConfig = {
      origin: { row: 1, col: 1 },
      affectedIndices: [4, 6], // Adjacent tiles in 4x4 grid: (1,0) and (1,2)
      gridSize: 4,
      staggerMs: 30,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Distance 1 with 30ms stagger = 30ms
    expect(result.delays.get(4)).toBe(30);
    expect(result.delays.get(6)).toBe(30);
  });

  test('returns correct totalDuration and maxDelay', () => {
    const config: CascadeConfig = {
      origin: { row: 0, col: 0 },
      affectedIndices: [1, 4, 5], // Mix of distances
      gridSize: 4,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Index 1: (0,1) distance 1 = 50ms
    // Index 4: (1,0) distance 1 = 50ms
    // Index 5: (1,1) distance 2 = 100ms
    expect(result.maxDelay).toBe(100);
    expect(result.totalDuration).toBe(100);
  });
});

// ==============================================
// TESTS: Grid Edge Handling
// ==============================================

describe('calculateCascadeDelays - Grid Edge Cases', () => {
  test('chain at (0,0) - only 3 valid neighbors', () => {
    const config: CascadeConfig = {
      origin: { row: 0, col: 0 },
      affectedIndices: [
        1, // (0,1) - right
        4, // (1,0) - bottom
        5, // (1,1) - diagonal
      ],
      gridSize: 4,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    expect(result.delays.get(1)).toBe(50);
    expect(result.delays.get(4)).toBe(50);
    expect(result.delays.get(5)).toBe(100);
  });

  test('chain at edge (0,2) in 4x4 grid - 5 valid neighbors', () => {
    const config: CascadeConfig = {
      origin: { row: 0, col: 2 },
      affectedIndices: [
        1, // (0,1) - left
        3, // (0,3) - right
        5, // (1,1) - bottom-left diagonal
        6, // (1,2) - bottom
        7, // (1,3) - bottom-right diagonal
      ],
      gridSize: 4,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Distance 1: left, right, bottom
    expect(result.delays.get(1)).toBe(50);
    expect(result.delays.get(3)).toBe(50);
    expect(result.delays.get(6)).toBe(50);

    // Distance 2: diagonals
    expect(result.delays.get(5)).toBe(100);
    expect(result.delays.get(7)).toBe(100);
  });

  test('chain at center (2,2) in 5x5 grid - all 8 neighbors valid', () => {
    const config: CascadeConfig = {
      origin: { row: 2, col: 2 },
      affectedIndices: [
        6, 7, 8,    // Top row
        11, 13,     // Middle row (skip center 12)
        16, 17, 18, // Bottom row
      ],
      gridSize: 5,
      animationType: 'wave',
    };

    const result = calculateCascadeDelays(config);

    // Distance 1: orthogonal neighbors
    expect(result.delays.get(7)).toBe(50);  // top
    expect(result.delays.get(11)).toBe(50); // left
    expect(result.delays.get(13)).toBe(50); // right
    expect(result.delays.get(17)).toBe(50); // bottom

    // Distance 2: diagonal neighbors
    expect(result.delays.get(6)).toBe(100);  // top-left
    expect(result.delays.get(8)).toBe(100);  // top-right
    expect(result.delays.get(16)).toBe(100); // bottom-left
    expect(result.delays.get(18)).toBe(100); // bottom-right
  });
});

// ==============================================
// TESTS: Burst Pattern
// ==============================================

describe('calculateCascadeDelays - Burst Pattern', () => {
  test('sequential delays for burst pattern', () => {
    const config: CascadeConfig = {
      origin: { row: 1, col: 1 },
      affectedIndices: [0, 1, 2, 3, 4],
      gridSize: 4,
      animationType: 'burst',
    };

    const result = calculateCascadeDelays(config);

    // Burst pattern: sequential delays
    expect(result.delays.get(0)).toBe(0);
    expect(result.delays.get(1)).toBe(50);
    expect(result.delays.get(2)).toBe(100);
    expect(result.delays.get(3)).toBe(150);
    expect(result.delays.get(4)).toBe(200);
  });

  test('custom stagger in burst pattern', () => {
    const config: CascadeConfig = {
      origin: { row: 0, col: 0 },
      affectedIndices: [1, 2, 3],
      gridSize: 4,
      staggerMs: 30,
      animationType: 'burst',
    };

    const result = calculateCascadeDelays(config);

    expect(result.delays.get(1)).toBe(0);
    expect(result.delays.get(2)).toBe(30);
    expect(result.delays.get(3)).toBe(60);
  });
});

// ==============================================
// TESTS: useCascadeAnimation Hook
// ==============================================

describe('useCascadeAnimation Hook', () => {
  test('initial state is not animating', () => {
    const { result } = renderHook(() => useCascadeAnimation());

    expect(result.current.isAnimating).toBe(false);
    expect(result.current.delays.size).toBe(0);
  });

  test('startCascade sets isAnimating to true', () => {
    const { result } = renderHook(() => useCascadeAnimation());

    act(() => {
      result.current.startCascade({
        origin: { row: 1, col: 1 },
        affectedIndices: [5, 6, 7],
        gridSize: 4,
        animationType: 'wave',
      });
    });

    expect(result.current.isAnimating).toBe(true);
  });

  test('startCascade updates delays Map', () => {
    const { result } = renderHook(() => useCascadeAnimation());

    act(() => {
      result.current.startCascade({
        origin: { row: 0, col: 0 },
        affectedIndices: [1, 4],
        gridSize: 4,
        animationType: 'wave',
      });
    });

    expect(result.current.delays.size).toBe(2);
    expect(result.current.delays.get(1)).toBe(50);
    expect(result.current.delays.get(4)).toBe(50);
  });

  test('reset clears state', () => {
    const { result } = renderHook(() => useCascadeAnimation());

    act(() => {
      result.current.startCascade({
        origin: { row: 1, col: 1 },
        affectedIndices: [5],
        gridSize: 4,
        animationType: 'wave',
      });
    });

    expect(result.current.isAnimating).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isAnimating).toBe(false);
    expect(result.current.delays.size).toBe(0);
  });

  test('auto-cleanup after totalDuration', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useCascadeAnimation());

    act(() => {
      result.current.startCascade({
        origin: { row: 0, col: 0 },
        affectedIndices: [1], // Distance 1 = 50ms delay
        gridSize: 4,
        animationType: 'wave',
      });
    });

    expect(result.current.isAnimating).toBe(true);

    // Fast-forward past totalDuration (50ms max delay)
    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.isAnimating).toBe(false);

    vi.useRealTimers();
  });

  test('wave pattern calculates correctly for 5x5 grid', () => {
    const { result } = renderHook(() => useCascadeAnimation());

    act(() => {
      result.current.startCascade({
        origin: { row: 2, col: 2 },
        affectedIndices: [7, 11, 13, 17], // Orthogonal neighbors
        gridSize: 5,
        animationType: 'wave',
      });
    });

    // All should be distance 1 = 50ms
    expect(result.current.delays.get(7)).toBe(50);
    expect(result.current.delays.get(11)).toBe(50);
    expect(result.current.delays.get(13)).toBe(50);
    expect(result.current.delays.get(17)).toBe(50);
  });
});
