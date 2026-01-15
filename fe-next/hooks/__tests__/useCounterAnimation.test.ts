/**
 * Tests for useCounterAnimation Hook
 *
 * Comprehensive test suite for the shared counter animation logic.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCounterAnimation } from '../useCounterAnimation';

// Mock useDevicePerformance
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    isLowEnd: false,
    enableGlowEffects: true,
    enableComplexAnimations: true,
  }),
}));

describe('useCounterAnimation', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with target value when animateOnMount is false', () => {
      const { result } = renderHook(() =>
        useCounterAnimation({ value: 100, animateOnMount: false })
      );

      expect(result.current.displayValue).toBe(100);
      expect(result.current.isAnimating).toBe(false);
    });

    it('should initialize with 0 when animateOnMount is true', () => {
      const { result } = renderHook(() =>
        useCounterAnimation({ value: 100, animateOnMount: true })
      );

      expect(result.current.displayValue).toBe(0);
    });

    it('should animate from 0 to target on mount when animateOnMount is true', async () => {
      const { result } = renderHook(() =>
        useCounterAnimation({ value: 100, animateOnMount: true, duration: 100 })
      );

      expect(result.current.displayValue).toBe(0);
      expect(result.current.isAnimating).toBe(true);

      // Fast-forward through animation
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.isAnimating).toBe(false);
      });

      expect(result.current.displayValue).toBe(100);
    });
  });

  describe('Value Changes', () => {
    it('should animate to new value when value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      expect(result.current.displayValue).toBe(0);

      // Change value
      rerender({ value: 50 });

      expect(result.current.isAnimating).toBe(true);

      // Fast-forward animation
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(50);
        expect(result.current.isAnimating).toBe(false);
      });
    });

    it('should handle multiple rapid value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      // Rapid changes
      rerender({ value: 10 });
      rerender({ value: 20 });
      rerender({ value: 30 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(30);
        expect(result.current.isAnimating).toBe(false);
      });
    });

    it('should handle negative value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 100 } }
      );

      rerender({ value: 50 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(50);
      });
    });
  });

  describe('Change Metrics', () => {
    it('should calculate correct change amount', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value }),
        { initialProps: { value: 100 } }
      );

      rerender({ value: 150 });

      expect(result.current.change).toBe(50);
      expect(result.current.isIncrease).toBe(true);
      expect(result.current.isDecrease).toBe(false);
    });

    it('should detect decreases', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value }),
        { initialProps: { value: 100 } }
      );

      rerender({ value: 75 });

      expect(result.current.change).toBe(-25);
      expect(result.current.isIncrease).toBe(false);
      expect(result.current.isDecrease).toBe(true);
    });

    it('should detect no change', () => {
      const { result } = renderHook(() =>
        useCounterAnimation({ value: 100, animateOnMount: false })
      );

      expect(result.current.change).toBe(0);
      expect(result.current.isIncrease).toBe(false);
      expect(result.current.isDecrease).toBe(false);
    });

    it('should track previous value', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, animateOnMount: false }),
        { initialProps: { value: 100 } }
      );

      const firstPrev = result.current.previousValue;
      expect(firstPrev).toBe(100);

      rerender({ value: 200 });

      // Previous value updates when new animation starts
      expect(result.current.previousValue).toBe(100);
    });
  });

  describe('Delay', () => {
    it('should delay animation start', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, delay: 500, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      // Should not animate immediately
      expect(result.current.isAnimating).toBe(false);

      // Fast-forward past delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.isAnimating).toBe(true);

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(100);
      });
    });

    it('should cancel delayed animation on unmount', () => {
      const { unmount, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, delay: 1000 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      unmount();

      // Should not crash
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    });
  });

  describe('Completion Callback', () => {
    it('should call onComplete when animation finishes', async () => {
      const onComplete = jest.fn();
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100, onComplete, animateOnMount: false }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onComplete if animation is interrupted', () => {
      const onComplete = jest.fn();
      const { rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100, onComplete, animateOnMount: false }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 50 });

      // Interrupt with new value
      act(() => {
        jest.advanceTimersByTime(50);
      });

      rerender({ value: 100 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Should only be called once (for the final animation)
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Duration', () => {
    it('should respect custom duration', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 500 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      expect(result.current.isAnimating).toBe(true);

      // Should still be animating halfway through
      act(() => {
        jest.advanceTimersByTime(250);
      });

      expect(result.current.isAnimating).toBe(true);
      expect(result.current.displayValue).toBeGreaterThan(0);
      expect(result.current.displayValue).toBeLessThan(100);

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(100);
        expect(result.current.isAnimating).toBe(false);
      });
    });

    it('should handle very short durations', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 10 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      act(() => {
        jest.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(100);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cancel animation on unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 1000 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      expect(result.current.isAnimating).toBe(true);

      unmount();

      // Should not crash when trying to update after unmount
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    });

    it('should clear delay timeout on unmount', () => {
      const { rerender, unmount } = renderHook(
        ({ value }) => useCounterAnimation({ value, delay: 1000, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      unmount();

      // Should not start animation after unmount
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero as target value', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 100 } }
      );

      rerender({ value: 0 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(0);
      });
    });

    it('should handle very large numbers', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 999999 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(999999);
      });
    });

    it('should handle negative numbers', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: -50 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBe(-50);
      });
    });

    it('should handle decimal values', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 100 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 3.14159 });

      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.displayValue).toBeCloseTo(3.14159, 4);
      });
    });
  });

  describe('Animation Progress', () => {
    it('should use ease-out curve (decelerates toward end)', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useCounterAnimation({ value, duration: 1000 }),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 100 });

      // Sample values at different points
      const samples: number[] = [];

      act(() => {
        jest.advanceTimersByTime(250);
      });
      samples.push(result.current.displayValue);

      act(() => {
        jest.advanceTimersByTime(250);
      });
      samples.push(result.current.displayValue);

      act(() => {
        jest.advanceTimersByTime(250);
      });
      samples.push(result.current.displayValue);

      // With ease-out, first half should cover more distance than second half
      const firstHalfProgress = samples[1];
      const secondHalfProgress = samples[2] - samples[1];

      expect(firstHalfProgress).toBeGreaterThan(secondHalfProgress);
    });
  });
});
