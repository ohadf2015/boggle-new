import { describe, it, expect, vi } from 'vitest';

const { mockSafeEmit, sockets } = vi.hoisted(() => ({
  mockSafeEmit: vi.fn(),
  sockets: {} as Record<string, { data: Record<string, unknown> }>,
}));

vi.mock('../../modules/gameStateManager.js', () => ({ getGame: vi.fn(), updateGame: vi.fn() }));
vi.mock('../../modules/classroomGameManager.js', () => ({
  setClassroomGamePlacedVocabulary: vi.fn().mockResolvedValue(undefined),
  saveClassroomTeams: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
  getSocketById: (_io: unknown, id: string) => sockets[id],
  safeEmit: mockSafeEmit,
}));

import { recordClassroomWordBank } from '../gameStartRound';
import type { GameState } from '../../modules/gameState/types.js';

const GRID = [
  ['S', 'T', 'O', 'R', 'M'],
  ['H', 'A', 'D', 'E', 'W'],
  ['I', 'N', 'L', 'S', 'A'],
  ['V', 'E', 'R', 'T', 'Y'],
  ['O', 'C', 'K', 'B', 'U'],
];

describe('recordClassroomWordBank re-send', () => {
  it('gives every student the placed words and the teacher none', async () => {
    sockets.s1 = { data: { classroomLevel: 'core' } };
    sockets.t1 = { data: { classroomLevel: 'core', classroomIsTeacher: true } };
    const game = { users: { ana: { socketId: 's1' }, teacher: { socketId: 't1' } } } as unknown as GameState;

    recordClassroomWordBank({} as never, 'ABC123', game, GRID, 'en', ['storm', 'planet']);
    await vi.waitFor(() => expect(mockSafeEmit).toHaveBeenCalledTimes(2));

    expect(mockSafeEmit).toHaveBeenCalledWith(sockets.s1, 'classroomContext', { classroomLevel: 'core', classroomWordBank: ['storm'] });
    expect(mockSafeEmit).toHaveBeenCalledWith(sockets.t1, 'classroomContext', { classroomLevel: 'core', classroomWordBank: [] });
  });

  it('recognises the teacher by account when the host socket never took the join path', async () => {
    mockSafeEmit.mockClear();
    sockets.s2 = { data: { classroomLevel: 'core' } };
    sockets.t2 = { data: {} };
    const game = {
      users: { ana: { socketId: 's2', authUserId: 'student-1' }, teacher: { socketId: 't2', authUserId: 'teacher-1' } },
    } as unknown as GameState;

    recordClassroomWordBank({} as never, 'ABC123', game, GRID, 'en', ['storm'], 'teacher-1');
    await vi.waitFor(() => expect(mockSafeEmit).toHaveBeenCalledTimes(2));

    expect(mockSafeEmit).toHaveBeenCalledWith(sockets.s2, 'classroomContext', { classroomLevel: 'core', classroomWordBank: ['storm'] });
    expect(mockSafeEmit).toHaveBeenCalledWith(sockets.t2, 'classroomContext', { classroomLevel: 'core', classroomWordBank: [] });
  });
});
