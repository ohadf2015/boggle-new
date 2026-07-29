import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useRandomMascotActivity,
  DEFAULT_IDLE_ACTIVITIES,
  DEFAULT_BASE_VARIANTS,
} from '../useRandomMascotActivity';

// Use global mock from jest.setup.js
 
const mockUseDevicePerformance = (global as any).mockUseDevicePerformance;

describe('useRandomMascotActivity', () => {
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

  it('should start with base variant', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
      })
    );

    expect(result.current.currentVariant).toBe('happy');
    expect(result.current.currentBaseVariant).toBe('happy');
    expect(result.current.isDoingActivity).toBe(false);
  });

  it('should trigger first activity after initial delay (shorter than regular interval)', async () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
        initialDelayMin: 2000,
        initialDelayMax: 2000,
        minInterval: 10000,
        maxInterval: 10000,
        activityDuration: 2000,
      })
    );

    // Initially at base
    expect(result.current.currentVariant).toBe('happy');

    // Fast-forward to trigger first activity (uses initial delay of 2s, not regular 10s)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.isDoingActivity).toBe(true);
      expect(DEFAULT_IDLE_ACTIVITIES).toContain(result.current.currentVariant);
    });

    // Should return to base after activity duration
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.currentVariant).toBe('happy');
      expect(result.current.isDoingActivity).toBe(false);
    });
  });

  it('should use regular interval for subsequent activities', async () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
        initialDelayMin: 1000,
        initialDelayMax: 1000,
        minInterval: 5000,
        maxInterval: 5000,
        activityDuration: 1000,
      })
    );

    // Fast-forward to trigger first activity (initial delay: 1s)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isDoingActivity).toBe(true);
    });

    // Wait for activity to complete (1s duration)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isDoingActivity).toBe(false);
    });

    // Second activity should not trigger at 1s (initial delay) but at 5s (regular interval)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isDoingActivity).toBe(false);

    // Now wait for regular interval (5s total from after first activity)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(result.current.isDoingActivity).toBe(true);
    });
  });

  it('should allow manual activity trigger', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'thinking',
        activities: ['eating_pizza', 'skateboarding'],
        activityDuration: 3000,
      })
    );

    // Manually trigger activity
    act(() => {
      result.current.triggerActivity();
    });

    expect(result.current.isDoingActivity).toBe(true);
    expect(['eating_pizza', 'skateboarding']).toContain(result.current.currentVariant);

    // Reset after duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.currentVariant).toBe('thinking');
    expect(result.current.isDoingActivity).toBe(false);
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
      useRandomMascotActivity({
        baseVariant: 'happy',
        minInterval: 5000,
        maxInterval: 5000,
      })
    );

    // Should not trigger activities when reduced motion is preferred
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.currentVariant).toBe('happy');
    expect(result.current.isDoingActivity).toBe(false);
  });

  it('should not trigger activity when already doing one', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
        activities: ['eating_pizza'],
        activityDuration: 5000,
      })
    );

    // Trigger first activity
    act(() => {
      result.current.triggerActivity();
    });

    const firstActivity = result.current.currentVariant;
    expect(result.current.isDoingActivity).toBe(true);

    // Try to trigger another - should be ignored
    act(() => {
      result.current.triggerActivity();
    });

    expect(result.current.currentVariant).toBe(firstActivity);
    expect(result.current.isDoingActivity).toBe(true);
  });

  it('should allow reset to base immediately', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'encouraging',
        activityDuration: 5000,
      })
    );

    // Trigger activity
    act(() => {
      result.current.triggerActivity();
    });

    expect(result.current.isDoingActivity).toBe(true);

    // Reset immediately
    act(() => {
      result.current.resetToBase();
    });

    expect(result.current.currentVariant).toBe('encouraging');
    expect(result.current.isDoingActivity).toBe(false);
  });

  it('should update when base variant changes', () => {
    const { result, rerender } = renderHook(
      ({ base }: { base: 'happy' | 'excited' }) =>
        useRandomMascotActivity({
          baseVariant: base,
        }),
      {
        initialProps: { base: 'happy' as 'happy' | 'excited' },
      }
    );

    expect(result.current.currentVariant).toBe('happy');

    // Change base variant
    rerender({ base: 'excited' });

    expect(result.current.currentVariant).toBe('excited');
  });

  it('should not trigger activities when disabled', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
        enabled: false,
        minInterval: 5000,
        maxInterval: 5000,
      })
    );

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.currentVariant).toBe('happy');
    expect(result.current.isDoingActivity).toBe(false);
  });

  it('should clean up timers on unmount', () => {
    const { unmount } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
      })
    );

    const pendingTimersBefore = jest.getTimerCount();
    expect(pendingTimersBefore).toBeGreaterThan(0);

    unmount();

    const pendingTimersAfter = jest.getTimerCount();
    expect(pendingTimersAfter).toBe(0);
  });

  describe('base variant cycling', () => {
    it('should cycle through base variants when enabled', () => {
      const { result } = renderHook(() =>
        useRandomMascotActivity({
          baseVariant: 'happy',
          baseVariants: ['gaming', 'thinking', 'oops'],
          cycleBaseVariants: true,
          activityDuration: 1000,
        })
      );

      // Start with happy
      expect(result.current.currentBaseVariant).toBe('happy');

      // Trigger activity
      act(() => {
        result.current.triggerActivity();
      });

      // During activity
      expect(result.current.isDoingActivity).toBe(true);
      expect(DEFAULT_IDLE_ACTIVITIES).toContain(result.current.currentVariant);

      // Complete activity - should cycle to a new base
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isDoingActivity).toBe(false);
      // New base should be from the combined list (original + baseVariants)
      const allVariants = ['happy', 'gaming', 'thinking', 'oops'];
      expect(allVariants).toContain(result.current.currentBaseVariant);
      expect(result.current.currentVariant).toBe(result.current.currentBaseVariant);
    });

    it('should NOT cycle base variants when cycleBaseVariants is false', () => {
      const { result } = renderHook(() =>
        useRandomMascotActivity({
          baseVariant: 'happy',
          baseVariants: ['gaming', 'thinking'],
          cycleBaseVariants: false,
          activityDuration: 1000,
        })
      );

      // Trigger multiple activities and verify base stays the same
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.triggerActivity();
        });
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(result.current.currentBaseVariant).toBe('happy');
        expect(result.current.currentVariant).toBe('happy');
      }
    });

    it('should export DEFAULT_BASE_VARIANTS array', () => {
      expect(DEFAULT_BASE_VARIANTS).toBeDefined();
      expect(Array.isArray(DEFAULT_BASE_VARIANTS)).toBe(true);
      expect(DEFAULT_BASE_VARIANTS.length).toBe(11); // 7 original + 4 new (waving, spectating, mindblown, flexing)
      expect(DEFAULT_BASE_VARIANTS).toContain('happy');
      expect(DEFAULT_BASE_VARIANTS).toContain('gaming');
      expect(DEFAULT_BASE_VARIANTS).toContain('thinking');
      expect(DEFAULT_BASE_VARIANTS).toContain('oops');
      expect(DEFAULT_BASE_VARIANTS).toContain('celebration');
      expect(DEFAULT_BASE_VARIANTS).toContain('dj');
      expect(DEFAULT_BASE_VARIANTS).toContain('trophy');
      expect(DEFAULT_BASE_VARIANTS).toContain('waving');
      expect(DEFAULT_BASE_VARIANTS).toContain('spectating');
      expect(DEFAULT_BASE_VARIANTS).toContain('mindblown');
      expect(DEFAULT_BASE_VARIANTS).toContain('flexing');
    });

    it('should use currentBaseVariant when resetting', () => {
      const { result } = renderHook(() =>
        useRandomMascotActivity({
          baseVariant: 'happy',
          baseVariants: ['gaming'],
          cycleBaseVariants: true,
          activityDuration: 1000,
        })
      );

      // Trigger and complete activity to potentially cycle base
      act(() => {
        result.current.triggerActivity();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const currentBase = result.current.currentBaseVariant;

      // Trigger another activity
      act(() => {
        result.current.triggerActivity();
      });

      // Reset should go to current base (not original)
      act(() => {
        result.current.resetToBase();
      });

      expect(result.current.currentVariant).toBe(currentBase);
    });
  });
});
