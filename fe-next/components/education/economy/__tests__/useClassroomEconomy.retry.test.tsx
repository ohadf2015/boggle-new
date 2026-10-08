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

  it('Given no snapshot after a minute, Then it keeps asking until one arrives', () => {
    renderHook(() => useClassroomEconomy('ABC'));
    for (let i = 0; i < 30; i++) {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }
    expect(emit.mock.calls.length).toBeGreaterThan(20);
  });
});
