import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';

const emit = vi.fn();
vi.mock('@/utils/SocketContext', () => ({
  useSocketEmit: () => emit,
  useSocketEvent: () => undefined,
}));

import { useClassroomEconomy } from '../useClassroomEconomy';

beforeEach(() => {
  vi.useFakeTimers();
  emit.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useClassroomEconomy snapshot retry', () => {
  it('Given no snapshot yet, Then the student asks again every two seconds', () => {
    renderHook(() => useClassroomEconomy('ABC'));
    expect(emit).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith('classroomEconomy:requestState', { gameCode: 'ABC' });
  });

  it('Given the retries are exhausted, Then it stops asking', () => {
    renderHook(() => useClassroomEconomy('ABC'));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(emit.mock.calls.length).toBeLessThanOrEqual(6);
  });
});
