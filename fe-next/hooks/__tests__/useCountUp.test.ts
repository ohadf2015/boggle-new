import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

// Polyfill for jsdom
const mockRAF = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
const mockCAF = (id: number) => clearTimeout(id);

beforeAll(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(mockRAF);
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(mockCAF);
  jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('useCountUp', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('starts at 0', () => {
    const { result } = renderHook(() => useCountUp({ target: 750, duration: 1000 }));
    expect(result.current).toBe(0);
  });

  it('reaches target value after duration', () => {
    const { result } = renderHook(() => useCountUp({ target: 750, duration: 1000 }));

    // Advance past the duration
    act(() => { jest.advanceTimersByTime(1100); });
    expect(result.current).toBe(750);
  });

  it('returns 0 when target is 0', () => {
    const { result } = renderHook(() => useCountUp({ target: 0, duration: 1000 }));
    expect(result.current).toBe(0);
  });

  it('respects startDelay before counting', () => {
    const { result } = renderHook(() => useCountUp({ target: 500, duration: 1000, startDelay: 500 }));

    // Before delay
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current).toBe(0);
  });

  it('updates target when it changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp({ target, duration: 1000 }),
      { initialProps: { target: 100 } }
    );

    act(() => { jest.advanceTimersByTime(1100); });
    expect(result.current).toBe(100);

    rerender({ target: 200 });
    act(() => { jest.advanceTimersByTime(1100); });
    expect(result.current).toBe(200);
  });
});
