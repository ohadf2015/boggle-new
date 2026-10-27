import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced.value }));
const mockReduced = vi.hoisted(() => ({ value: false }));

afterEach(() => {
  vi.useRealTimers();
  mockReduced.value = false;
});

describe('useCountUp', () => {
  it('starts at 0 and lands exactly on the target', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountUp(12, 100, 0));
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe(12);
  });

  it('jumps straight to the target under reduced motion', () => {
    mockReduced.value = true;
    const { result } = renderHook(() => useCountUp(9));
    expect(result.current).toBe(9);
  });
});
