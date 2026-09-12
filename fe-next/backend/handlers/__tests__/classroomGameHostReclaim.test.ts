/**
 * A teacher returning to a room they already host must get the room back,
 * not GAME_ALREADY_EXISTS.
 *
 * WHY: the classroom host boot path (`?room=X&classroom=true&host=true`) only
 * knows how to CREATE. On any re-entry — a reload, a socket reconnect, a
 * restored tab — it re-emits `createGame` for a code that already exists, the
 * server answers GAME_ALREADY_EXISTS, and the client's `codeExists` branch
 * does `setIsActive(false)` and drops the teacher on the Arena Hub. Worse, the
 * socket was never seated, so `getGameBySocketId` is null and every teacher
 * live control after that logs "endRoundNow ignored: socket not in a game".
 *
 * Seen live 2026-09-11 in room VHT76G at 03:45:04 and again at 03:52:18.
 *
 * The seat is handed back ONLY to the verified auth user who is already the
 * room's host. The "a student cannot reclaim" case below is the security
 * boundary and must never be relaxed.
 */

import { vi, type Mock } from 'vitest';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
} }));

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: vi.fn(),
}));

vi.mock('../playerReconnectHandler.js', () => ({
  handleReconnection: vi.fn(),
}));

import { getGame } from '../../modules/gameStateManager.js';
import { handleReconnection } from '../playerReconnectHandler.js';
import { tryReclaimClassroomHostSeat } from '../classroomGameHostReclaim';

const mockGetGame = getGame as unknown as Mock;
const mockHandleReconnection = handleReconnection as unknown as Mock;

const TEACHER_ID = 'teacher-74f8f1ae';
const STUDENT_ID = 'student-bcfdfe70';

function makeClassroomGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'VHT76G',
    isClassroom: true,
    hostUsername: 'Mr. Gauntlet B',
    users: {
      'Mr. Gauntlet B': { isHost: true, authUserId: TEACHER_ID, socketId: null },
      Noa: { isHost: false, authUserId: STUDENT_ID, socketId: 'sock-noa' },
    },
    ...overrides,
  };
}

function makeSocket(verifiedUserId?: string) {
  return { id: 'sock-new', data: verifiedUserId ? { verifiedUserId } : {} } as never;
}

const io = {} as never;

describe('tryReclaimClassroomHostSeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hands the room back to the verified teacher who already hosts it', () => {
    mockGetGame.mockReturnValue(makeClassroomGame());

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(TEACHER_ID), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID,
    });

    expect(reclaimed).toBe(true);
    expect(mockHandleReconnection).toHaveBeenCalledTimes(1);
  });

  it('re-seats under the HOST username, not whatever the payload claims', () => {
    mockGetGame.mockReturnValue(makeClassroomGame());

    tryReclaimClassroomHostSeat(io, makeSocket(TEACHER_ID), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID,
      // The boot path sends a display name that may have drifted; the seat is
      // identified by the room's own host record.
      hostUsername: 'Someone Else',
    });

    const args = mockHandleReconnection.mock.calls[0];
    expect(args[3]).toBe('VHT76G');
    expect(args[4]).toBe('Mr. Gauntlet B');
    expect(args[5]).toBe(TEACHER_ID);
  });

  it('refuses a student who asks for the room (security boundary)', () => {
    mockGetGame.mockReturnValue(makeClassroomGame());

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(STUDENT_ID), {
      gameCode: 'VHT76G',
      authUserId: STUDENT_ID,
    });

    expect(reclaimed).toBe(false);
    expect(mockHandleReconnection).not.toHaveBeenCalled();
  });

  it('refuses a payload that claims an auth id the socket has not verified', () => {
    mockGetGame.mockReturnValue(makeClassroomGame());

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(STUDENT_ID), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID, // spoofed claim
    });

    expect(reclaimed).toBe(false);
    expect(mockHandleReconnection).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated socket', () => {
    mockGetGame.mockReturnValue(makeClassroomGame());

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID,
    });

    expect(reclaimed).toBe(false);
    expect(mockHandleReconnection).not.toHaveBeenCalled();
  });

  it('leaves ordinary multiplayer rooms on the existing dedup error', () => {
    mockGetGame.mockReturnValue(makeClassroomGame({ isClassroom: false }));

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(TEACHER_ID), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID,
    });

    expect(reclaimed).toBe(false);
    expect(mockHandleReconnection).not.toHaveBeenCalled();
  });

  it('refuses when the room has no host record to match against', () => {
    mockGetGame.mockReturnValue(makeClassroomGame({ hostUsername: null }));

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(TEACHER_ID), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID,
    });

    expect(reclaimed).toBe(false);
  });

  it('refuses when the host seat belongs to a guest (no auth id to prove)', () => {
    mockGetGame.mockReturnValue(
      makeClassroomGame({
        users: { 'Mr. Gauntlet B': { isHost: true, authUserId: null, socketId: null } },
      })
    );

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(TEACHER_ID), {
      gameCode: 'VHT76G',
      authUserId: TEACHER_ID,
    });

    expect(reclaimed).toBe(false);
  });

  it('refuses when the room does not exist', () => {
    mockGetGame.mockReturnValue(null);

    const reclaimed = tryReclaimClassroomHostSeat(io, makeSocket(TEACHER_ID), {
      gameCode: 'NOPE12',
      authUserId: TEACHER_ID,
    });

    expect(reclaimed).toBe(false);
    expect(mockHandleReconnection).not.toHaveBeenCalled();
  });
});
