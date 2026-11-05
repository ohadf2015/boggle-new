/**
 * A student re-joining an old class code after the teacher opened a new game
 * is sent to the new game, not told "game not found".
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

const getClassroomGame = vi.fn();
const findNewerClassroomGame = vi.fn();
const captureClassroomGameMoved = vi.fn();
const captureJoinRefusal = vi.fn(async (_r: unknown) => undefined);

vi.mock('../../modules/gameStateManager', () => ({ getGame: () => undefined }));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: (code: string) => getClassroomGame(code),
}));
vi.mock('../classroomGameMove', () => ({
  findNewerClassroomGame: (r: unknown) => findNewerClassroomGame(r),
  captureClassroomGameMoved: (a: unknown) => captureClassroomGameMoved(a),
  emitClassroomGameMoved: (s: { emit: (e: string, d: unknown) => void }, d: unknown) => s.emit('classroomGameMoved', d),
}));
vi.mock('../../utils/eduLiveEvents', () => ({ captureJoinRefusal: (r: unknown) => captureJoinRefusal(r) }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { answerMissingRoom } from '../classroomMissingRoom';

function fakeSocket() {
  const emit = vi.fn();
  const socket = { id: 's1', data: {}, join: vi.fn(), emit, once: vi.fn(), to: vi.fn(() => ({ emit: vi.fn() })) };
  return { socket: socket as unknown as Socket, emit };
}

describe('answerMissingRoom - old code of a class that moved on', () => {
  beforeEach(() => {
    getClassroomGame.mockReset();
    findNewerClassroomGame.mockReset();
    captureClassroomGameMoved.mockClear();
    captureJoinRefusal.mockClear();
  });

  it('given the class has a newer live game, then the student is pointed at it and nothing says "not found"', async () => {
    getClassroomGame.mockResolvedValue({ gameCode: 'OLD111', classroomId: 'cls-1', teacherId: 't-1', status: 'ended', endedAt: 'x' });
    findNewerClassroomGame.mockResolvedValue('NEW222');
    const { socket, emit } = fakeSocket();

    await answerMissingRoom(socket, 'OLD111', 'Pip');

    expect(emit).toHaveBeenCalledWith('classroomGameMoved', { fromCode: 'OLD111', toCode: 'NEW222', reason: 'old_code_rejoin' });
    expect(emit.mock.calls.some((c) => JSON.stringify(c).includes('GAME_NOT_FOUND'))).toBe(false);
    expect(captureClassroomGameMoved).toHaveBeenCalledWith(expect.objectContaining({ reason: 'old_code_rejoin', students: 1 }));
    expect(captureJoinRefusal).not.toHaveBeenCalled();
  });

  it('given no newer game, then the old answer stands (GAME_NOT_FOUND + SESSION_ENDED record)', async () => {
    getClassroomGame.mockResolvedValue({ gameCode: 'OLD111', classroomId: 'cls-1', status: 'ended', endedAt: 'x' });
    findNewerClassroomGame.mockResolvedValue(null);
    const { socket, emit } = fakeSocket();

    await answerMissingRoom(socket, 'OLD111', 'Pip');

    expect(emit.mock.calls.some((c) => JSON.stringify(c).includes('GAME_NOT_FOUND'))).toBe(true);
    expect((captureJoinRefusal.mock.calls[0]?.[0] as { reason?: string }).reason).toBe('SESSION_ENDED');
  });

  it('given an unknown code, then no lookup runs and it is GAME_NOT_FOUND', async () => {
    getClassroomGame.mockResolvedValue(null);
    const { socket, emit } = fakeSocket();

    await answerMissingRoom(socket, 'ZZZZZZ', 'Pip');

    expect(findNewerClassroomGame).not.toHaveBeenCalled();
    expect(emit.mock.calls.some((c) => JSON.stringify(c).includes('GAME_NOT_FOUND'))).toBe(true);
  });
});
