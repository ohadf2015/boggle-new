/**
 * The recovery door, when there is nothing left to recover.
 *
 * `requestGameState` is what a client fires when `startGame` never arrived.
 * Once the teacher's end-session tears the room down, the lifecycle handler's
 * copy of that listener finds no game and returns — no board, no error, no
 * log. That is pitfall class 4 in its purest form: the failure is byte-for-byte
 * identical to "nothing to do", and what the student sees is a spinner that
 * never resolves.
 *
 * A student on this path is ALREADY SEATED, so the honest answer is not "we
 * didn't recognize that code" — it is the same ending everyone still connected
 * got: the teacher ended the class. Same event, same existing i18n key, so the
 * client needs no new branch and there is no new copy to translate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockEmitClassroomContext, mockGetGameBySocketId, mockGetClassroomGame } = vi.hoisted(() => ({
  mockEmitClassroomContext: vi.fn(),
  mockGetGameBySocketId: vi.fn(),
  mockGetClassroomGame: vi.fn(),
}));

vi.mock('../../modules/classroomGameContext', () => ({ emitClassroomContext: mockEmitClassroomContext }));
vi.mock('../../modules/gameStateManager', () => ({ getGameBySocketId: mockGetGameBySocketId }));
vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { registerClassroomRecoveryHandlers } from '../classroomGameRecovery';
import { CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';

function makeSocket() {
  const listeners: Record<string, (...a: unknown[]) => unknown> = {};
  const socket = {
    id: 'sock-1',
    data: { verifiedUserId: 'student-1' },
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (...a: unknown[]) => unknown) => { listeners[event] = cb; }),
  };
  registerClassroomRecoveryHandlers(socket as never);
  return { socket, fire: () => listeners['requestGameState']() };
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const ended = { gameCode: 'ABC123', classroomId: 'c1', status: 'ended', endedAt: '2026-09-11T10:00:00.000Z' };
const live = { gameCode: 'ABC123', classroomId: 'c1', status: 'playing' };

describe('classroom recovery — an ended session answers, it does not go quiet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameBySocketId.mockReturnValue('ABC123');
  });

  it('tells a recovering student the class ended instead of leaving them on a spinner', async () => {
    mockGetClassroomGame.mockResolvedValue(ended);
    const { socket, fire } = makeSocket();

    fire();
    await flush();

    const notice = socket.emit.mock.calls.find((c) => c[0] === 'hostLeftRoomClosing');
    expect(notice).toBeDefined();
    expect(notice![1]).toMatchObject({ i18nKey: CLASSROOM_ROOM_GONE_KEY });
  });

  it('still restores context for a live session, reusing the record it just read', async () => {
    mockGetClassroomGame.mockResolvedValue(live);
    const { socket, fire } = makeSocket();

    fire();
    await flush();

    expect(socket.emit).not.toHaveBeenCalledWith('hostLeftRoomClosing', expect.anything());
    expect(mockEmitClassroomContext).toHaveBeenCalledWith(socket, 'ABC123', 'student-1');
  });

  it('says nothing at all off a classroom room — ordinary multiplayer is untouched', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const { socket, fire } = makeSocket();

    fire();
    await flush();

    expect(socket.emit).not.toHaveBeenCalledWith('hostLeftRoomClosing', expect.anything());
  });

  it('leaves the student in place when the read throws, rather than inventing an ending', async () => {
    mockGetClassroomGame.mockRejectedValue(new Error('redis down'));
    const { socket, fire } = makeSocket();

    fire();
    await flush();

    expect(socket.emit).not.toHaveBeenCalledWith('hostLeftRoomClosing', expect.anything());
  });
});
