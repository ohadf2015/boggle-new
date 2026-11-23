import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useHoldHint } from '../useHoldHint';

describe('useHoldHint', () => {
  afterEach(() => vi.useRealTimers());

  it('shows after a quick burst of backspace taps, then hides on its own', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHoldHint());

    act(() => { result.current.noteTap(); vi.advanceTimersByTime(300); result.current.noteTap(); });
    expect(result.current.show).toBe(false);
    act(() => { vi.advanceTimersByTime(300); result.current.noteTap(); });
    expect(result.current.show).toBe(true);

    act(() => { vi.advanceTimersByTime(2600); });
    expect(result.current.show).toBe(false);
  });

  it('ignores slow, deliberate taps', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHoldHint());
    for (let i = 0; i < 5; i++) {
      act(() => { result.current.noteTap(); vi.advanceTimersByTime(900); });
    }
    expect(result.current.show).toBe(false);
  });

  it('shows once per screen, and never again after the player holds', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHoldHint());
    const burst = () => act(() => { for (let i = 0; i < 3; i++) { result.current.noteTap(); vi.advanceTimersByTime(100); } });

    burst();
    expect(result.current.show).toBe(true);
    act(() => { result.current.noteHold(); });
    expect(result.current.show).toBe(false);

    act(() => { vi.advanceTimersByTime(5000); });
    burst();
    expect(result.current.show).toBe(false);
  });
});
