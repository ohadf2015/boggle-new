/**
 * Tests for useScreenShake hook
 *
 * This hook provides screen shake effects for game juice feedback.
 * It uses Web Animations API for GPU-accelerated transforms and respects
 * the user's prefers-reduced-motion preference.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScreenShake } from '../useScreenShake';

// Mock useDevicePerformance
vi.mock('../useDevicePerformance', () => ({
  useDevicePerformance: vi.fn(() => ({
    prefersReducedMotion: false,
    isLowEnd: false,
  })),
}));

// Mock Web Animations API
const mockAnimate = vi.fn<
  { finished: Promise<void>; cancel: any },
  [Keyframe[] | PropertyIndexedKeyframes | null, KeyframeAnimationOptions?]
>(() => ({
  finished: Promise.resolve(),
  cancel: vi.fn(),
}));

describe('useScreenShake', () => {
  let mockElement: HTMLDivElement;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a mock element with animate method
    mockElement = document.createElement('div');
    mockElement.animate = mockAnimate as unknown as typeof mockElement.animate;

    // Reset mock implementation
    const { useDevicePerformance } = await import('../useDevicePerformance');
    useDevicePerformance.mockReturnValue({
      prefersReducedMotion: false,
      isLowEnd: false,
    });
  });

  describe('Basic functionality', () => {
    it('should return shakeRef and shake function', () => {
      const { result } = renderHook(() => useScreenShake());

      expect(result.current.shakeRef).toBeDefined();
      expect(result.current.shakeRef.current).toBeNull(); // Not attached yet
      expect(result.current.shake).toBeInstanceOf(Function);
    });

    it('should trigger shake animation when shake is called', () => {
      const { result } = renderHook(() => useScreenShake());

      // Attach ref to mock element
      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      // Trigger shake
      act(() => {
        result.current.shake();
      });

      expect(mockAnimate).toHaveBeenCalledTimes(1);
      expect(mockAnimate).toHaveBeenCalledWith(
        expect.any(Array), // keyframes
        expect.objectContaining({
          duration: expect.any(Number),
          easing: 'ease-in-out',
        })
      );
    });

    it('should not animate if ref is not attached', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shake();
      });

      expect(mockAnimate).not.toHaveBeenCalled();
    });
  });

  describe('Intensity parameter', () => {
    it('should use default intensity of 4px', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      const keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];
      const hasDefaultIntensity = keyframes.some(
        (frame: Keyframe) =>
          (frame.transform as string | undefined)?.includes('4px') || (frame.transform as string | undefined)?.includes('-4px')
      );
      expect(hasDefaultIntensity).toBe(true);
    });

    it('should scale shake magnitude based on intensity parameter', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake(8); // High intensity
      });

      const keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];
      const hasHighIntensity = keyframes.some(
        (frame: Keyframe) =>
          (frame.transform as string | undefined)?.includes('8px') || (frame.transform as string | undefined)?.includes('-8px')
      );
      expect(hasHighIntensity).toBe(true);
    });

    it('should clamp intensity between 2 and 8px', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      // Test minimum clamp
      act(() => {
        result.current.shake(0); // Should clamp to 2
      });

      let keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];
      let hasMinIntensity = keyframes.some(
        (frame: Keyframe) =>
          (frame.transform as string | undefined)?.includes('2px') || (frame.transform as string | undefined)?.includes('-2px')
      );
      expect(hasMinIntensity).toBe(true);

      mockAnimate.mockClear();

      // Test maximum clamp
      act(() => {
        result.current.shake(100); // Should clamp to 8
      });

      keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];
      const hasMaxIntensity = keyframes.some(
        (frame: Keyframe) =>
          (frame.transform as string | undefined)?.includes('8px') || (frame.transform as string | undefined)?.includes('-8px')
      );
      expect(hasMaxIntensity).toBe(true);
    });
  });

  describe('Duration parameter', () => {
    it('should use default duration of 200ms', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      const options = mockAnimate.mock.calls[0][1]!;
      expect(options.duration).toBe(200);
    });

    it('should use custom duration when provided', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake(4, 300);
      });

      const options = mockAnimate.mock.calls[0][1]!;
      expect(options.duration).toBe(300);
    });

    it('should clamp duration between 100 and 300ms', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      // Test minimum clamp
      act(() => {
        result.current.shake(4, 50); // Should clamp to 100
      });

      let options = mockAnimate.mock.calls[0][1]!;
      expect(options.duration).toBe(100);

      mockAnimate.mockClear();

      // Test maximum clamp
      act(() => {
        result.current.shake(4, 500); // Should clamp to 300
      });

      options = mockAnimate.mock.calls[0][1]!;
      expect(options.duration).toBe(300);
    });
  });

  describe('Reduced motion preference', () => {
    it('should skip shake animation when prefers-reduced-motion is enabled', async () => {
      const { useDevicePerformance } = await import('../useDevicePerformance');
      useDevicePerformance.mockReturnValue({
        prefersReducedMotion: true,
        isLowEnd: false,
      });

      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      // Should not call shake animation
      const shakeAnimations = mockAnimate.mock.calls.filter(
        call => {
          const keyframes = call[0] as Keyframe[];
          return keyframes?.some(
            (frame: Keyframe) => (frame.transform as string | undefined)?.includes('translate')
          );
        }
      );
      expect(shakeAnimations.length).toBe(0);
    });

    it('should provide flash feedback for reduced-motion users', async () => {
      const { useDevicePerformance } = await import('../useDevicePerformance');
      useDevicePerformance.mockReturnValue({
        prefersReducedMotion: true,
        isLowEnd: false,
      });

      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      // Should call opacity flash animation instead
      const flashAnimations = mockAnimate.mock.calls.filter(
        call => {
          const keyframes = call[0] as Keyframe[];
          return keyframes?.some(
            (frame: Keyframe) => typeof frame.opacity === 'number'
          );
        }
      );
      expect(flashAnimations.length).toBe(1);
    });
  });

  describe('Transform-only animations', () => {
    it('should only use transform property (no layout properties)', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      const keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];

      // Check all keyframes only use transform
      keyframes.forEach((frame: Record<string, unknown>) => {
        const props = Object.keys(frame);
        expect(props).not.toContain('left');
        expect(props).not.toContain('top');
        expect(props).not.toContain('width');
        expect(props).not.toContain('height');
        expect(props).not.toContain('margin');
        expect(props).not.toContain('padding');

        // Should only have transform and offset
        const allowedProps = ['transform', 'offset'];
        props.forEach(prop => {
          expect(allowedProps).toContain(prop);
        });
      });
    });

    it('should use translate for shake movement', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      const keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];

      // All transform values should use translate
      const allTransformsUseTranslate = keyframes.every(
        (frame: Keyframe) =>
          !frame.transform || (frame.transform as string).includes('translate')
      );
      expect(allTransformsUseTranslate).toBe(true);
    });
  });

  describe('Keyframe pattern', () => {
    it('should have multiple keyframes for random-feeling shake', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      const keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];

      // Should have at least 5 keyframes for natural shake
      expect(keyframes.length).toBeGreaterThanOrEqual(5);
    });

    it('should start and end at origin (no permanent offset)', () => {
      const { result } = renderHook(() => useScreenShake());

      act(() => {
        result.current.shakeRef.current = mockElement;
      });

      act(() => {
        result.current.shake();
      });

      const keyframes = mockAnimate.mock.calls[0][0] as Keyframe[];

      // First keyframe should be at origin
      expect(keyframes[0].transform).toMatch(/translate\(0px,\s*0px\)/);

      // Last keyframe should be at origin
      expect(keyframes[keyframes.length - 1].transform).toMatch(/translate\(0px,\s*0px\)/);
    });
  });
});
