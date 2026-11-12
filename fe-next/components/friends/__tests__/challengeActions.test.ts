import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { acceptChallenge } from '../challengeActions';

function fakeSocket() {
  const handlers = new Map<string, (d: unknown) => void>();
  return {
    handlers,
    on: vi.fn((ev: string, fn: (d: unknown) => void) => handlers.set(ev, fn)),
    off: vi.fn((ev: string) => handlers.delete(ev)),
    emit: vi.fn(),
  };
}

afterEach(() => vi.useRealTimers());

describe('acceptChallenge', () => {
  it('Given the server answers, Then resolves the room and leaves no timer behind', async () => {
    vi.useFakeTimers();
    const s = fakeSocket();
    const p = acceptChallenge(s as unknown as Socket, 'ch-1');
    s.handlers.get('friends:challengeAccepted')?.({ challengeId: 'ch-1', roomCode: 'ROOM' });
    await expect(p).resolves.toBe('ROOM');
    expect(vi.getTimerCount()).toBe(0);
    expect(s.handlers.size).toBe(0);
  });

  it('Given silence, Then resolves null after the timeout', async () => {
    vi.useFakeTimers();
    const s = fakeSocket();
    const p = acceptChallenge(s as unknown as Socket, 'ch-1');
    vi.advanceTimersByTime(5000);
    await expect(p).resolves.toBeNull();
  });
});
