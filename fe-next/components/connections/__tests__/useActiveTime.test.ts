import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveTime } from '../useActiveTime';

afterEach(() => vi.useRealTimers());

describe('useActiveTime', () => {
  it('counts from the resumed total and stops while paused', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    const { result, rerender } = renderHook(({ paused }) => useActiveTime(5000, paused), { initialProps: { paused: false } });
    vi.setSystemTime(2000);
    expect(result.current()).toBe(7000);
    rerender({ paused: true });
    vi.setSystemTime(60_000);
    expect(result.current()).toBe(7000);
    rerender({ paused: false });
    vi.setSystemTime(61_000);
    expect(result.current()).toBe(8000);
  });
});
