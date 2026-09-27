/**
 * The client half of the early-join fix: a student told CLASSROOM_NOT_OPEN is
 * held on "waiting for your teacher" and walks in the moment the room opens —
 * on the server's `classroomRoomOpened` push, or on a slow re-ask if that push
 * never reaches this socket. Never bounced, never an endless silent loop.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassroomRoomWait, ROOM_WAIT_RETRY_MS, ROOM_WAIT_MAX_MS } from '../useClassroomRoomWait';

function fakeSocket() {
  const listeners: Record<string, Array<(d: unknown) => void>> = {};
  return {
    on: vi.fn((e: string, cb: (d: unknown) => void) => { (listeners[e] ||= []).push(cb); }),
    off: vi.fn((e: string, cb: (d: unknown) => void) => { listeners[e] = (listeners[e] || []).filter((f) => f !== cb); }),
    fire: (e: string, d: unknown) => (listeners[e] || []).forEach((f) => f(d)),
    count: (e: string) => (listeners[e] || []).length,
  };
}

describe('useClassroomRoomWait', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setup(isActive = false) {
    const socket = fakeSocket();
    const socketRef = { current: socket as never };
    const rejoin = vi.fn();
    const onGiveUp = vi.fn();
    const hook = renderHook((props: { isActive: boolean }) =>
      useClassroomRoomWait({ socketRef, isActive: props.isActive, rejoin, onGiveUp }), { initialProps: { isActive } });
    return { socket, rejoin, onGiveUp, hook };
  }

  it('holds the code and walks in the instant the server says the room opened', () => {
    const { socket, rejoin, hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    expect(hook.result.current.waitingCode).toBe('ABC123');

    act(() => socket.fire('classroomRoomOpened', { gameCode: 'ABC123' }));
    expect(rejoin).toHaveBeenCalledWith('ABC123');
  });

  it('ignores another room opening', () => {
    const { socket, rejoin, hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    act(() => socket.fire('classroomRoomOpened', { gameCode: 'ZZZ999' }));
    expect(rejoin).not.toHaveBeenCalled();
  });

  it('re-asks on a slow timer when no announcement arrives', () => {
    const { rejoin, hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_RETRY_MS - 1); });
    expect(rejoin).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(rejoin).toHaveBeenCalledTimes(1);
  });

  it('releases the wait once the student is in the room', () => {
    const { socket, rejoin, hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    hook.rerender({ isActive: true });
    expect(hook.result.current.waitingCode).toBeNull();
    expect(socket.count('classroomRoomOpened')).toBe(0);
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_RETRY_MS * 2); });
    expect(rejoin).not.toHaveBeenCalled();
  });

  it('gives up out loud after the cap instead of looping forever', () => {
    const { rejoin, onGiveUp, hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_MAX_MS + 1); });
    // Every retry gets another CLASSROOM_NOT_OPEN, which re-holds.
    act(() => hook.result.current.hold('ABC123'));
    expect(onGiveUp).toHaveBeenCalledWith('ABC123');
    expect(hook.result.current.waitingCode).toBeNull();
    expect(rejoin.mock.calls.length).toBeGreaterThan(0);
  });
});
