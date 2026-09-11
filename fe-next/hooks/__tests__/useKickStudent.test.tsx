import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKickStudent, KICK_ACK_TIMEOUT_MS } from '../useKickStudent';

function fakeSocket() {
  const handlers: Record<string, Array<(payload: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (payload: unknown) => void) => {
      (handlers[event] ||= []).push(cb);
    }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    }),
    fire: (event: string, payload: unknown) => (handlers[event] || []).forEach((h) => h(payload)),
    listenerCount: (event: string) => (handlers[event] || []).length,
  };
}

describe('useKickStudent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits kickPlayer with the target username and marks the row as removing', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useKickStudent(socket as never));

    act(() => result.current.kick('Dana'));

    expect(socket.emit).toHaveBeenCalledWith('kickPlayer', { targetUsername: 'Dana' });
    expect(result.current.statusOf('Dana')).toBe('removing');
    expect(result.current.statusOf('Eli')).toBe('idle');
  });

  it('clears the removing state when the server broadcasts playerKicked', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useKickStudent(socket as never));

    act(() => result.current.kick('Dana'));
    act(() => socket.fire('playerKicked', { username: 'Dana', reason: 'host' }));

    expect(result.current.statusOf('Dana')).toBe('idle');
  });

  it('surfaces a FAILED state when the server silently no-ops (Class 4 guard)', () => {
    // kickHandler.ts has seven bare `return`s and sends no ack — a lost kick
    // must never leave a permanent spinner on the projector.
    const socket = fakeSocket();
    const { result } = renderHook(() => useKickStudent(socket as never));

    act(() => result.current.kick('Dana'));
    act(() => { vi.advanceTimersByTime(KICK_ACK_TIMEOUT_MS + 100); });

    expect(result.current.statusOf('Dana')).toBe('failed');
  });

  it('a retry after a failure re-emits and returns to removing', () => {
    const socket = fakeSocket();
    const { result } = renderHook(() => useKickStudent(socket as never));

    act(() => result.current.kick('Dana'));
    act(() => { vi.advanceTimersByTime(KICK_ACK_TIMEOUT_MS + 100); });
    act(() => result.current.kick('Dana'));

    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(result.current.statusOf('Dana')).toBe('removing');
  });

  it('is a no-op without a socket and never throws', () => {
    const { result } = renderHook(() => useKickStudent(null));
    act(() => result.current.kick('Dana'));
    expect(result.current.statusOf('Dana')).toBe('idle');
  });

  it('detaches its listener and pending timers on unmount', () => {
    const socket = fakeSocket();
    const { result, unmount } = renderHook(() => useKickStudent(socket as never));
    act(() => result.current.kick('Dana'));
    unmount();
    expect(socket.listenerCount('playerKicked')).toBe(0);
    expect(() => vi.advanceTimersByTime(KICK_ACK_TIMEOUT_MS + 100)).not.toThrow();
  });
});
