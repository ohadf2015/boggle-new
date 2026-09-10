/**
 * The ended-game code, on the SOCKET door.
 *
 * `lib/education/classroomGameLookup` now refuses an ended game, which shuts
 * the three HTTP doors (`classroom/join`, `join-code/resolve`,
 * `classroom/live-game`). `joinClassroomGame` is the fourth door and it is a
 * different code path: `components/student/ClassroomGameBanner.tsx:117` emits it
 * straight from the student hub, and the handler only ever asked
 * `getClassroomGame(code)` — truthy record, come on in.
 *
 * That is recurring pitfall class 3 exactly: two routes to "join this classroom
 * game", one of them silently weaker. The banner makes it reachable in practice
 * because it holds a game code in client state between its 15-second polls, so
 * the teacher can end the round and a student can still tap JOIN on a card that
 * has not refreshed yet — and land in a room that no longer exists.
 *
 * The rejection is deliberately INDISTINGUISHABLE from "no such game", both here
 * and at the HTTP boundary. That is the Kahoot bar ("We didn't recognize that
 * game PIN" covers both), and it means no new user-facing copy and no new
 * translation keys. The `code` field is for our logs, not the student's screen —
 * `ClassroomGameBanner` renders its own localized line either way.
 */

import { vi, type Mock } from 'vitest';
import { registerClassroomGameHandlers } from '../classroomGameHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as classroomMembership from '../../modules/supabase/classroomMembership';

vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
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
vi.mock('./classroomGamePersistence.js', () => ({ persistClassroomGameScores: vi.fn() }));
vi.mock('../classroomGamePersistence', () => ({ persistClassroomGameScores: vi.fn() }));

const STUDENT_ID = '00000000-0000-4000-8000-0000000000aa';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000000bb';

function makeSocket() {
  return {
    id: 'socket-123',
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    handshake: { auth: { authUserId: STUDENT_ID } },
  } as never as { on: Mock; emit: Mock };
}

const makeIo = () => ({ to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn() }) as never;

function joinHandlerOf(socket: { on: Mock }) {
  const entry = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'joinClassroomGame');
  if (!entry) throw new Error('joinClassroomGame handler was never registered');
  return entry[1] as (data: unknown) => Promise<void>;
}

describe('joinClassroomGame — a code whose game has ended', () => {
  let socket: ReturnType<typeof makeSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = makeSocket();
    (classroomMembership.resolveClassroomRole as Mock).mockResolvedValue({
      status: 'ok',
      role: 'student',
    });
    (classroomGameManager.addPlayerToClassroomGame as Mock).mockResolvedValue(undefined);
  });

  it('refuses the join and never adds the student to an ended game', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      gameCode: 'ABC123',
      classroomId: CLASSROOM_ID,
      players: [],
      status: 'ended',
      endedAt: '2026-09-10T09:14:00.000Z',
    });

    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });

    expect(classroomGameManager.addPlayerToClassroomGame).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith(
      'joinedClassroomGame',
      expect.anything()
    );
    // Named with the game code — `classroomGameError` is a shared channel and
    // `ClassroomGameBanner` filters on that field before it shows anything.
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', {
      error: 'Game not found',
      code: 'GAME_ENDED',
      gameCode: 'ABC123',
    });
  });

  /**
   * THE BETWEEN-ROUND LATECOMER. `status: 'finished'` is written the instant a
   * round's timer expires, and the teacher starts the next one seconds to
   * minutes later while the class reads the results screen. The room, the
   * roster and the projector code are all alive for that whole gap, so a
   * student typing the code off the whiteboard has to get in — Kahoot's PIN
   * survives between questions and dies only when the host ends the game.
   */
  it('lets a latecomer join between two rounds', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      gameCode: 'ABC123',
      classroomId: CLASSROOM_ID,
      players: [],
      status: 'finished',
    });

    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });

    expect(socket.emit).not.toHaveBeenCalledWith(
      'classroomGameError',
      expect.objectContaining({ error: 'Game not found' })
    );
    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
  });

  /**
   * The membership probe must not run for an ended code either. Loading the game
   * first is what stops `joinClassroomGame` being used as an oracle for valid
   * classroom ids (the comment on the existing `!existingGame` guard) — a status
   * check placed after the probe would re-open exactly that hole.
   */
  it('rejects before probing Supabase for classroom membership', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      gameCode: 'ABC123',
      classroomId: CLASSROOM_ID,
      players: [],
      status: 'ended',
      endedAt: '2026-09-10T09:14:00.000Z',
    });

    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });

    expect(classroomMembership.resolveClassroomRole).not.toHaveBeenCalled();
  });

  it.each(['waiting', 'playing'] as const)('still lets a student into a %s game', async (status) => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      gameCode: 'ABC123',
      classroomId: CLASSROOM_ID,
      players: [{ userId: STUDENT_ID, username: 'Alice' }],
      status,
    });

    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });

    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('joinedClassroomGame', {
      success: true,
      gameCode: 'ABC123',
    });
  });

  /**
   * A record written before `status` existed must stay joinable — same fail-open
   * rule as the HTTP lookup. The sibling suite's own join test mocks a record
   * with no status at all, so this is load-bearing, not hypothetical.
   */
  it('treats a record with no status as joinable', async () => {
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      gameCode: 'ABC123',
      classroomId: CLASSROOM_ID,
      players: [{ userId: STUDENT_ID, username: 'Alice' }],
    });

    registerClassroomGameHandlers(makeIo(), socket as never);
    await joinHandlerOf(socket)({ gameCode: 'ABC123', userId: STUDENT_ID, username: 'Alice' });

    expect(classroomGameManager.addPlayerToClassroomGame).toHaveBeenCalled();
  });
});

/**
 * A module nobody registers is a class-4 no-op that looks exactly like working
 * code. The classroom half of `requestGameState` lives in its own file
 * (`classroomGameRecovery`) so the 850-line lifecycle handler need not grow;
 * this is the assertion that it is actually wired to every socket. `index.ts`
 * calls `registerClassroomGameHandlers` unconditionally, guests included.
 */
describe('classroom recovery wiring', () => {
  it('registers a requestGameState listener for every socket', () => {
    const socket = makeSocket();

    registerClassroomGameHandlers(makeIo(), socket as never);

    expect(socket.on.mock.calls.some((c: unknown[]) => c[0] === 'requestGameState')).toBe(true);
  });
});
