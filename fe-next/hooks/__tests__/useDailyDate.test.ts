import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDailyDate } from '../useUtcDay';

describe('useDailyDate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T23:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  const nextMorning = () => {
    vi.setSystemTime(new Date('2026-11-13T07:00:00Z'));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  };

  it('moves to the new day when the player comes back, and tells the caller', () => {
    const onRoll = vi.fn();
    const { result } = renderHook(() => useDailyDate(true, onRoll));
    expect(result.current).toBe('2026-11-12');
    nextMorning();
    expect(result.current).toBe('2026-11-13');
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it('holds the old day while it may not roll, then catches up', () => {
    const { result, rerender } = renderHook(({ can }) => useDailyDate(can), { initialProps: { can: false } });
    nextMorning();
    expect(result.current).toBe('2026-11-12');
    rerender({ can: true });
    expect(result.current).toBe('2026-11-13');
  });
});
