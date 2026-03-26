import { renderHook, act } from '@testing-library/react';
import { useBlastIntensity } from '../hooks/useBlastIntensity';

const defaultOptions = {
  comboLevel: 0,
  cascadeChainLevel: 0,
  comboStreakLevel: 0,
  isHotPhase: false,
  wordsFoundCount: 0,
};

describe('useBlastIntensity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 with no active effects', () => {
    const { result } = renderHook(() => useBlastIntensity(defaultOptions));
    expect(result.current).toBe(0);
  });

  it('combo level 4 gives intensity 1', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, comboLevel: 4 })
    );
    expect(result.current).toBe(1);
  });

  it('combo level 6 gives intensity 2', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, comboLevel: 6 })
    );
    expect(result.current).toBe(2);
  });

  it('combo level 8 gives intensity 3', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, comboLevel: 8 })
    );
    expect(result.current).toBe(3);
  });

  it('cascade chain adds intensity', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, cascadeChainLevel: 1 })
    );
    expect(result.current).toBe(1);

    const { result: result2 } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, cascadeChainLevel: 3 })
    );
    expect(result2.current).toBe(2);
  });

  it('combo streak adds intensity at level 4+', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, comboStreakLevel: 4 })
    );
    expect(result.current).toBe(1);
  });

  it('hot phase adds 1', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({ ...defaultOptions, isHotPhase: true })
    );
    expect(result.current).toBe(1);
  });

  it('caps at 5', () => {
    const { result } = renderHook(() =>
      useBlastIntensity({
        comboLevel: 8,
        cascadeChainLevel: 3,
        comboStreakLevel: 4,
        isHotPhase: true,
        wordsFoundCount: 50,
      })
    );
    expect(result.current).toBe(5);
  });

  it('decays intensity by 1 every 2 seconds when target drops', () => {
    const { result, rerender } = renderHook(
      (props) => useBlastIntensity(props),
      { initialProps: { ...defaultOptions, comboLevel: 8 } }
    );
    expect(result.current).toBe(3);

    // Drop combo
    rerender({ ...defaultOptions, comboLevel: 0 });
    // Should still be 3 immediately (decay hasn't started yet fully)
    // After 2s, drops by 1
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe(2);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe(1);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe(0);
  });
});
