import { vi } from 'vitest';

const { mockGetClassroomGame, mockSetLocked, mockBroadcastToRoom, mockCheckRateLimit } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockSetLocked: vi.fn(),
  mockBroadcastToRoom: vi.fn(),
  mockCheckRateLimit: vi.fn(() => true),
}));

vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../modules/gameStateManager', () => ({
  getGameUsers: () => [{ username: 'Sam', authUserId: 'u1' }, { username: 'Gus', guestTokenHash: 'h1' }],
}));
vi.mock('../../modules/classroomLobbyLock', async () => {
  const actual = await vi.importActual<typeof import('../../modules/classroomLobbyLock')>('../../modules/classroomLobbyLock');
  return { ...actual, setClassroomLobbyLocked: mockSetLocked };
});
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: vi.fn((code: string) => `game:${code}`),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { registerClassroomLobbyLockHandlers } from '../classroomLobbyLockHandler';
import { LOBBY_LOCK_EVENTS, lockSeatsOf } from '../../modules/classroomLobbyLock';

const GAME = { gameCode: 'ABC123', classroomId: 'class-1', teacherId: 'teacher-1', status: 'waiting', settings: {}, players: [{ userId: 'p1' }] };

function makeSocket(authUserId: string | null = 'teacher-1') {
  return { id: 'socket-1', emit: vi.fn(), on: vi.fn(), handshake: { auth: {} }, data: authUserId ? { verifiedUserId: authUserId } : {} };
}

function register(socket: ReturnType<typeof makeSocket>) {
  const classEmit = vi.fn();
  const io = { to: vi.fn(() => ({ emit: classEmit })) };
  registerClassroomLobbyLockHandlers(io as never, socket as never);
  const handlerFor = (event: string) => socket.on.mock.calls.find((c) => c[0] === event)?.[1];
  return { io, classEmit, set: handlerFor(LOBBY_LOCK_EVENTS.set), get: handlerFor(LOBBY_LOCK_EVENTS.get) };
}

const failed = { error: 'education.projectorLobby.lock.failed', code: 'LOBBY_LOCK_FAILED' };

describe('setClassroomLobbyLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetClassroomGame.mockResolvedValue(JSON.parse(JSON.stringify(GAME)));
    mockSetLocked.mockResolvedValue(true);
  });

  it('GIVEN the room teacher WHEN they lock THEN the record is written and every surface is told', async () => {
    const socket = makeSocket();
    const { set, io, classEmit } = register(socket);

    await set({ gameCode: 'ABC123', locked: true });

    const announcement = { gameCode: 'ABC123', locked: true };
    expect(mockSetLocked).toHaveBeenCalledWith('ABC123', true, [...lockSeatsOf([{ authUserId: 'u1' }, { guestTokenHash: 'h1' }]), 'a:p1']);
    expect(socket.emit).toHaveBeenCalledWith(LOBBY_LOCK_EVENTS.changed, announcement);
    expect(mockBroadcastToRoom).toHaveBeenCalledWith(io, 'game:ABC123', LOBBY_LOCK_EVENTS.changed, announcement);
    expect(io.to).toHaveBeenCalledWith('classroom:class-1');
    expect(classEmit).toHaveBeenCalledWith(LOBBY_LOCK_EVENTS.changed, announcement);
  });

  it('GIVEN someone who is not the teacher WHEN they lock THEN nothing is written and they are told', async () => {
    const socket = makeSocket('student-9');
    const { set } = register(socket);

    await set({ gameCode: 'ABC123', locked: true });

    expect(mockSetLocked).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining(failed));
  });

  it('GIVEN no signed-in user THEN the lock is refused out loud', async () => {
    const socket = makeSocket(null);
    const { set } = register(socket);
    await set({ gameCode: 'ABC123', locked: true });
    expect(mockSetLocked).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining(failed));
  });

  it('GIVEN a malformed payload THEN the lock is refused out loud', async () => {
    const socket = makeSocket();
    const { set } = register(socket);
    await set({ gameCode: 'ABC123', locked: 'yes' });
    expect(mockSetLocked).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining(failed));
  });

  it('GIVEN the write fails THEN the teacher is told and nobody hears a change', async () => {
    mockSetLocked.mockResolvedValue(false);
    const socket = makeSocket();
    const { set } = register(socket);
    await set({ gameCode: 'ABC123', locked: false });
    expect(socket.emit).toHaveBeenCalledWith('classroomGameError', expect.objectContaining(failed));
    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('GIVEN the rate limit trips THEN nothing is written', async () => {
    mockCheckRateLimit.mockReturnValue(false);
    const socket = makeSocket();
    const { set } = register(socket);
    await set({ gameCode: 'ABC123', locked: true });
    expect(mockSetLocked).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('rateLimited');
  });
});

describe('getClassroomLobbyLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
  });

  it('GIVEN a reloaded projector WHEN it asks THEN only it hears the stored lock', async () => {
    mockGetClassroomGame.mockResolvedValue({ ...GAME, settings: { lobbyLocked: true } });
    const socket = makeSocket();
    const { get } = register(socket);

    await get({ gameCode: 'ABC123' });

    expect(socket.emit).toHaveBeenCalledWith(LOBBY_LOCK_EVENTS.changed, { gameCode: 'ABC123', locked: true });
    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('GIVEN a non-teacher asks THEN they hear nothing', async () => {
    mockGetClassroomGame.mockResolvedValue({ ...GAME, settings: { lobbyLocked: true } });
    const socket = makeSocket('student-9');
    const { get } = register(socket);
    await get({ gameCode: 'ABC123' });
    expect(socket.emit).not.toHaveBeenCalledWith(LOBBY_LOCK_EVENTS.changed, expect.anything());
  });
});
