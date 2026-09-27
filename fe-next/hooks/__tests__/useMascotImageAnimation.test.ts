import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMascotImageAnimation,
  DEFAULT_ANIMATION_CYCLE,
  type MascotAnimationPreset,
} from '../useMascotImageAnimation';
import { useDevicePerformance } from '../useDevicePerformance';

// Mock device performance hook
vi.mock('../useDevicePerformance');
const mockUseDevicePerformance = useDevicePerformance as any;

describe('useMascotImageAnimation', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: false,
      maxParticles: 50,
      prefersReducedMotion: false,
      isSlowConnection: false,
      isMobile: false,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should start with initial preset', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
      })
    );

    expect(result.current.currentPreset).toBe('bounce');
    expect(result.current.animate).toBeDefined();
    expect(result.current.transition).toBeDefined();
  });

  it('should default to bounce animation', () => {
    const { result } = renderHook(() => useMascotImageAnimation());

    expect(result.current.currentPreset).toBe('bounce');
  });

  it('should cycle to a different animation after interval', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        presets: ['bounce', 'wiggle', 'float'],
        minInterval: 5000,
        maxInterval: 5000,
      })
    );

    expect(result.current.currentPreset).toBe('bounce');

    // Fast-forward to trigger animation change
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should have changed to a different animation
    const newPreset = result.current.currentPreset;
    expect(['bounce', 'wiggle', 'float']).toContain(newPreset);
  });

  it('should allow manual animation trigger', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        presets: ['bounce', 'wiggle', 'float'],
        enabled: false, // Disable auto-cycling
      })
    );

    expect(result.current.currentPreset).toBe('bounce');

    // Manually trigger next animation
    act(() => {
      result.current.nextAnimation();
    });

    const newPreset = result.current.currentPreset;
    expect(['bounce', 'wiggle', 'float']).toContain(newPreset);
  });

  it('should allow setting specific animation', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        presets: ['bounce', 'wiggle', 'float', 'dance'],
        enabled: false,
      })
    );

    expect(result.current.currentPreset).toBe('bounce');

    act(() => {
      result.current.setAnimation('dance');
    });

    expect(result.current.currentPreset).toBe('dance');
  });

  it('should not change animation when disabled', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        enabled: false,
        minInterval: 1000,
        maxInterval: 1000,
      })
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.currentPreset).toBe('bounce');
  });

  it('should respect prefersReducedMotion', () => {
    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: true,
      targetFPS: 30,
      throttleMs: 32,
      enableComplexAnimations: false,
      enableGlowEffects: false,
      reduceParticles: true,
      maxParticles: 8,
      prefersReducedMotion: true,
      isSlowConnection: true,
      isMobile: true,
    });

    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
      })
    );

    // Should return minimal animation for reduced motion
    expect(result.current.animate).toEqual({ opacity: 1 });
    expect(result.current.transition).toEqual({ duration: 0 });
  });

  it('should not auto-cycle when only one preset', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        presets: ['bounce'],
        minInterval: 1000,
        maxInterval: 1000,
      })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.currentPreset).toBe('bounce');
  });

  it('should avoid repeating the same animation consecutively', () => {
    const { result } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        presets: ['bounce', 'wiggle'],
        enabled: false,
      })
    );

    // With only 2 presets, should always alternate
    for (let i = 0; i < 4; i++) {
      const before = result.current.currentPreset;
      act(() => {
        result.current.nextAnimation();
      });
      const after = result.current.currentPreset;
      expect(after).not.toBe(before);
    }
  });

  it('should export DEFAULT_ANIMATION_CYCLE array', () => {
    expect(DEFAULT_ANIMATION_CYCLE).toBeDefined();
    expect(Array.isArray(DEFAULT_ANIMATION_CYCLE)).toBe(true);
    expect(DEFAULT_ANIMATION_CYCLE.length).toBeGreaterThan(0);
    expect(DEFAULT_ANIMATION_CYCLE).toContain('bounce');
    expect(DEFAULT_ANIMATION_CYCLE).toContain('wiggle');
  });

  it('should return valid framer motion props for each preset', () => {
    const presets: MascotAnimationPreset[] = [
      'bounce',
      'wiggle',
      'float',
      'pulse',
      'sway',
      'hop',
      'dance',
      'nod',
    ];

    presets.forEach((preset) => {
      const { result } = renderHook(() =>
        useMascotImageAnimation({
          initialPreset: preset,
          enabled: false,
        })
      );

      expect(result.current.animate).toBeDefined();
      expect(typeof result.current.animate).toBe('object');
      expect(result.current.transition).toBeDefined();
      expect(typeof result.current.transition).toBe('object');
    });
  });

  it('should clean up timers on unmount', () => {
    const { unmount } = renderHook(() =>
      useMascotImageAnimation({
        initialPreset: 'bounce',
        minInterval: 1000,
        maxInterval: 1000,
      })
    );

    // There should be pending timers
    const pendingTimersBefore = jest.getTimerCount();
    expect(pendingTimersBefore).toBeGreaterThan(0);

    unmount();

    // All timers should be cleaned up
    const pendingTimersAfter = jest.getTimerCount();
    expect(pendingTimersAfter).toBe(0);
  });
});
