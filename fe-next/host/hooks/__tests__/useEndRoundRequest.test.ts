import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { END_ROUND_TIMEOUT_MS, useEndRoundRequest } from '../useEndRoundRequest';

function fakeSocket(connected = true) {
  const handlers = new Map<string, Set<(...a: unknown[]) => void>>();
  const socket = {
    connected,
    emit: vi.fn(),
    on: (e: string, fn: (...a: unknown[]) => void) => {
      if (!handlers.has(e)) handlers.set(e, new Set());
      handlers.get(e)!.add(fn);
      return socket;
    },
    off: (e: string, fn: (...a: unknown[]) => void) => {
      handlers.get(e)?.delete(fn);
      return socket;
    },
  };
  const fire = (e: string, ...a: unknown[]) => act(() => handlers.get(e)?.forEach((fn) => fn(...a)));
  return { socket, fire, asSocket: socket as unknown as Socket };
}

function setup(connected = true) {
  const s = fakeSocket(connected);
  const onEnded = vi.fn();
  const reconnect = vi.fn();
  const hook = renderHook(({ roundRunning }) => useEndRoundRequest({ socket: s.asSocket, roundRunning, onEnded, reconnect }), {
    initialProps: { roundRunning: true },
  });
  return { ...s, onEnded, reconnect, hook };
}

describe('useEndRoundRequest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Given a connected host, When ending the round, Then it sends endRoundNow and waits', () => {
    const { socket, hook } = setup();
    act(() => hook.result.current.request());
    expect(socket.emit).toHaveBeenCalledWith('endRoundNow');
    expect(hook.result.current.status).toBe('pending');
  });

  it('Given a pending request, When the round stops running (results arrived), Then it reports ended and goes idle', () => {
    const { hook, onEnded } = setup();
    act(() => hook.result.current.request());
    hook.rerender({ roundRunning: false });
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe('idle');
  });

  it('Given a pending request, When the server rejects it, Then the status says rejected and it can be retried', () => {
    const { hook, fire, socket } = setup();
    act(() => hook.result.current.request());
    fire('teacherControlRejected', { action: 'endRoundNow', reason: 'not_in_room' });
    expect(hook.result.current.status).toBe('rejected');
    act(() => hook.result.current.request());
    expect(socket.emit).toHaveBeenCalledTimes(2);
  });

  it('Given a rejection for another control, Then the pending request is untouched', () => {
    const { hook, fire } = setup();
    act(() => hook.result.current.request());
    fire('teacherControlRejected', { action: 'pauseGame' });
    expect(hook.result.current.status).toBe('pending');
  });

  it('Given a pending request, When the rate limit trips, Then the status says so', () => {
    const { hook, fire } = setup();
    act(() => hook.result.current.request());
    fire('rateLimited');
    expect(hook.result.current.status).toBe('rateLimited');
  });

  it('Given a pending request, When nothing arrives in time, Then it re-offers the action', () => {
    const { hook, onEnded } = setup();
    act(() => hook.result.current.request());
    act(() => vi.advanceTimersByTime(END_ROUND_TIMEOUT_MS - 1));
    expect(hook.result.current.status).toBe('pending');
    act(() => vi.advanceTimersByTime(1));
    expect(hook.result.current.status).toBe('timeout');
    expect(onEnded).not.toHaveBeenCalled();
  });

  it('Given the socket is disconnected, When ending the round, Then nothing is emitted and it says offline', () => {
    const { hook, socket } = setup(false);
    act(() => hook.result.current.request());
    expect(socket.emit).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('offline');
  });

  it('Given offline, When the socket connects again, Then the action is offered again', () => {
    const { hook, fire } = setup(false);
    act(() => hook.result.current.request());
    fire('connect');
    expect(hook.result.current.status).toBe('idle');
  });

  it('Given a pending request, When the socket drops, Then it says offline instead of waiting', () => {
    const { hook, fire } = setup();
    act(() => hook.result.current.request());
    fire('disconnect');
    expect(hook.result.current.status).toBe('offline');
  });

  it('Given an error status, When reset, Then it is idle again', () => {
    const { hook, fire } = setup();
    act(() => hook.result.current.request());
    fire('rateLimited');
    act(() => hook.result.current.reset());
    expect(hook.result.current.status).toBe('idle');
  });
});
