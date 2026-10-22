import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassroomCardRematch } from '../useClassroomCardRematch';

describe('useClassroomCardRematch — the phone card starts the round from the room, not the browser', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('given no saved lesson in this browser, when the teacher taps Play again, then the round still starts', () => {
    const start = vi.fn();
    const { result } = renderHook(() => useClassroomCardRematch({ socket: {} as never, start }));
    act(() => result.current.rematch());
    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current.offline).toBe(false);
  });

  it('given no connection to the room, when the teacher taps Play again, then the card says so instead of doing nothing', () => {
    const start = vi.fn();
    const { result } = renderHook(() => useClassroomCardRematch({ socket: null, start }));
    act(() => result.current.rematch());
    expect(start).not.toHaveBeenCalled();
    expect(result.current.offline).toBe(true);
  });

  it('given the connection is back, when the teacher taps again, then the warning clears and the round starts', () => {
    const start = vi.fn();
    const { result, rerender } = renderHook(({ socket }) => useClassroomCardRematch({ socket, start }), { initialProps: { socket: null as unknown } });
    act(() => result.current.rematch());
    rerender({ socket: {} });
    act(() => result.current.rematch());
    expect(start).toHaveBeenCalledTimes(1);
    expect(result.current.offline).toBe(false);
  });
});
