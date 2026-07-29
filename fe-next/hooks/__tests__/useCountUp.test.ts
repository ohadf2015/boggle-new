import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

// Polyfill for jsdom
const mockRAF = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
const mockCAF = (id: number) => clearTimeout(id);

beforeAll(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(mockRAF);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(mockCAF);
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('useCountUp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts at 0', () => {
    const { result } = renderHook(() => useCountUp({ target: 750, duration: 1000 }));
    expect(result.current).toBe(0);
  });

  it('reaches target value after duration', () => {
    const { result } = renderHook(() => useCountUp({ target: 750, duration: 1000 }));

    // Advance past the duration
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current).toBe(750);
  });

  it('returns 0 when target is 0', () => {
    const { result } = renderHook(() => useCountUp({ target: 0, duration: 1000 }));
    expect(result.current).toBe(0);
  });

  it('respects startDelay before counting', () => {
    const { result } = renderHook(() => useCountUp({ target: 500, duration: 1000, startDelay: 500 }));

    // Before delay
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(0);
  });

  it('returns target instantly when immediate is true (reduced-motion / low-end)', () => {
    const { result } = renderHook(() => useCountUp({ target: 750, duration: 1000, immediate: true }));
    // No timers advanced — value is already the final target, no rAF storm.
    expect(result.current).toBe(750);
  });

  it('still honors immediate=true after target changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp({ target, duration: 1000, immediate: true }),
      { initialProps: { target: 100 } }
    );
    expect(result.current).toBe(100);
    rerender({ target: 320 });
    expect(result.current).toBe(320);
  });

  it('updates target when it changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp({ target, duration: 1000 }),
      { initialProps: { target: 100 } }
    );

    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current).toBe(100);

    rerender({ target: 200 });
    act(() => { vi.advanceTimersByTime(1100); });
    expect(result.current).toBe(200);
  });
});
