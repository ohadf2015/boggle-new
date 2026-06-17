import { renderHook, act } from '@testing-library/react';
import { useShiritoriTempo } from '../useShiritoriTempo';

describe('useShiritoriTempo', () => {
  it('starts inactive with zero count', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    expect(result.current.tempoActive).toBe(false);
    expect(result.current.consecutiveFast).toBe(0);
  });

  it('does not count first submission (no prior gap to measure)', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(1000));
    expect(result.current.consecutiveFast).toBe(0);
    expect(result.current.tempoActive).toBe(false);
  });

  it('increments count on each fast gap (≤ 2000ms)', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(1000));
    act(() => result.current.recordSubmit(2500)); // 1500ms gap
    expect(result.current.consecutiveFast).toBe(1);
    expect(result.current.tempoActive).toBe(false);
  });

  it('activates after 3 consecutive fast gaps (4 fast words)', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));  // count=1
    act(() => result.current.recordSubmit(3000));  // count=2
    act(() => result.current.recordSubmit(4500));  // count=3 → active
    expect(result.current.tempoActive).toBe(true);
  });

  it('does NOT activate with only 2 fast gaps', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));
    act(() => result.current.recordSubmit(3000));
    expect(result.current.tempoActive).toBe(false);
  });

  it('boundary: gap exactly 2000ms counts as fast', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(2000)); // exactly 2000ms = fast
    expect(result.current.consecutiveFast).toBe(1);
  });

  it('boundary: gap 2001ms resets chain', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));  // count=1
    act(() => result.current.recordSubmit(3501));  // gap 2001ms > 2000ms → reset
    expect(result.current.consecutiveFast).toBe(0);
  });

  it('slow word mid-chain resets progress', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));  // count=1
    act(() => result.current.recordSubmit(3000));  // count=2
    act(() => result.current.recordSubmit(10000)); // slow → reset
    expect(result.current.consecutiveFast).toBe(0);
    expect(result.current.tempoActive).toBe(false);
  });

  it('spendTempo deactivates tempo and resets consecutive count', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));
    act(() => result.current.recordSubmit(3000));
    act(() => result.current.recordSubmit(4500));
    expect(result.current.tempoActive).toBe(true);
    act(() => result.current.spendTempo());
    expect(result.current.tempoActive).toBe(false);
    expect(result.current.consecutiveFast).toBe(0);
  });

  it('after spendTempo, player must rebuild 3 fast gaps for next activation', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));
    act(() => result.current.recordSubmit(3000));
    act(() => result.current.recordSubmit(4500));
    act(() => result.current.spendTempo());
    // Only 2 fast gaps after spend — should NOT reactivate
    act(() => result.current.recordSubmit(5000)); // first after reset, no gap
    act(() => result.current.recordSubmit(6500)); // count=1
    act(() => result.current.recordSubmit(8000)); // count=2
    expect(result.current.tempoActive).toBe(false);
  });

  it('reset() clears all state; first submission afterward has no gap', () => {
    const { result } = renderHook(() => useShiritoriTempo());
    act(() => result.current.recordSubmit(0));
    act(() => result.current.recordSubmit(1500));
    act(() => result.current.recordSubmit(3000));
    act(() => result.current.recordSubmit(4500));
    act(() => result.current.reset());
    expect(result.current.tempoActive).toBe(false);
    expect(result.current.consecutiveFast).toBe(0);
    // After reset, a fast submit should not count (no prior baseline)
    act(() => result.current.recordSubmit(5000));
    expect(result.current.consecutiveFast).toBe(0);
  });
});
