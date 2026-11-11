/**
 * The client half of the early-join fix: a student told CLASSROOM_NOT_OPEN is
 * held on "waiting for your teacher" and walks in the moment the room opens —
 * on the server's `classroomRoomOpened` push, or on a slow re-ask if that push
 * never reaches this socket. Never bounced, never an endless silent loop.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassroomRoomWait, rejoinWaitingRoom, ROOM_WAIT_RETRY_MS, ROOM_WAIT_MAX_MS, ROOM_WAIT_STALL_MS } from '../useClassroomRoomWait';

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

describe('useClassroomRoomWait — a wait that has stalled', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setup() {
    const socket = fakeSocket();
    const rejoin = vi.fn();
    const hook = renderHook((props: { isActive: boolean }) =>
      useClassroomRoomWait({ socketRef: { current: socket as never }, isActive: props.isActive, rejoin, onGiveUp: vi.fn() }), { initialProps: { isActive: false } });
    return { rejoin, hook };
  }

  it('Given a waiting student, When less than a minute passes, Then the wait stays quiet', () => {
    const { hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_STALL_MS - 1); });
    expect(hook.result.current.stalled).toBe(false);
  });

  it('Given a waiting student, When a minute passes with re-asks still refused, Then the wait reports it has stalled', () => {
    const { hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    for (let elapsed = 0; elapsed < ROOM_WAIT_STALL_MS; elapsed += ROOM_WAIT_RETRY_MS) {
      act(() => { vi.advanceTimersByTime(ROOM_WAIT_RETRY_MS); });
      act(() => hook.result.current.hold('ABC123'));
    }
    expect(ROOM_WAIT_STALL_MS).toBe(60_000);
    expect(hook.result.current.stalled).toBe(true);
    expect(hook.result.current.waitingCode).toBe('ABC123');
  });

  it('Given a stalled wait, When the student taps Try again, Then the join is re-asked now and the notice resets', () => {
    const { rejoin, hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_STALL_MS); });
    rejoin.mockClear();
    act(() => hook.result.current.retryNow());
    expect(rejoin).toHaveBeenCalledWith('ABC123');
    expect(hook.result.current.stalled).toBe(false);
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_STALL_MS); });
    expect(hook.result.current.stalled).toBe(true);
  });

  it('Given a stalled wait, When the student gets seated, Then the stalled notice clears', () => {
    const { hook } = setup();
    act(() => hook.result.current.hold('ABC123'));
    act(() => { vi.advanceTimersByTime(ROOM_WAIT_STALL_MS); });
    hook.rerender({ isActive: true });
    expect(hook.result.current.stalled).toBe(false);
  });

  it('Given no wait, When Try again is tapped, Then nothing is sent', () => {
    const { rejoin, hook } = setup();
    act(() => hook.result.current.retryNow());
    expect(rejoin).not.toHaveBeenCalled();
  });
});

describe('rejoinWaitingRoom', () => {
  it('a classroom host told the room is not open creates it again instead of joining as a student', () => {
    const handleJoin = vi.fn();
    rejoinWaitingRoom(handleJoin, { code: 'ABC123', username: 'Fish', isHost: true, language: 'he' });
    expect(handleJoin).toHaveBeenCalledWith(true, 'he', 'ABC123', 'Fish Room', 'Fish', { isPrivate: true, isClassroom: true });
  });

  it('a student re-asks with a plain join', () => {
    const handleJoin = vi.fn();
    rejoinWaitingRoom(handleJoin, { code: 'ABC123', username: 'Dana', isHost: false, language: 'he' });
    expect(handleJoin).toHaveBeenCalledWith(false, null, 'ABC123', undefined, 'Dana', { autoRetry: true });
  });
});
