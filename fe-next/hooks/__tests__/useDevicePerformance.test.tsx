import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockTier = vi.hoisted(() => {
  let downgraded = false;
  const listeners = new Set<() => void>();
  return {
    startFrameWatch: vi.fn(),
    getRuntimeDowngrade: vi.fn(() => downgraded),
    getRuntimeDowngradeServer: () => false,
    subscribeRuntimeTier: vi.fn((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    __set(v: boolean) {
      downgraded = v;
      listeners.forEach((l) => l());
    },
    __reset() {
      downgraded = false;
      listeners.clear();
    },
  };
});

vi.mock('@/lib/perf/runtimeTier', () => mockTier);

// vitest.setup.ts stubs this hook globally for component tests. This suite is the
// one place that must exercise the real implementation.
vi.unmock('@/hooks/useDevicePerformance');

import { useDevicePerformance } from '../useDevicePerformance';

/** Present the device as comfortably high-end so any downgrade must come from
 *  the runtime watcher, not from the static heuristics. */
function stubHighEndDevice() {
  vi.stubGlobal('navigator', {
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120',
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
}

describe('useDevicePerformance runtime downgrade', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockTier.__reset();
    mockTier.startFrameWatch.mockClear();
    stubHighEndDevice();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts the frame watch once the app has settled', () => {
    // Given a mounted consumer
    renderHook(() => useDevicePerformance());
    // When the settle delay has not yet elapsed
    expect(mockTier.startFrameWatch).not.toHaveBeenCalled();
    // Then the watch begins only after the app stops hydrating
    act(() => { vi.advanceTimersByTime(5000); });
    expect(mockTier.startFrameWatch).toHaveBeenCalled();
  });

  it('reports a capable device as high-end while frames are healthy', () => {
    // Given a device the static heuristics rate as high-end
    const { result } = renderHook(() => useDevicePerformance());
    // When no runtime downgrade has occurred
    // Then full effects stay enabled
    expect(result.current.isLowEnd).toBe(false);
    expect(result.current.enableComplexAnimations).toBe(true);
  });

  it('downgrades a statically high-end device that cannot hold the frame budget', () => {
    // Given a device that reports 8 cores / 8GB (reads as high-end)
    const { result } = renderHook(() => useDevicePerformance());
    expect(result.current.isLowEnd).toBe(false);
    // When the frame watcher observes sustained slow frames
    act(() => { mockTier.__set(true); });
    // Then the hook downgrades it despite the optimistic static hints
    expect(result.current.isLowEnd).toBe(true);
    expect(result.current.enableComplexAnimations).toBe(false);
    expect(result.current.enableGlowEffects).toBe(false);
    expect(result.current.reduceParticles).toBe(true);
    expect(result.current.targetFPS).toBe(30);
    expect(result.current.maxParticles).toBeLessThanOrEqual(4);
  });

  it('keeps the downgrade visible to every consumer', () => {
    // Given two independent consumers of the shared tier
    const a = renderHook(() => useDevicePerformance());
    const b = renderHook(() => useDevicePerformance());
    // When the device is downgraded at runtime
    act(() => { mockTier.__set(true); });
    // Then both see it — the tier is global, not per-component
    expect(a.result.current.isLowEnd).toBe(true);
    expect(b.result.current.isLowEnd).toBe(true);
  });
});
