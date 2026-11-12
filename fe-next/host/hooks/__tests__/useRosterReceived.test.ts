import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useRosterReceived } from '../useRosterReceived';

function fakeSocket() {
  const handlers = new Map<string, Set<(...a: unknown[]) => void>>();
  const socket = {
    on: (event: string, fn: (...a: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
      return socket;
    },
    off: (event: string, fn: (...a: unknown[]) => void) => {
      handlers.get(event)?.delete(fn);
      return socket;
    },
  };
  const emit = (event: string, ...args: unknown[]) => handlers.get(event)?.forEach((fn) => fn(...args));
  return { socket: socket as unknown as Socket, emit };
}

describe('useRosterReceived', () => {
  it('Given the host view just mounted, When no roster update has arrived, Then the roster is unknown', () => {
    const { socket } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12'));
    expect(result.current).toBe(false);
  });

  it('Given a roster update arrives, Then the roster is known', () => {
    const { socket, emit } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12'));
    act(() => emit('updateUsers', { users: [] }));
    expect(result.current).toBe(true);
  });

  it('Given the socket reconnects, When no fresh roster has arrived yet, Then the roster is unknown again', () => {
    const { socket, emit } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12'));
    act(() => emit('updateUsers', { users: [] }));
    act(() => emit('connect'));
    expect(result.current).toBe(false);
  });

  it('Given the room changes, Then the old room roster does not count', () => {
    const { socket, emit } = fakeSocket();
    const { result, rerender } = renderHook(({ code }) => useRosterReceived(socket, code), { initialProps: { code: 'AB12' } });
    act(() => emit('updateUsers', { users: [] }));
    rerender({ code: 'CD34' });
    expect(result.current).toBe(false);
  });

  it('Given the host view mounts with the roster from the join reply, Then the roster is already known', () => {
    const { socket } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12', true));
    expect(result.current).toBe(true);
  });

  it('Given the host view mounts with no roster from the join reply, Then the roster is unknown', () => {
    const { socket } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12', false));
    expect(result.current).toBe(false);
  });

  it('Given a seeded roster and a reconnect, When no fresh payload has arrived, Then the roster is unknown again', () => {
    const { socket, emit } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12', true));
    act(() => emit('connect'));
    expect(result.current).toBe(false);
  });

  it('Given a reconnect, When the rejoin reply for this room arrives, Then the roster is known again', () => {
    const { socket, emit } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12', true));
    act(() => emit('connect'));
    act(() => emit('joined', { gameCode: 'AB12', users: [{ username: 'Ms K', isHost: true }] }));
    expect(result.current).toBe(true);
  });

  it('Given a join reply for another room or without a player list, Then it does not count', () => {
    const { socket, emit } = fakeSocket();
    const { result } = renderHook(() => useRosterReceived(socket, 'AB12'));
    act(() => emit('joined', { gameCode: 'ZZ99', users: [] }));
    act(() => emit('joined', { gameCode: 'AB12' }));
    expect(result.current).toBe(false);
  });
});
