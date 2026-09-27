/**
 * @jest-environment jsdom
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoScrollOnGameStart } from '../useAutoScrollOnGameStart';
import type { RefObject } from 'react';

// Mock window.scrollTo
const mockScrollTo = vi.fn();
Object.defineProperty(window, 'scrollTo', {
  value: mockScrollTo,
  writable: true,
});

// Mock getBoundingClientRect for elements
const mockGetBoundingClientRect = (top: number, bottom: number) => ({
  top,
  bottom,
  left: 0,
  right: 0,
  width: 0,
  height: bottom - top,
  x: 0,
  y: top,
  toJSON: () => ({}),
});

describe('useAutoScrollOnGameStart', () => {
  let targetRef: RefObject<HTMLDivElement>;
  let targetElement: HTMLDivElement;
  let gridElement: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset window properties
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

    // Create target element
    targetElement = document.createElement('div');
    targetElement.getBoundingClientRect = vi.fn(() =>
      mockGetBoundingClientRect(100, 150)
    );
    document.body.appendChild(targetElement);

    // Create grid element
    gridElement = document.createElement('div');
    gridElement.className = 'game-board-frame';
    gridElement.getBoundingClientRect = vi.fn(() =>
      mockGetBoundingClientRect(200, 700)
    );
    document.body.appendChild(gridElement);

    targetRef = { current: targetElement };
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up DOM elements properly
    if (targetElement.parentNode) {
      targetElement.parentNode.removeChild(targetElement);
    }
    if (gridElement.parentNode) {
      gridElement.parentNode.removeChild(gridElement);
    }
  });

  it('should NOT scroll when game is not active', () => {
    renderHook(() =>
      useAutoScrollOnGameStart(targetRef, {
        gameActive: false,
        isLandscape: false,
        showStartAnimation: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('should NOT scroll when in landscape mode', () => {
    renderHook(() =>
      useAutoScrollOnGameStart(targetRef, {
        gameActive: true,
        isLandscape: true,
        showStartAnimation: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('should NOT scroll when start animation is still showing', () => {
    renderHook(() =>
      useAutoScrollOnGameStart(targetRef, {
        gameActive: true,
        isLandscape: false,
        showStartAnimation: true,
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('should NOT scroll on desktop (wide viewport)', () => {
    // Set desktop width
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

    renderHook(() =>
      useAutoScrollOnGameStart(targetRef, {
        gameActive: true,
        isLandscape: false,
        showStartAnimation: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Desktop without touch - should NOT scroll
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('should scroll on mobile portrait when game becomes active and animation ends', () => {
    // Simulate mobile with touch
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, writable: true });

    const { rerender } = renderHook(
      ({ gameActive, showStartAnimation }) =>
        useAutoScrollOnGameStart(targetRef, {
          gameActive,
          isLandscape: false,
          showStartAnimation,
        }),
      {
        initialProps: { gameActive: false, showStartAnimation: false },
      }
    );

    // Game becomes active with animation showing
    rerender({ gameActive: true, showStartAnimation: true });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(mockScrollTo).not.toHaveBeenCalled();

    // Animation finishes
    rerender({ gameActive: true, showStartAnimation: false });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should scroll now
    expect(mockScrollTo).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
      })
    );
  });

  it('should scroll only once per game session', () => {
    // Simulate mobile with touch
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, writable: true });

    const { rerender } = renderHook(
      ({ gameActive }) =>
        useAutoScrollOnGameStart(targetRef, {
          gameActive,
          isLandscape: false,
          showStartAnimation: false,
        }),
      {
        initialProps: { gameActive: true },
      }
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const firstCallCount = mockScrollTo.mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // Re-render with same state
    rerender({ gameActive: true });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should NOT have scrolled again
    expect(mockScrollTo.mock.calls.length).toBe(firstCallCount);
  });

  it('should reset scroll tracking when game becomes inactive', () => {
    // Simulate mobile with touch
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, writable: true });

    const { rerender } = renderHook(
      ({ gameActive }) =>
        useAutoScrollOnGameStart(targetRef, {
          gameActive,
          isLandscape: false,
          showStartAnimation: false,
        }),
      {
        initialProps: { gameActive: true },
      }
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    const firstCallCount = mockScrollTo.mock.calls.length;

    // Game ends
    rerender({ gameActive: false });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Game restarts
    rerender({ gameActive: true });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should have scrolled again for new game
    expect(mockScrollTo.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it('should scroll to correct position based on game area height', () => {
    // Simulate mobile with touch
    Object.defineProperty(window, 'ontouchstart', { value: () => {}, writable: true });

    renderHook(() =>
      useAutoScrollOnGameStart(targetRef, {
        gameActive: true,
        isLandscape: false,
        showStartAnimation: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockScrollTo).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.any(Number),
        behavior: 'smooth',
      })
    );

    // Verify scroll position is non-negative
    const scrollCall = mockScrollTo.mock.calls[0][0];
    expect(scrollCall.top).toBeGreaterThanOrEqual(0);
  });
});
