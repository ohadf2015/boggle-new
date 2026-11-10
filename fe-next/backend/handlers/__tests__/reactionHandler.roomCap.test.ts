import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

let room = 'ROOM0';
vi.mock('../../modules/gameStateManager', () => ({
  getGameBySocketId: vi.fn(() => room),
  getUsernameBySocketId: vi.fn((id: string) => `kid-${id}`),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../middleware/rateLimiterRedis', () => ({ checkSocketRateLimit: vi.fn(async () => ({ allowed: true })) }));
vi.mock('../../utils/metrics', () => ({ inc: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() } }));
vi.mock('../shared', () => ({ isSocketMigrating: vi.fn(() => false) }));

import { registerReactionHandlers } from '../reactionHandler';
import { ROOM_REACTIONS_PER_SECOND } from '../../modules/roomReactionBudget';
import { gameCleanupEmitter } from '../../events/gameCleanup';

const fanOut = vi.fn();

function phone(i: number) {
  let handler: (d: unknown) => Promise<void> = async () => {};
  const socket = {
    id: `s${i}`,
    on: (_e: string, fn: (d: unknown) => Promise<void>) => { handler = fn; },
    emit: vi.fn(),
    to: () => ({ emit: fanOut }),
  };
  registerReactionHandlers({} as never, socket as never);
  return { socket, react: () => handler({ reactionId: 'fire', username: 'x' }) };
}

describe('room-wide reaction cap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-11T10:00:00Z'));
    fanOut.mockClear();
    room = `ROOM${Math.random()}`;
  });
  afterEach(() => vi.useRealTimers());

  it('Given 50 phones all reacting to one claim, When they tap in the same second, Then the room fans out at most the cap and nobody is told off', async () => {
    const phones = Array.from({ length: 50 }, (_, i) => phone(i));
    for (const p of phones) await p.react();
    expect(fanOut).toHaveBeenCalledTimes(ROOM_REACTIONS_PER_SECOND);
    expect(phones.every((p) => p.socket.emit.mock.calls.length === 0)).toBe(true);
  });

  it('Given the room used its budget, When the next second starts, Then reactions flow again', async () => {
    const phones = Array.from({ length: 20 }, (_, i) => phone(i));
    for (const p of phones) await p.react();
    vi.advanceTimersByTime(1000);
    await phones[0].react();
    expect(fanOut).toHaveBeenCalledTimes(ROOM_REACTIONS_PER_SECOND + 1);
  });

  it('Given a room is deleted, When a new room reuses its code, Then it starts with a full budget', async () => {
    const phones = Array.from({ length: 20 }, (_, i) => phone(i));
    for (const p of phones) await p.react();
    gameCleanupEmitter.emitGameDeleted(room);
    await phones[0].react();
    expect(fanOut).toHaveBeenCalledTimes(ROOM_REACTIONS_PER_SECOND + 1);
  });

  it('keeps the cap lively enough for a claim toast that shows five reactions', () => {
    expect(ROOM_REACTIONS_PER_SECOND).toBeGreaterThanOrEqual(5);
    expect(ROOM_REACTIONS_PER_SECOND).toBeLessThanOrEqual(10);
  });
});
