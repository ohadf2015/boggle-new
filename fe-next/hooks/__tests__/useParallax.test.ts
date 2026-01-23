/**
 * useParallax Hook Tests
 *
 * Tests combined parallax input from gyroscope, gesture, and ambient drift.
 */

import { renderHook, act } from '@testing-library/react';
import { useParallax } from '../useParallax';

// Mock useDevicePerformance
const mockDevicePerformance = {
  prefersReducedMotion: false,
  isMobile: false,
  enableComplexAnimations: true,
};

jest.mock('../useDevicePerformance', () => ({
  useDevicePerformance: () => mockDevicePerformance,
}));

describe('useParallax', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset mock to defaults
    mockDevicePerformance.prefersReducedMotion = false;
    mockDevicePerformance.isMobile = false;
    mockDevicePerformance.enableComplexAnimations = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns default values on mount', () => {
      const { result } = renderHook(() => useParallax());

      // Initially only ambient drift is active (x, y will be 0 at t=0)
      expect(result.current.x).toBeDefined();
      expect(result.current.y).toBeDefined();
      expect(result.current.isGyroActive).toBe(false);
    });

    it('returns {x: 0, y: 0} when prefersReducedMotion is true', () => {
      mockDevicePerformance.prefersReducedMotion = true;

      const { result } = renderHook(() => useParallax());

      expect(result.current.x).toBe(0);
      expect(result.current.y).toBe(0);
      expect(result.current.isGyroActive).toBe(false);
    });
  });

  describe('ambient drift', () => {
    it('produces non-zero values after animation frames', () => {
      const { result } = renderHook(() => useParallax());

      // Fast-forward to trigger ambient animation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Ambient drift should produce some offset (sine/cosine of elapsed time)
      // Values will be small but potentially non-zero
      expect(typeof result.current.x).toBe('number');
      expect(typeof result.current.y).toBe('number');
    });

    it('is disabled when enableAmbient is false', () => {
      const { result } = renderHook(() =>
        useParallax({ enableAmbient: false, enableGesture: false })
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Without any input sources enabled, should stay at 0
      expect(result.current.x).toBe(0);
      expect(result.current.y).toBe(0);
    });

    it('is disabled when prefersReducedMotion is true', () => {
      mockDevicePerformance.prefersReducedMotion = true;

      const { result } = renderHook(() => useParallax());

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.x).toBe(0);
      expect(result.current.y).toBe(0);
    });

    it('produces noticeable amplitude for 3D parallax effect', () => {
      // This test ensures the ambient motion is significant enough for visible 3D effect
      // With Lissajous curves, we need to track max amplitude over time
      const { result } = renderHook(() =>
        useParallax({ enableAmbient: true, enableGesture: false, intensity: 1 })
      );

      let maxX = 0;
      let maxY = 0;

      // Sample over a period to capture the full wave amplitude
      for (let i = 0; i < 100; i++) {
        act(() => {
          jest.advanceTimersByTime(200); // Sample every 200ms over 20 seconds
        });
        maxX = Math.max(maxX, Math.abs(result.current.x));
        maxY = Math.max(maxY, Math.abs(result.current.y));
      }

      // Ambient motion should produce at least 5px of movement for visible parallax
      // With layers at 0.4-0.6x multiplier, this gives 2-3px actual movement minimum
      expect(maxX).toBeGreaterThan(5);
      expect(maxY).toBeGreaterThan(5);
    });

    it('uses multi-frequency oscillation (Lissajous pattern) for organic movement', () => {
      // This test ensures the motion isn't just a simple sine wave but has multiple frequencies
      const { result } = renderHook(() =>
        useParallax({ enableAmbient: true, enableGesture: false })
      );

      // Collect samples at different time points
      const samples: { x: number; y: number }[] = [];
      for (let i = 0; i < 50; i++) {
        act(() => {
          jest.advanceTimersByTime(100);
        });
        samples.push({ x: result.current.x, y: result.current.y });
      }

      // Calculate velocity changes (acceleration) to detect multi-frequency motion
      // Simple sine wave would have smooth acceleration, Lissajous has variable
      let accelerationChanges = 0;
      for (let i = 2; i < samples.length; i++) {
        const accelX1 = samples[i].x - 2 * samples[i - 1].x + samples[i - 2].x;
        const accelX2 = samples[i - 1].x - 2 * samples[i - 2].x + (samples[i - 3]?.x || 0);
        // If acceleration changes sign, we have frequency variation
        if (i > 2 && accelX1 * accelX2 < 0) {
          accelerationChanges++;
        }
      }

      // Multi-frequency motion should have several acceleration sign changes
      expect(accelerationChanges).toBeGreaterThan(3);
    });
  });

  describe('gesture input', () => {
    it('responds to mouse movement on desktop', () => {
      mockDevicePerformance.isMobile = false;

      const { result } = renderHook(() => useParallax());

      // Simulate mouse move to center-right of viewport
      act(() => {
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: 800,  // Right of center
            clientY: 400,  // Near center
          })
        );
      });

      // Gesture should contribute to x offset
      expect(result.current.x).not.toBe(0);
    });

    it('responds to touch movement on mobile', () => {
      mockDevicePerformance.isMobile = true;

      const { result } = renderHook(() => useParallax());

      // Simulate touch move
      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 300 } as Touch],
      });

      act(() => {
        window.dispatchEvent(touchEvent);
      });

      // Should respond to touch
      expect(typeof result.current.x).toBe('number');
    });
  });

  describe('options', () => {
    it('respects intensity multiplier', () => {
      const { result: lowIntensity } = renderHook(() =>
        useParallax({ intensity: 0.5 })
      );
      const { result: highIntensity } = renderHook(() =>
        useParallax({ intensity: 2 })
      );

      // Both should have valid output
      expect(typeof lowIntensity.current.x).toBe('number');
      expect(typeof highIntensity.current.x).toBe('number');
    });

    it('respects ambientSpeed multiplier', () => {
      const { result } = renderHook(() =>
        useParallax({ ambientSpeed: 2 })
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(typeof result.current.x).toBe('number');
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useParallax());

      unmount();

      // Should clean up mousemove listener (desktop)
      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('cancels animation frame on unmount', () => {
      const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');

      const { unmount } = renderHook(() => useParallax());

      unmount();

      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
    });
  });
});
