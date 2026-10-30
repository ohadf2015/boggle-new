import { describe, it, expect, vi } from 'vitest';

// A logger whose methods need `this`, like the real pino-backed Logger class.
const m = vi.hoisted(() => {
  class BoundLogger {
    lines: string[] = [];
    private pino = { write: (l: string) => this.lines.push(l) };
    info(_cat: string, msg: string) { this.pino.write(`info ${msg}`); }
    warn(_cat: string, msg: string) { this.pino.write(`warn ${msg}`); }
    error(_cat: string, msg: string) { this.pino.write(`error ${msg}`); }
    debug(_cat: string, msg: string) { this.pino.write(`debug ${msg}`); }
  }
  return { logger: new BoundLogger(), getGameAsync: vi.fn() };
});
vi.mock('../../../utils/logger', () => ({ default: m.logger }));
vi.mock('../../gameStateManager', () => ({ getGameAsync: m.getGameAsync }));
vi.mock('../../classroomGameManager', () => ({ getClassroomGame: vi.fn() }));

import { recordHeadToHead } from '../headToHead';

describe('recordHeadToHead skip logging', () => {
  it('Given an all-guest room, Then it skips without logging an error', async () => {
    m.logger.lines = [];
    const outcome = await recordHeadToHead('ROOM', [{ username: 'G1', score: 1 }] as never, {}, { client: { rpc: vi.fn() } as never });
    expect(outcome).toBe('skipped');
    expect(m.logger.lines).toEqual(['info h2h_write game=ROOM outcome=skipped reason=fewer_than_2_humans']);
  });

  it('Given the room is gone, Then it warns and skips without an error', async () => {
    m.logger.lines = [];
    m.getGameAsync.mockResolvedValue(null);
    const auth = { A: { authUserId: 'a' }, B: { authUserId: 'b' } };
    const scores = [{ username: 'A', score: 2 }, { username: 'B', score: 1 }];
    const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, { client: { rpc: vi.fn() } as never });
    expect(outcome).toBe('skipped');
    expect(m.logger.lines).toEqual(['warn h2h_write game=ROOM outcome=skipped reason=room_unknown']);
  });
});
