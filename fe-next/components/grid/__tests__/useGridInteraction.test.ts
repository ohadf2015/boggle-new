/**
 * useGridInteraction Hook Tests
 *
 * Tests for the grid interaction hook, specifically callback ordering
 */

import { renderHook, act } from '@testing-library/react';
import { useGridInteraction } from '../useGridInteraction';
import type { LetterGrid } from '@/types';

// Mock performance utils
jest.mock('../performanceUtils', () => ({
  getPerformanceConfig: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
  }),
}));

// Mock word path finder
jest.mock('@/utils/wordPathFinder', () => ({
  findWordPath: jest.fn(),
}));

// Mock client word validator
jest.mock('@/utils/clientWordValidator', () => ({
  normalizeWord: (word: string) => word.toUpperCase(),
}));

// Mock consts
jest.mock('@/utils/consts', () => ({
  getDeadzoneThreshold: () => 5,
}));

describe('useGridInteraction', () => {
  const mockGrid: LetterGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const createMockRef = () => ({
    current: document.createElement('div'),
  });

  describe('callback order - onPathSubmit must be called BEFORE onWordSubmit', () => {
    /**
     * Bug: Lightning Round shows wrong word trail because onWordSubmit
     * is called before onPathSubmit in some code paths.
     *
     * When the order is wrong:
     * 1. User submits word "ABC" with path [A, B, C]
     * 2. onWordSubmit runs first - uses OLD lastSubmittedPath (stale data!)
     * 3. onPathSubmit runs second - updates lastSubmittedPath (too late!)
     *
     * This causes the trail from the PREVIOUS word to be shown.
     */
    it('calls onPathSubmit BEFORE onWordSubmit when submitting via submitWord', () => {
      const callOrder: string[] = [];
      const onWordSubmit = jest.fn(() => callOrder.push('word'));
      const onPathSubmit = jest.fn(() => callOrder.push('path'));
      const gridRef = createMockRef();

      const { result } = renderHook(() =>
        useGridInteraction({
          grid: mockGrid,
          interactive: true,
          comboLevel: 0,
          onWordSubmit,
          onPathSubmit,
          gridRef,
          language: 'en',
        })
      );

      // Simulate selecting cells
      act(() => {
        // Use handleTouchStart to start selection
        const mockEvent = {
          touches: [{ clientX: 0, clientY: 0 }],
        } as unknown as React.TouchEvent<HTMLDivElement>;
        result.current.handleTouchStart(0, 0, 'A', mockEvent);
      });

      // Call submitWord directly (e.g., from double-click or Enter key)
      act(() => {
        result.current.submitWord();
      });

      // Path should be submitted BEFORE word
      expect(callOrder).toEqual(['path', 'word']);
      expect(onPathSubmit).toHaveBeenCalledTimes(1);
      expect(onWordSubmit).toHaveBeenCalledTimes(1);
    });

    it('calls onPathSubmit BEFORE onWordSubmit on touch end', () => {
      const callOrder: string[] = [];
      const onWordSubmit = jest.fn(() => callOrder.push('word'));
      const onPathSubmit = jest.fn(() => callOrder.push('path'));
      const gridRef = createMockRef();

      // Mock getBoundingClientRect for cell position calculation
      gridRef.current.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
        right: 400,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // Add mock children for cell measurements
      const mockCell = document.createElement('div');
      mockCell.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      gridRef.current.appendChild(mockCell);
      for (let i = 1; i < 16; i++) {
        gridRef.current.appendChild(mockCell.cloneNode(true));
      }

      const { result } = renderHook(() =>
        useGridInteraction({
          grid: mockGrid,
          interactive: true,
          comboLevel: 0,
          onWordSubmit,
          onPathSubmit,
          gridRef,
          language: 'en',
        })
      );

      // Simulate touch interaction - start selecting
      act(() => {
        const mockEvent = {
          touches: [{ clientX: 50, clientY: 50 }],
        } as unknown as React.TouchEvent<HTMLDivElement>;
        result.current.handleTouchStart(0, 0, 'A', mockEvent);
      });

      // Simulate touch move to select more cells (hasMovedRef = true)
      act(() => {
        const mockMoveEvent = {
          touches: [{ clientX: 150, clientY: 50 }],
          cancelable: true,
          preventDefault: jest.fn(),
        } as unknown as TouchEvent;
        result.current.handleTouchMove(mockMoveEvent);
      });

      // Reset call tracking before touch end
      callOrder.length = 0;
      onWordSubmit.mockClear();
      onPathSubmit.mockClear();

      // Simulate touch end - this should submit the word
      act(() => {
        result.current.handleTouchEnd();
      });

      // Path should be submitted BEFORE word
      expect(callOrder).toEqual(['path', 'word']);
      expect(onPathSubmit).toHaveBeenCalledTimes(1);
      expect(onWordSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
