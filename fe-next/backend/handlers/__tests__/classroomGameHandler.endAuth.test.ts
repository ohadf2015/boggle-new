/**
 * `classroomGameEnd` must be as locked down as its twin `endClassroomGame`.
 *
 * Both handlers end the round, flip the Redis status to `finished` and call
 * `persistClassroomGameScores`. Only `endClassroomGame` ever checked that the
 * caller is the teacher. `classroomGameEnd` checked authentication alone, so
 * any signed-in student holding the game code — which is on the projector, in
 * the QR and printed on every student's screen — could:
 *
 *   1. take the Redis `SET NX` idempotency lock inside persistence, so the
 *      server's own real end-of-round write later finds the key taken and
 *      persists NOTHING for the whole class (recurring pitfall class 4, and
 *      the exact bug `e1b7b93b3` was written to fix);
 *   2. end the round for thirty people;
 *   3. write arbitrary `playerScores` for arbitrary userIds.
 *
 * Recurring pitfall class 3: two routes to the same outcome, one of them
 * silently weaker. Both now share ONE guarded body.
 */

import { vi, type Mock } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as persistence from '../classroomGamePersistence';

vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager');
vi.mock('../classroomGamePersistence', () => ({
  persistClassroomGameScores: vi.fn(async () => []),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(async () => true),
  isClassroomStudent: vi.fn(async () => true),
  getClassroomRole: vi.fn(async () => 'student'),
}));
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => true),
  default: { checkRateLimit: vi.fn(() => true) },
}));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((_schema: unknown, data: unknown) => ({ success: true, data })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const TEACHER_ID = '00000000-0000-4000-8000-0000000000aa';
const STUDENT_ID = '00000000-0000-4000-8000-0000000000bb';

function makeSocket(authUserId: string) {
  const handlers: Record<string, (data: unknown) => Promise<void> | void> = {};
  const socket = {
    id: 'socket-end-auth',
    on: vi.fn((event: string, fn: (data: unknown) => Promise<void> | void) => {
      handlers[event] = fn;
    }),
    emit: vi.fn(),
    join: vi.fn(),
    data: { verifiedUserId: authUserId },
    handshake: { auth: {} },
  };
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  registerClassroomGameHandlers(io as never, socket as never);
  return { socket, io, handlers };
}

const GAME = {
  gameCode: 'ABC123',
  classroomId: '00000000-0000-4000-8000-0000000000cc',
  teacherId: TEACHER_ID,
  teacherName: 'Ms Plant',
  lessonIds: [],
  lessonNames: [],
  vocabularyWords: [],
  players: [{ userId: STUDENT_ID, username: 'Maya', socketId: 's1' }],
  status: 'playing',
  settings: {},
};

describe('classroomGameEnd — teacher-only, like its twin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue(GAME);
    (classroomGameManager.updateClassroomGameStatus as Mock).mockResolvedValue(undefined);
    (persistence.persistClassroomGameScores as Mock).mockResolvedValue([]);
  });

  it('rejects a student and never touches status, persistence or the room', async () => {
    // GIVEN a signed-in student who is not the teacher of this game
    const { socket, io, handlers } = makeSocket(STUDENT_ID);

    // WHEN they hand-craft the end event with fabricated scores
    await handlers['classroomGameEnd']?.({
      gameCode: 'ABC123',
      playerScores: [{ userId: STUDENT_ID, score: 9999, wordsFound: ['CHEAT'] }],
    });

    // THEN the round is untouched and nothing is written
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', {
      error: 'Only the teacher can end this game',
    });
    expect(classroomGameManager.updateClassroomGameStatus).not.toHaveBeenCalled();
    expect(persistence.persistClassroomGameScores).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('still lets the teacher end the game through the same event', async () => {
    // GIVEN the teacher of the game
    const { io, handlers } = makeSocket(TEACHER_ID);

    // WHEN they end it
    await handlers['classroomGameEnd']?.({ gameCode: 'ABC123' });

    // THEN the round finishes and results are persisted and broadcast
    expect(classroomGameManager.updateClassroomGameStatus).toHaveBeenCalledWith('ABC123', 'finished');
    expect(persistence.persistClassroomGameScores).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith(`classroom:${GAME.classroomId}`);
  });

  it('rejects an unauthenticated socket', async () => {
    // GIVEN a socket with no verified user
    const handlers: Record<string, (data: unknown) => Promise<void> | void> = {};
    const socket = {
      id: 's-anon',
      on: vi.fn((e: string, fn: (data: unknown) => Promise<void> | void) => { handlers[e] = fn; }),
      emit: vi.fn(),
      join: vi.fn(),
      data: {},
      handshake: { auth: {} },
    };
    registerClassroomGameHandlers({ to: vi.fn().mockReturnThis(), emit: vi.fn() } as never, socket as never);

    // WHEN it tries to end the game
    await handlers['classroomGameEnd']?.({ gameCode: 'ABC123' });

    // THEN it is refused before any lookup
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', { error: 'Authentication required' });
    expect(persistence.persistClassroomGameScores).not.toHaveBeenCalled();
  });

  it('drops fabricated playerScores for userIds that are not in the game', async () => {
    // GIVEN the teacher ending the game with one real and one fabricated row
    const { handlers } = makeSocket(TEACHER_ID);
    const intruder = '00000000-0000-4000-8000-0000000000dd';

    // WHEN the payload names a user who never played
    await handlers['classroomGameEnd']?.({
      gameCode: 'ABC123',
      playerScores: [
        { userId: STUDENT_ID, score: 40 },
        { userId: intruder, score: 9999 },
      ],
    });

    // THEN only the real player's row reaches persistence
    expect(persistence.persistClassroomGameScores).toHaveBeenCalledWith(
      GAME,
      [{ userId: STUDENT_ID, score: 40 }]
    );
  });
});
