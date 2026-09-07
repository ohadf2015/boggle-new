/**
 * `activeClassroomGames` must say WHICH classroom it is answering for.
 *
 * A student's banner is driven entirely by this response. It carried a bare
 * `{ games }` and nothing else, so a client holding more than one classroom
 * subscription — or one whose classroom changed while a reply was in flight —
 * had no way to tell whose answer had just arrived, and wrote it into whatever
 * classroom it was currently showing.
 *
 * That is recurring pitfall class 3: two classrooms reaching the same client
 * over one indistinguishable payload. Naming the classroom on the wire is what
 * lets `useActiveClassroomGame` throw a foreign answer away instead of trusting
 * it.
 *
 * The membership guard itself is NOT the gap and is only pinned here so it
 * cannot quietly regress: a non-member is refused, out loud.
 */

import { vi } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as membership from '../../modules/supabase/classroomMembership';

vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager');
vi.mock('../classroomGamePersistence', () => ({
  persistClassroomGameScores: vi.fn(async () => []),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  resolveClassroomTeacher: vi.fn(async () => 'no'),
  resolveClassroomRole: vi.fn(async () => ({ status: 'ok', role: 'student' })),
  resolveClassroomName: vi.fn(async () => 'Flow Check'),
  isClassroomTeacher: vi.fn(async () => false),
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

const STUDENT_ID = '00000000-0000-4000-8000-0000000000bb';
const FLOW_CHECK = '00000000-0000-4000-8000-0000000000c1';
const ELA_PERIOD_3 = '00000000-0000-4000-8000-0000000000c2';

function gameIn(classroomId: string, gameCode: string, lessonName: string) {
  return {
    gameCode,
    classroomId,
    teacherId: '00000000-0000-4000-8000-0000000000aa',
    teacherName: 'Ms Plant',
    lessonIds: [],
    lessonNames: [lessonName],
    vocabularyWords: [],
    players: [],
    createdAt: new Date().toISOString(),
    status: 'waiting' as const,
    settings: {},
  };
}

function makeSocket() {
  const handlers: Record<string, (data: unknown) => Promise<void> | void> = {};
  const socket = {
    id: 'socket-active-scope',
    on: vi.fn((event: string, fn: (data: unknown) => Promise<void> | void) => {
      handlers[event] = fn;
    }),
    emit: vi.fn(),
    join: vi.fn(),
    data: { verifiedUserId: STUDENT_ID },
    handshake: { auth: {} },
  };
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
  registerClassroomGameHandlers(io as never, socket as never);
  return { socket, handlers };
}

function emitted(socket: { emit: ReturnType<typeof vi.fn> }, event: string) {
  return socket.emit.mock.calls.find((c: unknown[]) => c[0] === event)?.[1];
}

describe('getActiveClassroomGames — the answer names its classroom', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tells the client which classroom the games belong to', async () => {
    // GIVEN a student who is a member of Flow Check, which has a live game
    vi.mocked(classroomGameManager.getActiveClassroomGames).mockResolvedValue([
      gameIn(FLOW_CHECK, 'R438D5', 'Flow Check Words'),
    ]);
    const { socket, handlers } = makeSocket();

    // WHEN they ask what their class is playing
    await handlers.getActiveClassroomGames({ classroomId: FLOW_CHECK });

    // THEN the reply is addressed, so a client can tell it apart from an
    // answer about any other classroom
    const payload = emitted(socket, 'activeClassroomGames');
    expect(payload).toMatchObject({ classroomId: FLOW_CHECK });
    expect(payload.games).toHaveLength(1);
  });

  it('resolves the classroom NAME server-side and puts it on every game', async () => {
    // GIVEN a live game in Flow Check. Its lesson may well belong to another of
    // the teacher's classes — reuse is the intended workflow — so the classroom
    // name is the only thing that tells a student which class this game is for.
    vi.mocked(classroomGameManager.getActiveClassroomGames).mockResolvedValue([
      gameIn(FLOW_CHECK, 'R438D5', 'Week 3 Vocabulary'),
    ]);
    const { socket, handlers } = makeSocket();

    // WHEN the student's banner asks
    await handlers.getActiveClassroomGames({ classroomId: FLOW_CHECK });

    // THEN the name is resolved HERE, not by a client lookup that could
    // disagree with the game it is labelling
    expect(membership.resolveClassroomName).toHaveBeenCalledWith(FLOW_CHECK);
    const payload = emitted(socket, 'activeClassroomGames');
    expect(payload.classroomName).toBe('Flow Check');
    expect(payload.games[0].classroomName).toBe('Flow Check');
  });

  it('still answers when the classroom name cannot be resolved', async () => {
    // GIVEN a name lookup that fails — a DB blip, a missing row
    vi.mocked(membership.resolveClassroomName).mockResolvedValue(null);
    vi.mocked(classroomGameManager.getActiveClassroomGames).mockResolvedValue([
      gameIn(FLOW_CHECK, 'R438D5', 'Flow Check Words'),
    ]);
    const { socket, handlers } = makeSocket();

    // WHEN the student asks
    await handlers.getActiveClassroomGames({ classroomId: FLOW_CHECK });

    // THEN the game still goes out. A cosmetic label must never be able to
    // hide a live game from a class (recurring pitfall class 4).
    const payload = emitted(socket, 'activeClassroomGames');
    expect(payload.games).toHaveLength(1);
    expect(payload.classroomName).toBeNull();
  });

  it('never returns a game belonging to a different classroom', async () => {
    // GIVEN a Redis set for Flow Check that somehow holds another class's code
    // (a stale membership, a re-used code, a bad write — the store is not a
    // proof of ownership, only the game record is)
    vi.mocked(classroomGameManager.getActiveClassroomGames).mockResolvedValue([
      gameIn(ELA_PERIOD_3, 'WEEK03', 'Week 3 Vocabulary'),
      gameIn(FLOW_CHECK, 'R438D5', 'Flow Check Words'),
    ]);
    const { socket, handlers } = makeSocket();

    // WHEN a Flow Check student asks
    await handlers.getActiveClassroomGames({ classroomId: FLOW_CHECK });

    // THEN the foreign game never reaches them, under any lesson name
    const payload = emitted(socket, 'activeClassroomGames');
    expect(payload.games.map((g: { gameCode: string }) => g.gameCode)).toEqual(['R438D5']);
  });

  it('refuses a non-member out loud rather than answering with an empty list', async () => {
    // GIVEN a student with no relationship to the classroom
    vi.mocked(membership.resolveClassroomRole).mockResolvedValue({ status: 'ok', role: null });
    const { socket, handlers } = makeSocket();

    // WHEN they ask about it
    await handlers.getActiveClassroomGames({ classroomId: ELA_PERIOD_3 });

    // THEN they are told, and the socket is never subscribed to that room.
    // An empty list would be indistinguishable from "no game running"
    // (recurring pitfall class 4).
    expect(emitted(socket, 'classroomGameError')).toBeDefined();
    expect(emitted(socket, 'activeClassroomGames')).toBeUndefined();
    expect(socket.join).not.toHaveBeenCalled();
  });
});
