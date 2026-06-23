/**
 * sendChallengeWithAck — confirmation-driven friend challenge send (B1)
 *
 * Regression: handleSendChallenge in FriendsList fired toast.success
 * unconditionally after socket.emit, without listening for friends:error,
 * 'rateLimited', or the friends:challengeSent confirmation. Users were told
 * "challenge sent" even when the server rejected the emit.
 */

import { vi } from 'vitest';

const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

import { sendChallengeWithAck } from '../sendChallengeWithAck';

type Listener = (...args: unknown[]) => void;

function makeFakeSocket() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, fn: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    }),
    off: vi.fn((event: string, fn?: Listener) => {
      if (fn) listeners.get(event)?.delete(fn);
      else listeners.delete(event);
    }),
    once: vi.fn(),
    fire(event: string, payload?: unknown) {
      listeners.get(event)?.forEach((fn) => fn(payload));
    },
    listenerCount(event: string) {
      return listeners.get(event)?.size ?? 0;
    },
  };
}

describe('sendChallengeWithAck (B1)', () => {
  beforeEach(() => trackGrowthEvent.mockClear());

  it('tracks challenge_sent only on a confirmed send (social-loop telemetry)', async () => {
    const socket = makeFakeSocket();
    const promise = sendChallengeWithAck(socket as never, {
      friendUserId: 'u-b',
      challengeType: 'new_game',
    });
    socket.fire('friends:challengeSent', { challengeId: 'cx', roomCode: 'ABC123' });
    await promise;
    expect(trackGrowthEvent).toHaveBeenCalledWith('challenge_sent', {
      challengeType: 'new_game',
    });
  });

  it('does NOT track challenge_sent when the server rejects', async () => {
    const socket = makeFakeSocket();
    const promise = sendChallengeWithAck(socket as never, {
      friendUserId: 'u-b',
      challengeType: 'new_game',
    });
    socket.fire('friends:error', { code: 'NOT_FRIENDS' });
    await promise;
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });

  it('resolves ok on friends:challengeSent', async () => {
    const socket = makeFakeSocket();
    const payload = { friendUserId: 'u-b', challengeType: 'new_game' as const };
    const promise = sendChallengeWithAck(socket as never, payload);
    socket.fire('friends:challengeSent', { challengeId: 'cx', roomCode: 'ABC123' });
    const result = await promise;
    expect(result).toEqual({ ok: true, data: { challengeId: 'cx', roomCode: 'ABC123' } });
    expect(socket.emit).toHaveBeenCalledWith('friends:sendChallenge', payload);
  });

  it('resolves with error code on friends:error', async () => {
    const socket = makeFakeSocket();
    const promise = sendChallengeWithAck(socket as never, { friendUserId: 'u-b', challengeType: 'new_game' });
    socket.fire('friends:error', { code: 'NOT_FRIENDS', message: 'not friends' });
    expect(await promise).toEqual({ ok: false, code: 'NOT_FRIENDS' });
  });

  it('resolves with RATE_LIMITED on rateLimited event', async () => {
    const socket = makeFakeSocket();
    const promise = sendChallengeWithAck(socket as never, { friendUserId: 'u-b', challengeType: 'new_game' });
    socket.fire('rateLimited');
    expect(await promise).toEqual({ ok: false, code: 'RATE_LIMITED' });
  });

  it('resolves with TIMEOUT after the configured deadline', async () => {
    vi.useFakeTimers();
    try {
      const socket = makeFakeSocket();
      const promise = sendChallengeWithAck(socket as never, { friendUserId: 'u-b', challengeType: 'new_game' }, 2000);
      vi.advanceTimersByTime(2001);
      expect(await promise).toEqual({ ok: false, code: 'TIMEOUT' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('cleans up all listeners after resolving', async () => {
    const socket = makeFakeSocket();
    const promise = sendChallengeWithAck(socket as never, { friendUserId: 'u-b', challengeType: 'new_game' });
    expect(socket.listenerCount('friends:challengeSent')).toBe(1);
    expect(socket.listenerCount('friends:error')).toBe(1);
    expect(socket.listenerCount('rateLimited')).toBe(1);
    socket.fire('friends:challengeSent', { challengeId: 'cx', roomCode: 'X' });
    await promise;
    expect(socket.listenerCount('friends:challengeSent')).toBe(0);
    expect(socket.listenerCount('friends:error')).toBe(0);
    expect(socket.listenerCount('rateLimited')).toBe(0);
  });

  it('only the first event resolves — later events are ignored', async () => {
    const socket = makeFakeSocket();
    const promise = sendChallengeWithAck(socket as never, { friendUserId: 'u-b', challengeType: 'new_game' });
    socket.fire('friends:challengeSent', { challengeId: 'cx', roomCode: 'FIRST' });
    socket.fire('friends:error', { code: 'NOT_FRIENDS', message: 'no' });
    const result = await promise;
    expect(result).toEqual({ ok: true, data: { challengeId: 'cx', roomCode: 'FIRST' } });
  });
});
