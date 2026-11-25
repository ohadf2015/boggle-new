/**
 * A socket that connected before the login loaded has no verified account, so the
 * join payload's access token is verified on `join` and counts like connection auth.
 */

import { SignJWT } from 'jose';
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
import { handleReconnection } from '../playerReconnectHandler';
import { emitError } from '../../utils/errorHandler';

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


vi.mock('../../modules/supabase/client', async (orig) => ({ ...(await orig<object>()), getSupabase: () => null }));

const SECRET = 'join-token-test-secret-needs-32-characters';
const HOST = '11111111-1111-4111-8111-111111111111';
const OTHER = '99999999-9999-4999-8999-999999999999';

async function accessToken(sub: string, secret = SECRET): Promise<string> {
  return new SignJWT({ sub, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('https://proj.supabase.co/auth/v1')
    .setAudience('authenticated')
    .sign(new TextEncoder().encode(secret));
}

function unsignedToken(sub: string): string {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'none', typ: 'JWT' })}.${part({ sub, aud: 'authenticated', iss: 'https://proj.supabase.co/auth/v1', exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
}

function hostRoom() {
  return { gameCode: 'ABC123', roomName: 'Room', language: 'en', gameMode: 'word-hunt', gameState: 'waiting', isRanked: false,
    users: { Dana: { socketId: 'old-socket', isHost: true, authUserId: HOST } } };
}

describe('PlayerJoinHandler — access token sent with join', () => {
  beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockShouldSendGameState.mockReturnValue(true);
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
    mockGetGame.mockReturnValue(hostRoom());
    mockGetSocketIdByUsername.mockImplementation((_code: string, name: string) => (name === 'Dana' ? 'old-socket' : undefined));
  });

  it('puts the host back in their own seat when the join carries their verified token', async () => {
    const { join, socket } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Dana', authUserId: HOST, authToken: await accessToken(HOST) });
    expect(emitError).not.toHaveBeenCalled();
    expect(mockAddUserToGame).not.toHaveBeenCalled();
    expect(handleReconnection).toHaveBeenCalledWith(expect.anything(), socket, expect.anything(), 'ABC123', 'Dana', HOST, undefined);
    expect((socket.data as Record<string, unknown>).verifiedUserId).toBe(HOST);
    expect(socket.join).toHaveBeenCalledWith(`user:${HOST}`);
  });

  it('seats a token signed with another secret as "Dana 2", never in the host seat', async () => {
    const { join, socket } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Dana', authUserId: HOST, authToken: await accessToken(HOST, 'some-other-secret-that-is-32-chars-long') });
    expect(handleReconnection).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalledWith('ABC123', 'Dana 2', 'late-socket-1', expect.anything());
    expect((socket.data as Record<string, unknown>).verifiedUserId).toBeUndefined();
  });

  it('seats an unsigned token as "Dana 2"', async () => {
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Dana', authUserId: HOST, authToken: unsignedToken(HOST) });
    expect(handleReconnection).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalledWith('ABC123', 'Dana 2', 'late-socket-1', expect.anything());
  });

  it('seats another signed-in account typing the host name as "Dana 2", never in the host seat', async () => {
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Dana', authUserId: HOST, authToken: await accessToken(OTHER) });
    expect(handleReconnection).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalledWith('ABC123', 'Dana 2', 'late-socket-1', expect.anything());
    expect(emitError).not.toHaveBeenCalledWith(expect.anything(), 'PLAYER_USERNAME_TAKEN', expect.anything());
  });

  it('keeps the account the socket verified at connect, whatever token the join carries', async () => {
    const { join, socket } = captureJoinHandler();
    (socket.data as Record<string, unknown>).verifiedUserId = OTHER;
    await join({ gameCode: 'ABC123', username: 'Dana', authToken: await accessToken(HOST) });
    expect(handleReconnection).not.toHaveBeenCalled();
    expect((socket.data as Record<string, unknown>).verifiedUserId).toBe(OTHER);
  });

  it('without a token behaves as before: an unverified claim of the host id sits as "Dana 2"', async () => {
    const { join, socket } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Dana', authUserId: HOST });
    expect(handleReconnection).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalledWith('ABC123', 'Dana 2', 'late-socket-1', expect.anything());
    expect(socket.join).not.toHaveBeenCalledWith(`user:${HOST}`);
  });
});
