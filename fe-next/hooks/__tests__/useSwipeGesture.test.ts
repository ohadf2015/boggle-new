/**
 * useSwipeGesture Hook Tests
 *
 * Tests for swipe gesture detection hook using Framer Motion
 * Following TDD RED-GREEN-REFACTOR cycle
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeGesture } from '../useSwipeGesture';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  useMotionValue: vi.fn((initialValue) => {
    let value = initialValue;
    const listeners = new Set<(v: number) => void>();
    return {
      get: () => value,
      set: (newValue: number) => {
        value = newValue;
        listeners.forEach((listener) => listener(newValue));
      },
      on: (_event: string, listener: (v: number) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }),
  useTransform: vi.fn((motionValue, inputRange, outputRange) => {
    const listeners = new Set<(v: number) => void>();
    const mockMotionValue = {
      get: () => {
        const currentX = motionValue.get();
        // Linear interpolation for transform
        const ratio = (currentX - inputRange[0]) / (inputRange[1] - inputRange[0]);
        const output = outputRange[0] + ratio * (outputRange[1] - outputRange[0]);
        return Math.max(outputRange[0], Math.min(outputRange[1], output));
      },
      set: vi.fn(),
      on: (_event: string, listener: (v: number) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    // Subscribe to changes in source motion value
    motionValue.on('change', () => {
      listeners.forEach((listener) => listener(mockMotionValue.get()));
    });
    return mockMotionValue;
  }),
}));

describe('useSwipeGesture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with x position at 0', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // THEN
      expect(result.current.x.get()).toBe(0);
    });

    it('should initialize with rotation at 0', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // THEN
      expect(result.current.rotate.get()).toBe(0);
    });

    it('should initialize with opacity at 1', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // THEN
      expect(result.current.opacity.get()).toBe(1);
    });

    it('should use default threshold of 150px when not provided', () => {
      // GIVEN/WHEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // THEN - drag exactly 150px should trigger swipe
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 150, y: 0 }, velocity: { x: 0, y: 0 } });
      });
      expect(onSwipe).toHaveBeenCalled();
    });

    it('should use custom threshold when provided', () => {
      // GIVEN/WHEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 200 })
      );

      // THEN - drag 150px should NOT trigger swipe (threshold is 200)
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 150, y: 0 }, velocity: { x: 0, y: 0 } });
      });
      expect(onSwipe).not.toHaveBeenCalled();

      // BUT drag 200px should trigger swipe
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } });
      });
      expect(onSwipe).toHaveBeenCalled();
    });
  });

  describe('Swipe Right Detection', () => {
    it('should detect swipe right when drag exceeds positive threshold', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - drag 200px to the right
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('right');
    });

    it('should call onSwipe exactly once for swipe right', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Swipe Left Detection', () => {
    it('should detect swipe left when drag exceeds negative threshold', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - drag 200px to the left
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: -200, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('left');
    });

    it('should call onSwipe exactly once for swipe left', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: -200, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Insufficient Swipe (Snap Back)', () => {
    it('should reset x to 0 when drag is below threshold', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - drag only 100px (threshold is 150)
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 100, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(result.current.x.get()).toBe(0);
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('should reset x to 0 when drag is negative but below threshold', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - drag only -100px (threshold is 150)
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: -100, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(result.current.x.get()).toBe(0);
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('should not call onSwipe when drag is exactly at threshold minus 1', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - drag exactly 149px (threshold is 150)
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 149, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should trigger swipe right on ArrowRight key', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        result.current.handleKeyDown(event as any);
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('right');
    });

    it('should trigger swipe left on ArrowLeft key', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        result.current.handleKeyDown(event as any);
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('left');
    });

    it('should not trigger swipe on other keys', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - press various other keys
      act(() => {
        ['ArrowUp', 'ArrowDown', 'Enter', 'Space', 'a'].forEach((key) => {
          const event = new KeyboardEvent('keydown', { key });
          result.current.handleKeyDown(event as any);
        });
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('should call onSwipe exactly once per keyboard press', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        result.current.handleKeyDown(event as any);
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('should not trigger swipe when disabled', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe, disabled: true }));

      // WHEN - try to swipe right
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('should not trigger keyboard shortcuts when disabled', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe, disabled: true }));

      // WHEN
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        result.current.handleKeyDown(event as any);
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('should still reset x position when disabled and drag ends', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe, disabled: true }));

      // WHEN - drag while disabled
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 100, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN - should snap back to 0
      expect(result.current.x.get()).toBe(0);
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it('should allow swipe when disabled is false', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result, rerender } = renderHook(
        ({ disabled }) => useSwipeGesture({ onSwipe, disabled }),
        { initialProps: { disabled: true } }
      );

      // WHEN - initially disabled
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } });
      });
      expect(onSwipe).not.toHaveBeenCalled();

      // Re-enable
      rerender({ disabled: false });

      // WHEN - now enabled
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('right');
    });
  });

  describe('Derived Values', () => {
    it('should provide swipeDirection based on x position', () => {
      // GIVEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // WHEN - x is positive
      act(() => {
        result.current.x.set(100);
      });

      // THEN - direction should be 'right'
      expect(result.current.swipeDirection).toBe('right');
    });

    it('should return left direction when x is negative', () => {
      // GIVEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // WHEN - x is negative
      act(() => {
        result.current.x.set(-100);
      });

      // THEN
      expect(result.current.swipeDirection).toBe('left');
    });

    it('should return null direction when x is 0', () => {
      // GIVEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // WHEN/THEN - x is 0 (initial state)
      expect(result.current.swipeDirection).toBeNull();
    });

    it('should provide swipeProgress as percentage of threshold', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe: vi.fn(), threshold: 150 })
      );

      // WHEN - x is 75 (50% of 150)
      act(() => {
        result.current.x.set(75);
      });

      // THEN
      expect(result.current.swipeProgress).toBe(0.5);
    });

    it('should cap swipeProgress at 1.0 when exceeding threshold', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe: vi.fn(), threshold: 150 })
      );

      // WHEN - x is 300 (200% of 150)
      act(() => {
        result.current.x.set(300);
      });

      // THEN
      expect(result.current.swipeProgress).toBe(1.0);
    });

    it('should return 0 progress when x is 0', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe: vi.fn() })
      );

      // WHEN/THEN - initial state
      expect(result.current.swipeProgress).toBe(0);
    });
  });

  describe('Motion Value Transforms', () => {
    it('should create rotate transform from x position', () => {
      // GIVEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // WHEN - x changes
      act(() => {
        result.current.x.set(100);
      });

      // THEN - rotate should be transformed (we verify the transform was created)
      expect(result.current.rotate).toBeDefined();
      expect(typeof result.current.rotate.get).toBe('function');
    });

    it('should create opacity transform from x position', () => {
      // GIVEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // WHEN - x changes
      act(() => {
        result.current.x.set(100);
      });

      // THEN - opacity should be transformed
      expect(result.current.opacity).toBeDefined();
      expect(typeof result.current.opacity.get).toBe('function');
    });
  });

  describe('Native Touch Events (Mobile)', () => {
    // Helper to create mock TouchEvent
    const createTouchEvent = (clientX: number, clientY: number) => ({
      touches: [{ clientX, clientY }],
      changedTouches: [{ clientX, clientY }],
    });

    it('should return onTouchStart and onTouchEnd handlers', () => {
      // GIVEN/WHEN
      const { result } = renderHook(() => useSwipeGesture({ onSwipe: vi.fn() }));

      // THEN
      expect(result.current.onTouchStart).toBeDefined();
      expect(typeof result.current.onTouchStart).toBe('function');
      expect(result.current.onTouchEnd).toBeDefined();
      expect(typeof result.current.onTouchEnd).toBe('function');
    });

    it('should detect swipe right on horizontal touch gesture', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 75 })
      );

      // Mock Date.now for timing check
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // WHEN - start touch at x=100
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 200) as any);
      });

      // Advance time by 150ms (within 300ms limit)
      mockTime = 1150;

      // End touch at x=200 (100px to the right, exceeds threshold of 75)
      act(() => {
        result.current.onTouchEnd(createTouchEvent(200, 200) as any);
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('right');

      // Restore
      Date.now = originalDateNow;
    });

    it('should detect swipe left on horizontal touch gesture', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 75 })
      );

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // WHEN - start touch at x=200
      act(() => {
        result.current.onTouchStart(createTouchEvent(200, 200) as any);
      });

      mockTime = 1150;

      // End touch at x=100 (100px to the left, exceeds threshold)
      act(() => {
        result.current.onTouchEnd(createTouchEvent(100, 200) as any);
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('left');

      Date.now = originalDateNow;
    });

    it('should not trigger swipe when horizontal movement is less than threshold', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 75 })
      );

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // WHEN - start touch at x=100
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 200) as any);
      });

      mockTime = 1150;

      // End touch at x=150 (only 50px, below threshold of 75)
      act(() => {
        result.current.onTouchEnd(createTouchEvent(150, 200) as any);
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();

      Date.now = originalDateNow;
    });

    it('should not trigger swipe when vertical movement exceeds horizontal', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 75 })
      );

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // WHEN - start touch
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 100) as any);
      });

      mockTime = 1150;

      // End touch - horizontal=100px, vertical=150px (vertical > horizontal)
      act(() => {
        result.current.onTouchEnd(createTouchEvent(200, 250) as any);
      });

      // THEN - should not trigger because it's more vertical than horizontal
      expect(onSwipe).not.toHaveBeenCalled();

      Date.now = originalDateNow;
    });

    it('should not trigger swipe when gesture is too slow (> 300ms)', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 75 })
      );

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // WHEN - start touch
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 200) as any);
      });

      // Advance time by 400ms (exceeds 300ms limit)
      mockTime = 1400;

      // End touch with sufficient distance
      act(() => {
        result.current.onTouchEnd(createTouchEvent(250, 200) as any);
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();

      Date.now = originalDateNow;
    });

    it('should not trigger swipe when disabled', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 75, disabled: true })
      );

      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // WHEN
      act(() => {
        result.current.onTouchStart(createTouchEvent(100, 200) as any);
      });

      mockTime = 1150;

      act(() => {
        result.current.onTouchEnd(createTouchEvent(250, 200) as any);
      });

      // THEN
      expect(onSwipe).not.toHaveBeenCalled();

      Date.now = originalDateNow;
    });

    it('should handle touch end without touch start gracefully', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - touch end without start
      act(() => {
        result.current.onTouchEnd(createTouchEvent(200, 200) as any);
      });

      // THEN - should not crash or trigger swipe
      expect(onSwipe).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly threshold value as swipe', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 150 })
      );

      // WHEN - exactly 150
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 150, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('right');
    });

    it('should handle exactly negative threshold value as swipe', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipeGesture({ onSwipe, threshold: 150 })
      );

      // WHEN - exactly -150
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: -150, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('left');
    });

    it('should handle very large swipe distances', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - very large swipe
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 10000, y: 0 }, velocity: { x: 0, y: 0 } });
      });

      // THEN
      expect(onSwipe).toHaveBeenCalledWith('right');
    });

    it('should ignore y offset and only consider x for swipe detection', () => {
      // GIVEN
      const onSwipe = vi.fn();
      const { result } = renderHook(() => useSwipeGesture({ onSwipe }));

      // WHEN - large y but sufficient x
      act(() => {
        result.current.handleDragEnd(null as any, { offset: { x: 200, y: 500 }, velocity: { x: 0, y: 0 } });
      });

      // THEN - should still detect swipe right
      expect(onSwipe).toHaveBeenCalledWith('right');
    });
  });
});
