/**
 * Ending the session must actually END THE ROOM.
 *
 * Round 3 made `endedAt` terminal and taught four doors to respect it. It did
 * not touch the room: `handleEndClassroomGame` wrote `ended` to the Redis
 * classroom record, emitted `classroomGameEnded` to `classroom:<classroomId>`,
 * and left `gameStateManager`'s in-memory room standing with its players in it.
 *
 * Two failures fell out of that, and each has a test here:
 *
 *   1. SILENCE IN THE ROOM (pitfall 4). `classroom:<classroomId>` holds the
 *      teacher's dashboard sockets and enrolled students who emitted
 *      `joinClassroomGame`. A guest who scanned the projector QR and came in
 *      through the base `join` is in `game:<gameCode>` and NOTHING ELSE — so
 *      they were told nothing at all and sat on a board that would never tick
 *      again. The room broadcast is what reaches them.
 *
 *   2. THE ROOM OUTLIVES THE SESSION. Left standing, `getGame(code)` keeps
 *      answering and the base `join` keeps seating people. Tearing it down is
 *      the root fix; `classroomSeatGate` is the belt for the case teardown
 *      cannot reach (another instance's memory).
 *
 * Ordering is load-bearing: broadcast, then persist scores, then `deleteGame`.
 * `deleteGame` fires `gameCleanupEmitter.emitGameEnd` and a fire-and-forget
 * `endClassroomGameSession`, neither of which may race the score write.
 *
 * The student-facing event is `hostLeftRoomClosing` — the one the multiplayer
 * client already handles with a toast, a grace modal and (for a classroom
 * student) a route home to `/student`. It carries the EXISTING i18n key
 * `education.student.classroomRoomGone`, so there is no new copy to translate.
 */
import { vi, type Mock } from 'vitest';

const { mockBroadcastToRoom, mockDeleteGame, mockPersist, mockGetClassroomGame, mockUpdateStatus } =
  vi.hoisted(() => ({
    mockBroadcastToRoom: vi.fn(),
    mockDeleteGame: vi.fn(),
    mockPersist: vi.fn(),
    mockGetClassroomGame: vi.fn(),
    mockUpdateStatus: vi.fn(),
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
  getGame: vi.fn(),
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
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { registerClassroomGameHandlers } from '../classroomGameHandler';
import { CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';

const TEACHER_ID = '00000000-0000-4000-8000-0000000000aa';
const STUDENT_ID = '00000000-0000-4000-8000-0000000000bb';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000000cc';

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

const liveGame = {
  gameCode: 'ABC123',
  classroomId: CLASSROOM_ID,
  teacherId: TEACHER_ID,
  teacherName: 'Ms K',
  players: [{ userId: STUDENT_ID, username: 'Ada', socketId: 's2' }],
  status: 'playing',
  vocabularyWords: [],
  lessonIds: [],
};

describe('teacher ends the session — the room ends with it', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(liveGame);
    mockPersist.mockResolvedValue([]);
  });

  it('tells everyone in the GAME room, including a guest who never joined the classroom room', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    const call = mockBroadcastToRoom.mock.calls.find((c) => c[1] === 'game:ABC123');
    expect(call).toBeDefined();
    expect(call![2]).toBe('hostLeftRoomClosing');
    expect(call![3]).toMatchObject({ i18nKey: CLASSROOM_ROOM_GONE_KEY });
    expect(typeof (call![3] as { message: string }).message).toBe('string');
  });

  it('omits `reason` so the grace modal keeps its generic body instead of crashing on an unknown key', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    const call = mockBroadcastToRoom.mock.calls.find((c) => c[2] === 'hostLeftRoomClosing');
    expect(call![3]).not.toHaveProperty('reason');
  });

  it('deletes the in-memory room so the code stops being a door', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    expect(mockDeleteGame).toHaveBeenCalledWith('ABC123');
  });

  it('broadcasts and persists BEFORE tearing the room down', async () => {
    const order: string[] = [];
    mockBroadcastToRoom.mockImplementation((_io, _room, event) => { order.push(`broadcast:${event}`); });
    mockPersist.mockImplementation(async () => { order.push('persist'); return []; });
    mockDeleteGame.mockImplementation(() => { order.push('deleteGame'); });

    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);
    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    expect(order.indexOf('broadcast:hostLeftRoomClosing')).toBeLessThan(order.indexOf('persist'));
    expect(order.indexOf('persist')).toBeLessThan(order.indexOf('deleteGame'));
  });

  it('a STUDENT cannot end the session — no broadcast, no teardown', async () => {
    const socket = makeSocket(STUDENT_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    expect(mockDeleteGame).not.toHaveBeenCalled();
    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it('still closes the room when score persistence blows up', async () => {
    // The session record is already marked `ended` by the time persistence
    // runs, so the session IS over whatever happens next. Leaving the room
    // standing because a Supabase write failed would put the two back out of
    // step — a live room fronting a dead session, which is the exact gap this
    // round exists to close.
    mockPersist.mockRejectedValue(new Error('supabase down'));
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket)({ gameCode: 'ABC123' });

    expect(mockDeleteGame).toHaveBeenCalledWith('ABC123');
    expect(mockBroadcastToRoom).toHaveBeenCalled();
  });

  it('the legacy `classroomGameEnd` name runs the same body — not a weaker twin', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameHandlers(makeIo(), socket as never);

    await endHandlerOf(socket, 'classroomGameEnd')({ gameCode: 'ABC123' });

    expect(mockDeleteGame).toHaveBeenCalledWith('ABC123');
    expect(mockBroadcastToRoom).toHaveBeenCalled();
  });
});
