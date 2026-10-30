import { describe, it, expect, beforeEach, vi } from 'vitest';

const m = vi.hoisted(() => ({ getGameAsync: vi.fn(), getClassroomGame: vi.fn() }));
vi.mock('../../gameStateManager', () => ({ getGameAsync: m.getGameAsync }));
vi.mock('../../classroomGameManager', () => ({ getClassroomGame: m.getClassroomGame }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { recordHeadToHead } from '../headToHead';

const auth = { Alice: { authUserId: 'a' }, Bob: { authUserId: 'b' } };
const scores = [{ username: 'Alice', score: 2 }, { username: 'Bob', score: 1 }];

async function run() {
  const rpc = vi.fn(async () => ({ data: 1, error: null }));
  const outcome = await recordHeadToHead('ROOM', scores as never, auth as never, { client: { rpc } as never });
  return { outcome, rpc };
}

describe('recordHeadToHead room kind', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a teacher room flagged on the game, Then it skips', async () => {
    m.getGameAsync.mockResolvedValue({ isClassroom: true });
    expect((await run()).outcome).toBe('skipped');
  });

  it('Given a room registered as a classroom game, Then it skips', async () => {
    m.getGameAsync.mockResolvedValue({});
    m.getClassroomGame.mockResolvedValue({ classroomId: 'c1' });
    expect((await run()).outcome).toBe('skipped');
  });

  it('Given the room is gone from memory, Then it skips', async () => {
    m.getGameAsync.mockResolvedValue(null);
    const { outcome, rpc } = await run();
    expect(outcome).toBe('skipped');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('Given an ordinary room, Then it writes', async () => {
    m.getGameAsync.mockResolvedValue({});
    m.getClassroomGame.mockResolvedValue(null);
    const { outcome, rpc } = await run();
    expect(outcome).toBe('written');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
