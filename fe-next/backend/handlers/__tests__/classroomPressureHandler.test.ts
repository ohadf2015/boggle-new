/**
 * The pressure dials' write path.
 *
 * `createClassroomGame` whitelists its settings keys and is owned by another
 * change, so the dials cannot ride the room's birth — the lobby emits this
 * event the moment the room exists (and again if the teacher re-opens the
 * dials before start). The read side is `startGame`, which resolves the dials
 * off this record into the common payload, so a dial that never reached Redis
 * would silently run the loud default in front of the class (pitfall 4).
 *
 * Every refusal emits: a teacher who taps a dial and sees nothing happen has
 * no way to tell "saved" from "dropped" while thirty students wait.
 */
import { vi, type Mock } from 'vitest';

const { mockGetClassroomGame, mockSetPressure, mockBroadcastToRoom, mockCheckRateLimit } =
  vi.hoisted(() => ({
    mockGetClassroomGame: vi.fn(),
    mockSetPressure: vi.fn(),
    mockBroadcastToRoom: vi.fn(),
    mockCheckRateLimit: vi.fn(() => true),
  }));

vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
}));
vi.mock('../../modules/classroomGameSettings', () => ({
  setClassroomPressureSettings: mockSetPressure,
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: vi.fn((code: string) => `game:${code}`),
}));
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: mockCheckRateLimit,
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { registerClassroomPressureHandlers } from '../classroomPressureHandler';

const GAME = {
  gameCode: 'ABC123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  status: 'waiting',
  settings: { gameMode: 'classic' },
  players: [],
};

function makeSocket(authUserId: string | null = 'teacher-1') {
  return {
    id: 'socket-1',
    emit: vi.fn(),
    on: vi.fn(),
    handshake: { auth: {} },
    data: authUserId ? { verifiedUserId: authUserId } : {},
  };
}

function registerOn(socket: ReturnType<typeof makeSocket>) {
  const io = { to: vi.fn(() => ({ emit: vi.fn() })) };
  registerClassroomPressureHandlers(io as never, socket as never);
  const handler = socket.on.mock.calls.find((c) => c[0] === 'updateClassroomGamePressure')?.[1];
  return { handler, io };
}

describe('updateClassroomGamePressure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetClassroomGame.mockResolvedValue(JSON.parse(JSON.stringify(GAME)));
    mockSetPressure.mockResolvedValue(true);
  });

  it('registers the listener', () => {
    const socket = makeSocket();
    const { handler } = registerOn(socket);
    expect(handler).toBeTypeOf('function');
  });

  it('writes the dials and announces them to the socket, the room and the class', async () => {
    const socket = makeSocket();
    const { handler, io } = registerOn(socket);

    await handler({ gameCode: 'ABC123', pressure: { leaderboard: 'hidden', timer: 'off' } });

    expect(mockSetPressure).toHaveBeenCalledWith('ABC123', { leaderboard: 'hidden', timer: 'off' });
    const announcement = { gameCode: 'ABC123', pressure: { leaderboard: 'hidden', timer: 'off' } };
    expect(socket.emit).toHaveBeenCalledWith('classroomGamePressureChanged', announcement);
    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      io,
      'game:ABC123',
      'classroomGamePressureChanged',
      announcement
    );
    expect(io.to).toHaveBeenCalledWith('classroom:class-1');
  });

  it('rejects a payload with no valid dial fields — out loud', async () => {
    const socket = makeSocket();
    const { handler } = registerOn(socket);

    await handler({ gameCode: 'ABC123', pressure: { leaderboard: 'invisible' } });

    expect(mockSetPressure).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      'classroomGameError',
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('rejects when the caller is not the room’s teacher', async () => {
    const socket = makeSocket('someone-else');
    const { handler } = registerOn(socket);

    await handler({ gameCode: 'ABC123', pressure: { timer: 'off' } });

    expect(mockSetPressure).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      'classroomGameError',
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('rejects when unauthenticated', async () => {
    const socket = makeSocket(null);
    const { handler } = registerOn(socket);

    await handler({ gameCode: 'ABC123', pressure: { timer: 'off' } });

    expect(mockSetPressure).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      'classroomGameError',
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('reports failure instead of pretending when the write does not land', async () => {
    mockSetPressure.mockResolvedValue(false);
    const socket = makeSocket();
    const { handler } = registerOn(socket);

    await handler({ gameCode: 'ABC123', pressure: { timer: 'gentle' } });

    expect(socket.emit).toHaveBeenCalledWith(
      'classroomGameError',
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(socket.emit).not.toHaveBeenCalledWith(
      'classroomGamePressureChanged',
      expect.anything()
    );
  });

  it('honours the rate limit with the rateLimited event, not silence', async () => {
    mockCheckRateLimit.mockReturnValue(false);
    const socket = makeSocket();
    const { handler } = registerOn(socket);

    await handler({ gameCode: 'ABC123', pressure: { timer: 'off' } });

    expect(mockSetPressure).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('rateLimited');
  });
});
