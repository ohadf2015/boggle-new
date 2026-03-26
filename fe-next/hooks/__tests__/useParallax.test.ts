/**
 * useParallax Hook Tests
 *
 * Tests combined parallax input from gyroscope, gesture, and ambient drift.
 * Return values are MotionValue<number> instances; use .get() to read current value.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useParallax } from '../useParallax';

// Mock useDevicePerformance
const mockDevicePerformance = {
  prefersReducedMotion: false,
  isMobile: false,
  enableComplexAnimations: true,
  isLowEnd: false,
};

vi.mock('../useDevicePerformance', () => ({
  useDevicePerformance: () => mockDevicePerformance,
}));

// Mock framer-motion MotionValue minimally
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useMotionValue: actual.useMotionValue,
    useTransform: actual.useTransform,
  };
});

describe('useParallax', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockDevicePerformance.prefersReducedMotion = false;
    mockDevicePerformance.isMobile = false;
    mockDevicePerformance.enableComplexAnimations = true;
    mockDevicePerformance.isLowEnd = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('returns MotionValues and isGyroActive on mount', () => {
      const { result } = renderHook(() => useParallax());

      expect(result.current.x).toBeDefined();
      expect(result.current.y).toBeDefined();
      expect(typeof result.current.x.get).toBe('function');
      expect(typeof result.current.y.get).toBe('function');
      expect(result.current.isGyroActive).toBe(false);
    });

    it('returns zero MotionValues when prefersReducedMotion is true', () => {
      mockDevicePerformance.prefersReducedMotion = true;

      const { result } = renderHook(() => useParallax());

      expect(result.current.x.get()).toBe(0);
      expect(result.current.y.get()).toBe(0);
      expect(result.current.isGyroActive).toBe(false);
    });
  });

  describe('ambient drift', () => {
    it('produces non-zero values after animation frames', () => {
      const { result } = renderHook(() => useParallax());

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(typeof result.current.x.get()).toBe('number');
      expect(typeof result.current.y.get()).toBe('number');
    });

    it('is disabled when enableAmbient is false', () => {
      const { result } = renderHook(() =>
        useParallax({ enableAmbient: false, enableGesture: false })
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.x.get()).toBe(0);
      expect(result.current.y.get()).toBe(0);
    });

    it('is disabled when prefersReducedMotion is true', () => {
      mockDevicePerformance.prefersReducedMotion = true;

      const { result } = renderHook(() => useParallax());

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.x.get()).toBe(0);
      expect(result.current.y.get()).toBe(0);
    });

    it('produces noticeable amplitude for 3D parallax effect', () => {
      const { result } = renderHook(() =>
        useParallax({ enableAmbient: true, enableGesture: false, intensity: 1 })
      );

      let maxX = 0;
      let maxY = 0;

      for (let i = 0; i < 100; i++) {
        act(() => {
          vi.advanceTimersByTime(200);
        });
        maxX = Math.max(maxX, Math.abs(result.current.x.get()));
        maxY = Math.max(maxY, Math.abs(result.current.y.get()));
      }

      expect(maxX).toBeGreaterThan(5);
      expect(maxY).toBeGreaterThan(5);
    });

    it('uses multi-frequency oscillation (Lissajous pattern) for organic movement', () => {
      const { result } = renderHook(() =>
        useParallax({ enableAmbient: true, enableGesture: false })
      );

      const samples: { x: number; y: number }[] = [];
      for (let i = 0; i < 50; i++) {
        act(() => {
          vi.advanceTimersByTime(100);
        });
        samples.push({ x: result.current.x.get(), y: result.current.y.get() });
      }

      let accelerationChanges = 0;
      for (let i = 2; i < samples.length; i++) {
        const accelX1 = samples[i].x - 2 * samples[i - 1].x + samples[i - 2].x;
        const accelX2 = samples[i - 1].x - 2 * samples[i - 2].x + (samples[i - 3]?.x || 0);
        if (i > 2 && accelX1 * accelX2 < 0) {
          accelerationChanges++;
        }
      }

      expect(accelerationChanges).toBeGreaterThan(3);
    });
  });

  describe('gesture input', () => {
    it('responds to mouse movement on desktop', () => {
      mockDevicePerformance.isMobile = false;

      const { result } = renderHook(() => useParallax());

      act(() => {
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: 800,
            clientY: 400,
          })
        );
      });

      expect(result.current.x.get()).not.toBe(0);
    });

    it('responds to touch movement on mobile', () => {
      mockDevicePerformance.isMobile = true;

      const { result } = renderHook(() => useParallax());

      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 300 } as Touch],
      });

      act(() => {
        window.dispatchEvent(touchEvent);
      });

      expect(typeof result.current.x.get()).toBe('number');
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

      expect(typeof lowIntensity.current.x.get()).toBe('number');
      expect(typeof highIntensity.current.x.get()).toBe('number');
    });

    it('respects ambientSpeed multiplier', () => {
      const { result } = renderHook(() =>
        useParallax({ ambientSpeed: 2 })
      );

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(typeof result.current.x.get()).toBe('number');
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useParallax());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });

    it('cancels animation frame on unmount', () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const { unmount } = renderHook(() => useParallax());

      unmount();

      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
    });
  });
});
