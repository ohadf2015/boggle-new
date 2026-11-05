/**
 * The class follows the teacher to a new game instead of being sent home:
 * the old room hears where the class went, and a student re-joining the old
 * code later is pointed at the class's newest live game.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Server } from 'socket.io';

const games: Record<string, Record<string, unknown>> = {};
const smembers = vi.fn(async (_key: string) => Object.keys(games));
const captureEduServerEvents = vi.fn();

vi.mock('../../redisClient', () => ({ getRedisClient: () => ({ smembers }) }));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: async (code: string) => games[code] ?? null,
}));
vi.mock('../../utils/educationTelemetry', () => ({
  captureEduServerEvents: (e: unknown) => captureEduServerEvents(e),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { announceClassroomMove, findNewerClassroomGame } from '../classroomGameMove';

function game(code: string, over: Record<string, unknown> = {}) {
  games[code] = { gameCode: code, classroomId: 'cls-1', teacherId: 't-1', status: 'waiting', createdAt: '2026-11-03T17:30:00Z', ...over };
  return games[code] as never;
}

function fakeIo() {
  const emit = vi.fn();
  const except = vi.fn(() => ({ emit }));
  const to = vi.fn(() => ({ emit, except }));
  return { io: { to } as unknown as Server, to, except, emit };
}

describe('findNewerClassroomGame', () => {
  beforeEach(() => {
    for (const k of Object.keys(games)) delete games[k];
    captureEduServerEvents.mockClear();
  });

  it('given the teacher opened a new game for the class, then the old code points at it', async () => {
    const old = game('OLD111', { status: 'ended', endedAt: '2026-11-03T17:33:25Z' });
    game('NEW222', { createdAt: '2026-11-03T17:33:25Z' });

    expect(await findNewerClassroomGame(old)).toBe('NEW222');
  });

  it('given several newer games, then the newest wins', async () => {
    const old = game('OLD111', { status: 'ended', endedAt: 'x' });
    game('MID222', { createdAt: '2026-11-03T17:33:25Z' });
    game('NEW333', { createdAt: '2026-11-03T17:34:25Z' });

    expect(await findNewerClassroomGame(old)).toBe('NEW333');
  });

  it('never points back at an older, ended, or other-class game', async () => {
    const current = game('CUR111', { createdAt: '2026-11-03T17:40:00Z', status: 'ended', endedAt: 'x' });
    game('OLDER2', { createdAt: '2026-11-03T17:00:00Z' });
    game('ENDED3', { createdAt: '2026-11-03T17:50:00Z', status: 'ended', endedAt: 'y' });
    game('OTHER4', { createdAt: '2026-11-03T17:55:00Z', classroomId: 'cls-2' });

    expect(await findNewerClassroomGame(current)).toBeNull();
  });

  it('returns null rather than throwing when Redis fails', async () => {
    smembers.mockRejectedValueOnce(new Error('redis down'));
    expect(await findNewerClassroomGame(game('OLD111'))).toBeNull();
  });
});

describe('announceClassroomMove', () => {
  beforeEach(() => {
    for (const k of Object.keys(games)) delete games[k];
    captureEduServerEvents.mockClear();
  });

  it('given the teacher leaves a room of the same class, then the old room (minus the teacher) is told the new code and the move is recorded', async () => {
    game('OLD111');
    const { io, to, except, emit } = fakeIo();

    const moved = await announceClassroomMove(io, {
      fromCode: 'OLD111', toCode: 'NEW222', toClassroomId: 'cls-1', teacherId: 't-1', students: 6, exceptSocketIds: ['teacher-sock'],
    });

    expect(moved).toBe(true);
    expect(to).toHaveBeenCalledWith('game:OLD111');
    expect(except).toHaveBeenCalledWith(['teacher-sock']);
    expect(emit).toHaveBeenCalledWith('classroomGameMoved', { fromCode: 'OLD111', toCode: 'NEW222', reason: 'host_new_game' });
    const [events] = captureEduServerEvents.mock.calls[0] as [Array<{ event: string; properties: Record<string, unknown> }>];
    expect(events[0].event).toBe('edu_classroom_game_moved');
    expect(events[0].properties).toMatchObject({ reason: 'host_new_game', students: 6, classroom_id: 'cls-1' });
  });

  it('given the old room belongs to another class (or is an arcade room), then it is not a move', async () => {
    game('OLD111', { classroomId: 'cls-9' });
    const { io, emit } = fakeIo();

    expect(await announceClassroomMove(io, { fromCode: 'OLD111', toCode: 'NEW222', toClassroomId: 'cls-1', students: 3 })).toBe(false);
    expect(await announceClassroomMove(io, { fromCode: 'ARCADE', toCode: 'NEW222', toClassroomId: 'cls-1', students: 3 })).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it('given the same code, then it is not a move', async () => {
    game('SAME11');
    const { io } = fakeIo();
    expect(await announceClassroomMove(io, { fromCode: 'SAME11', toCode: 'SAME11', toClassroomId: 'cls-1', students: 1 })).toBe(false);
  });
});
