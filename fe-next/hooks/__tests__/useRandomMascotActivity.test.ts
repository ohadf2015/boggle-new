import { renderHook, act, waitFor } from '@testing-library/react';
import { useRandomMascotActivity, DEFAULT_IDLE_ACTIVITIES } from '../useRandomMascotActivity';
import { useDevicePerformance } from '../useDevicePerformance';

// Mock device performance hook
jest.mock('../useDevicePerformance');
const mockUseDevicePerformance = useDevicePerformance as jest.MockedFunction<
  typeof useDevicePerformance
>;

describe('useRandomMascotActivity', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
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
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should start with base variant', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
      })
    );

    expect(result.current.currentVariant).toBe('happy');
    expect(result.current.isDoingActivity).toBe(false);
  });

  it('should trigger random activity after interval', async () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'happy',
        minInterval: 10000,
        maxInterval: 10000,
        activityDuration: 2000,
      })
    );

    // Initially at base
    expect(result.current.currentVariant).toBe('happy');

    // Fast-forward to trigger activity
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(result.current.isDoingActivity).toBe(true);
      expect(DEFAULT_IDLE_ACTIVITIES).toContain(result.current.currentVariant);
    });

    // Should return to base after activity duration
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.currentVariant).toBe('happy');
      expect(result.current.isDoingActivity).toBe(false);
    });
  });

  it('should allow manual activity trigger', () => {
    const { result } = renderHook(() =>
      useRandomMascotActivity({
        baseVariant: 'thinking',
        activities: ['eating_pizza', 'gaming'],
        activityDuration: 3000,
      })
    );

    // Manually trigger activity
    act(() => {
      result.current.triggerActivity();
    });

    expect(result.current.isDoingActivity).toBe(true);
    expect(['eating_pizza', 'gaming']).toContain(result.current.currentVariant);

    // Reset after duration
    act(() => {
      jest.advanceTimersByTime(3000);
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
      jest.advanceTimersByTime(10000);
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
      jest.advanceTimersByTime(10000);
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
});
