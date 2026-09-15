/**
 * Regression — the teacher's end-of-session wrote NOTHING for guest students.
 *
 * `playerScores` on `endClassroomGame` is client-supplied, so it is filtered to
 * ids the server actually saw. Correct. But the set it was filtered against was
 * `game.players` — the CLASSROOM roster, which `classroomGamePersistence` has a
 * comment of its own explaining is "filled ONLY by the `joinClassroomGame`
 * socket event. Students who reach the room the ordinary way — the join page,
 * the projector code, `playerJoinHandler` — never emit it, so that list is
 * routinely EMPTY while a full class is playing."
 *
 * Empty set, so every score was dropped, so `persistClassroomGameScores` was
 * handed an empty array, wrote no `practice_sessions` rows, and the teacher's
 * post-game report resolved a class of thirty to nobody. Downstream the union
 * in `collectParticipants` had already been hardened against exactly this — but
 * it can only union what it is given, and this caller had already thrown the
 * scores away (recurring pitfall class 3: the shared function was fixed, the
 * caller's own gate was not).
 *
 * The fix keeps the anti-fabrication property intact: the allowed set is still
 * built only from ids THIS SERVER verified, now from both rosters — the live
 * room's `users` map, whose `authUserId` comes from the handshake JWT
 * (`playerJoinHandler`), is where a guest actually is.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

const {
  mockBroadcastToRoom,
  mockDeleteGame,
  mockPersist,
  mockGetClassroomGame,
  mockUpdateStatus,
  mockGetGame,
  mockLoggerWarn,
} = vi.hoisted(() => ({
  mockBroadcastToRoom: vi.fn(),
  mockDeleteGame: vi.fn(),
  mockPersist: vi.fn(),
  mockGetClassroomGame: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockGetGame: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock('../../modules/classroomGameManager', () => ({
  createClassroomGame: vi.fn(),
  getClassroomGame: mockGetClassroomGame,
  getActiveClassroomGames: vi.fn(),
  addPlayerToClassroomGame: vi.fn(),
  removePlayerFromClassroomGame: vi.fn(),
  updateClassroomGameStatus: mockUpdateStatus,
}));
vi.mock('../../modules/gameStateManager', () => ({
  deleteGame: mockDeleteGame,
  getGame: mockGetGame,
  getActiveRooms: vi.fn(() => []),
  getGameBySocketId: vi.fn(),
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  broadcastActiveRooms: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
  safeEmit: vi.fn(),
}));
vi.mock('../classroomGamePersistence', () => ({ persistClassroomGameScores: mockPersist }));
vi.mock('../classroomGamePersistence.js', () => ({ persistClassroomGameScores: mockPersist }));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  getClassroomMembershipLevel: vi.fn(),
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
  resolveClassroomName: vi.fn(async () => "Mr Smith's Class"),
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
  default: { info: vi.fn(), error: vi.fn(), warn: mockLoggerWarn, debug: vi.fn() },
}));

import { registerClassroomGameHandlers } from '../classroomGameHandler';

const TEACHER_ID = '00000000-0000-4000-8000-0000000000aa';
const ENROLLED_ID = '00000000-0000-4000-8000-0000000000bb';
const GUEST_ID = '00000000-0000-4000-8000-0000000000cc';
const IMPOSTOR_ID = '00000000-0000-4000-8000-0000000000dd';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000000ee';

function makeSocket(authUserId: string) {
  return {
    id: 'socket-1',
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: { verifiedUserId: authUserId },
    handshake: { auth: {} },
  } as never as { on: Mock; emit: Mock };
}
const makeIo = () => ({ to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn() }) as never;

function endHandlerOf(socket: { on: Mock }, event = 'endClassroomGame') {
  const entry = socket.on.mock.calls.find((c: unknown[]) => c[0] === event);
  if (!entry) throw new Error(`${event} handler was never registered`);
  return entry[1] as (data: unknown) => Promise<void>;
}

/** The shape the bug lives in: nobody ever emitted `joinClassroomGame`. */
const gameWithEmptyClassroomRoster = {
  gameCode: 'ABC123',
  classroomId: CLASSROOM_ID,
  teacherId: TEACHER_ID,
  teacherName: 'Ms K',
  players: [],
  status: 'playing',
  vocabularyWords: [],
  lessonIds: ['lesson-1'],
};

/** The live MP room — where a guest who came through the base `join` actually is. */
const liveRoomWithGuests = {
  users: {
    Maya: { authUserId: GUEST_ID, socketId: 's2' },
    Ada: { authUserId: ENROLLED_ID, socketId: 's3' },
    'Bot Zed': { authUserId: '00000000-0000-4000-8000-0000000000ff', isBot: true, socketId: 's4' },
  },
};

const scoresFor = (...ids: string[]) =>
  ids.map((userId, i) => ({ userId, score: 10 * (i + 1), wordsFound: ['cat'] }));

describe('teacher ends the session — guest students reach the report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(gameWithEmptyClassroomRoster);
    mockGetGame.mockReturnValue(liveRoomWithGuests);
    mockPersist.mockResolvedValue([]);
  });

  it('GIVEN an empty classroom roster WHEN guests played THEN their scores still reach persistence', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({
      gameCode: 'ABC123',
      playerScores: scoresFor(GUEST_ID, ENROLLED_ID),
    });

    expect(mockPersist).toHaveBeenCalledTimes(1);
    const passed = mockPersist.mock.calls[0][1] as Array<{ userId: string }>;
    expect(passed.map((s) => s.userId).sort()).toEqual([ENROLLED_ID, GUEST_ID].sort());
  });

  it('GIVEN a fabricated userId THEN it is still refused — the gate narrowed, it did not open', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({
      gameCode: 'ABC123',
      playerScores: scoresFor(GUEST_ID, IMPOSTOR_ID),
    });

    const passed = mockPersist.mock.calls[0][1] as Array<{ userId: string }>;
    expect(passed.map((s) => s.userId)).toEqual([GUEST_ID]);
  });

  it('GIVEN a bot in the live room THEN a score claimed for it is refused', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({
      gameCode: 'ABC123',
      playerScores: scoresFor('00000000-0000-4000-8000-0000000000ff'),
    });

    expect(mockPersist.mock.calls[0][1]).toEqual([]);
  });

  it('GIVEN scores arrived but EVERY one was refused THEN it says so — never a silent drop', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({
      gameCode: 'ABC123',
      playerScores: scoresFor(IMPOSTOR_ID),
    });

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'CLASSROOM_GAME',
      expect.stringContaining('ABC123')
    );
  });

  it('GIVEN the room is already torn down THEN the classroom roster alone still decides', async () => {
    mockGetGame.mockReturnValue(undefined);
    mockGetClassroomGame.mockResolvedValue({
      ...gameWithEmptyClassroomRoster,
      players: [{ userId: ENROLLED_ID, username: 'Ada', socketId: 's3' }],
    });
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({
      gameCode: 'ABC123',
      playerScores: scoresFor(ENROLLED_ID, GUEST_ID),
    });

    const passed = mockPersist.mock.calls[0][1] as Array<{ userId: string }>;
    expect(passed.map((s) => s.userId)).toEqual([ENROLLED_ID]);
  });

  it('GIVEN no playerScores at all THEN persistence still runs on the server-side roster', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    expect(mockPersist).toHaveBeenCalledWith(gameWithEmptyClassroomRoster, undefined);
  });
});
