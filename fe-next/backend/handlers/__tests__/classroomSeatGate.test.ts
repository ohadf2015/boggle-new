/**
 * The ONE seating gate, tested as one rule with two dialects.
 *
 * Round 3 shut the enrolment door (`joinClassroomGame`) and the three HTTP
 * doors. It left the base multiplayer door — `socket.on('join')` — wide open:
 * a fresh socket emitting the ordinary `join` with an ended classroom code got
 * `{ success: true }` and walked into a dead session. Kahoot's bar is that an
 * ended PIN is refused EVERYWHERE, so the rule now lives in one module that
 * every seating path calls, rather than in a copy per handler (pitfall 3).
 *
 * Three properties this pins, because each one is a way the gate could be
 * quietly wrong:
 *   - An ordinary multiplayer room has NO classroom record, so it is untouched.
 *   - A Redis failure fails OPEN. Locking a live class out of a running round
 *     because a read blipped is strictly worse than the bug (pitfall 4).
 *   - The record is returned to the caller, so the one read the gate makes is
 *     the same read `emitClassroomContext` would have made.
 */
import { vi } from 'vitest';
import type { Socket } from 'socket.io';

const { mockGetClassroomGame, mockEmitError } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockEmitError: vi.fn(),
}));

vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../utils/errorHandler', () => ({
  emitError: mockEmitError,
  ErrorCodes: { GAME_NOT_FOUND: 'GAME_NOT_FOUND' },
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { checkClassroomSeat, refuseSeat } from '../classroomSeatGate';

const makeSocket = () => ({ id: 'sock-1', emit: vi.fn() }) as unknown as Socket;

const liveGame = { gameCode: 'ABC123', classroomId: 'c1', status: 'playing' };
const roundOver = { gameCode: 'ABC123', classroomId: 'c1', status: 'finished' };
const endedGame = { gameCode: 'ABC123', classroomId: 'c1', status: 'ended', endedAt: '2026-09-11T10:00:00.000Z' };

describe('classroomSeatGate — one rule, every seating path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses an ended session on the base multiplayer door with the SAME shape as an unknown code', async () => {
    mockGetClassroomGame.mockResolvedValue(endedGame);
    const socket = makeSocket();

    const seat = await checkClassroomSeat(socket, 'ABC123', 'multiplayer');

    expect(seat.refused).toBe(true);
    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('refuses an ended session on the classroom door in the classroom dialect', async () => {
    mockGetClassroomGame.mockResolvedValue(endedGame);
    const socket = makeSocket();

    const seat = await checkClassroomSeat(socket, 'ABC123', 'classroom');

    expect(seat.refused).toBe(true);
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', {
      error: 'Game not found',
      code: 'GAME_ENDED',
      gameCode: 'ABC123',
    });
    expect(mockEmitError).not.toHaveBeenCalled();
  });

  it('leaves an ORDINARY multiplayer room untouched — no classroom record, no refusal', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const socket = makeSocket();

    const seat = await checkClassroomSeat(socket, 'ZZZ999', 'multiplayer');

    expect(seat).toEqual({ game: null, refused: false });
    expect(mockEmitError).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("treats status 'finished' as a ROUND boundary, not a dead code", async () => {
    mockGetClassroomGame.mockResolvedValue(roundOver);
    const socket = makeSocket();

    const seat = await checkClassroomSeat(socket, 'ABC123', 'multiplayer');

    expect(seat.refused).toBe(false);
    expect(seat.game).toBe(roundOver);
  });

  it('fails OPEN when the Redis read throws — a blip must not lock a live class out', async () => {
    mockGetClassroomGame.mockRejectedValue(new Error('redis down'));
    const socket = makeSocket();

    const seat = await checkClassroomSeat(socket, 'ABC123', 'multiplayer');

    expect(seat).toEqual({ game: null, refused: false });
    expect(mockEmitError).not.toHaveBeenCalled();
  });

  it('hands the loaded record back so the caller never reads Redis twice', async () => {
    mockGetClassroomGame.mockResolvedValue(liveGame);

    const seat = await checkClassroomSeat(makeSocket(), 'ABC123', 'multiplayer');

    expect(seat.game).toBe(liveGame);
    expect(mockGetClassroomGame).toHaveBeenCalledTimes(1);
  });

  it("omits the GAME_ENDED log code for a code that never existed", () => {
    const socket = makeSocket();
    refuseSeat(socket, 'NOPE12', 'classroom', 'unknown');
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', {
      error: 'Game not found',
      gameCode: 'NOPE12',
    });
  });
});
