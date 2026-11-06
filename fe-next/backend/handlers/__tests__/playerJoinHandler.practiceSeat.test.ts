/**
 * Player Join Handler — the teacher's practice seat.
 *
 * The teacher tries the student side of their own classroom room from a frame
 * beside the board, another tab or their phone, often signed in to the same
 * account as the host seat. That seat must never reconnect into the host seat,
 * never register as the account's connection, and never count as a student.
 */

import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';

const {
  mockGetGame, mockGetSocketIdByUsername, mockAddUserToGame, mockGetGameUsers,
  mockGetActiveRooms, mockRestoreGameFromRedis, mockShouldSendGameState, mockCheckSeat,
} = vi.hoisted(() => ({
  mockCheckSeat: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetSocketIdByUsername: vi.fn(),
  mockAddUserToGame: vi.fn(),
  mockGetGameUsers: vi.fn(),
  mockGetActiveRooms: vi.fn(),
  mockRestoreGameFromRedis: vi.fn(),
  mockShouldSendGameState: vi.fn(),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getAuthUserConnection: vi.fn(),
  getSocketIdByUsername: mockGetSocketIdByUsername,
  addUserToGame: mockAddUserToGame,
  updateUserSocketId: vi.fn(),
  removeUserFromGame: vi.fn(),
  getGameUsers: mockGetGameUsers,
  getActiveRooms: mockGetActiveRooms,
  isRoomEmpty: vi.fn(),
  restoreGameFromRedis: mockRestoreGameFromRedis,
  updateHostSocketId: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
  getTournamentIdFromGame: vi.fn(),
  getGameSpectators: vi.fn().mockReturnValue([]),
  addSpectatorToGame: vi.fn(),
  upgradeSpectatorToPlayer: vi.fn(),
  deleteGame: vi.fn(),
  transferHost: vi.fn(),
  getNextEligibleHost: vi.fn(),
  clearSocketMappingsForLeave: vi.fn(),
  isSpectator: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  LOBBY_ROOM: 'lobby',
  safeEmit: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../../utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errorHandler')>('../../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1'),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));

vi.mock('../../modules/blockListManager', () => ({
  isBlocked: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn() }, clearGameTimer: vi.fn(),
}));

vi.mock('../../utils/gameStartCoordinator', () => ({ default: { cancel: vi.fn() } }));
vi.mock('../../services/gameLifecycle/gameTimer.js', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));

vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));

vi.mock('../../utils/gameUtils', () => ({
  generateRandomAvatar: vi.fn().mockReturnValue({ color: 'blue', icon: 'cat' }),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema, data) => ({ success: true, data })),
  joinGameSchema: {},
}));

vi.mock('../../utils/consts', () => ({ MAX_PLAYERS_PER_ROOM: 8 }));

vi.mock('../../utils/gameStateMachine', () => ({
  isInProgress: vi.fn().mockReturnValue(true),
  canJoinFreely: vi.fn().mockReturnValue(true),
  shouldSendGameState: mockShouldSendGameState,
}));

vi.mock('../../modules/notificationService', () => ({
  notifyPlayerJoined: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../playerReconnectHandler', () => ({
  handleReconnection: vi.fn(),
  handleLateJoin: vi.fn(),
  handleTournamentJoin: vi.fn(),
  handleExistingAuthConnectionJoin: vi.fn().mockResolvedValue({ handled: false }),
}));

vi.mock('../classroomSeatGate', () => ({ checkClassroomSeat: mockCheckSeat }));
vi.mock('../playerDataInit', () => ({ ensurePlayerState: vi.fn().mockResolvedValue(undefined) }));

import { registerPlayerJoinHandlers } from '../playerJoinHandler';
import { handleReconnection, handleLateJoin } from '../playerReconnectHandler';

function captureJoinHandler() {
  const listeners: Record<string, (...args: unknown[]) => unknown> = {};
  const socket = {
    id: 'late-socket-1',
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { listeners[event] = cb; }),
  } as unknown as Socket;
  const io = { emit: vi.fn(), to: vi.fn().mockReturnThis() } as unknown as Server;
  registerPlayerJoinHandlers(io, socket);
  return { socket, io, join: listeners['join'] };
}

function inProgressGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'ABC123',
    roomName: 'Room',
    language: 'en',
    users: {},
    gameMode: 'word-hunt',
    gameState: 'in-progress',
    isRanked: false,
    ...overrides,
  };
}

import { emitError } from '../../utils/errorHandler';

import { handleExistingAuthConnectionJoin } from '../playerReconnectHandler';

const TEACHER = '11111111-1111-4111-8111-111111111111';

function lobbyGame(users: Record<string, unknown>) {
  return inProgressGame({ gameState: 'waiting', isClassroom: true, users });
}

describe('PlayerJoinHandler — practice seat in a classroom room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockCheckSeat.mockResolvedValue({ game: { settings: {} }, refused: false });
  });

  it('Given the host is signed in, When the same account joins as a practice seat, Then it gets its own seat and never reaches the account reconnect', async () => {
    mockGetGame.mockReturnValue(lobbyGame({ Dana: { socketId: 'host-socket', authUserId: TEACHER, isHost: true } }));
    const { join, socket } = captureJoinHandler();
    (socket.data as Record<string, unknown>).verifiedUserId = TEACHER;
    await join({ gameCode: 'ABC123', username: 'Dana (practice)', practiceSeat: true });

    expect(handleExistingAuthConnectionJoin).not.toHaveBeenCalled();
    expect(handleReconnection).not.toHaveBeenCalled();
    expect(emitError).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalledWith(
      'ABC123',
      'Dana (practice)',
      'late-socket-1',
      expect.objectContaining({ authUserId: null, isPractice: true, guestTokenHash: expect.stringMatching(/^practice-[0-9a-f]{40}$/) }),
    );
    expect(socket.emit).toHaveBeenCalledWith('joined', expect.objectContaining({ isHost: false, username: 'Dana (practice)' }));
  });

  it('Given the practice seat asks for the host name, Then the name is refused and the host seat is untouched', async () => {
    mockGetGame.mockReturnValue(lobbyGame({ Dana: { socketId: 'host-socket', authUserId: TEACHER, isHost: true } }));
    mockGetSocketIdByUsername.mockImplementation((_c: string, name: string) => (name === 'Dana' ? 'host-socket' : undefined));
    const { join, socket } = captureJoinHandler();
    (socket.data as Record<string, unknown>).verifiedUserId = TEACHER;
    await join({ gameCode: 'ABC123', username: 'Dana', practiceSeat: true });

    expect(emitError).toHaveBeenCalledWith(expect.anything(), 'PLAYER_USERNAME_TAKEN', expect.anything());
    expect(handleReconnection).not.toHaveBeenCalled();
    expect(mockAddUserToGame).not.toHaveBeenCalled();
  });

  it('Given the practice seat already sits, When it rejoins on the same account, Then it reconnects to its own seat, not the host', async () => {
    const { join: first, socket: s1 } = captureJoinHandler();
    (s1.data as Record<string, unknown>).verifiedUserId = TEACHER;
    mockGetGame.mockReturnValue(lobbyGame({ Dana: { socketId: 'host-socket', authUserId: TEACHER, isHost: true } }));
    await first({ gameCode: 'ABC123', username: 'Dana (practice)', practiceSeat: true });
    const token = vi.mocked(mockAddUserToGame).mock.calls[0][3].guestTokenHash as string;

    vi.clearAllMocks();
    mockCheckSeat.mockResolvedValue({ game: { settings: {} }, refused: false });
    mockGetGame.mockReturnValue(
      lobbyGame({
        Dana: { socketId: 'host-socket', authUserId: TEACHER, isHost: true },
        'Dana (practice)': { socketId: 'old-practice', guestTokenHash: token, isPractice: true },
      }),
    );
    const { join: again, socket: s2 } = captureJoinHandler();
    (s2.data as Record<string, unknown>).verifiedUserId = TEACHER;
    await again({ gameCode: 'ABC123', username: 'Someone else', practiceSeat: true });

    expect(handleExistingAuthConnectionJoin).not.toHaveBeenCalled();
    expect(vi.mocked(handleReconnection).mock.calls[0][4]).toBe('Dana (practice)');
  });

  it('Given an ordinary multiplayer room, When a client sends practiceSeat, Then it is ignored and the account reconnect runs as usual', async () => {
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
    mockGetGame.mockReturnValue(inProgressGame({ gameState: 'waiting', users: {} }));
    const { join, socket } = captureJoinHandler();
    (socket.data as Record<string, unknown>).verifiedUserId = TEACHER;
    await join({ gameCode: 'ABC123', username: 'Dana', practiceSeat: true });

    expect(handleExistingAuthConnectionJoin).toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalledWith('ABC123', 'Dana', 'late-socket-1', expect.objectContaining({ authUserId: TEACHER, isPractice: false }));
  });

  it('Given a guest frame with no account, Then its practice seat is keyed by its own guest token', async () => {
    mockGetGame.mockReturnValue(lobbyGame({ Dana: { socketId: 'host-socket', authUserId: TEACHER, isHost: true } }));
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Test student', practiceSeat: true, guestTokenHash: 'a'.repeat(64) });
    const opts = vi.mocked(mockAddUserToGame).mock.calls[0][3];
    expect(opts).toEqual(expect.objectContaining({ authUserId: null, isPractice: true }));
    expect(opts.guestTokenHash).not.toBe('a'.repeat(64));
  });
});
