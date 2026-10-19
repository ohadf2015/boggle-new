/**
 * Player Join Handler — late-join recovery flag.
 *
 * Bug: a NEW player joining an in-progress game ("late joiner") only received
 * the board via the immediate `handleLateJoin` startGame emit. If that emit
 * raced the client's `socket.on('startGame')` registration it was lost, and —
 * unlike a reconnection — the client had no signal to arm a `requestGameState`
 * fallback. Result: the late joiner stayed on a default/classic grid while
 * later `wordHuntLifeUpdate` broadcasts still fired elimination toasts over it.
 *
 * Fix: the `joined` payload now carries `gameInProgress` so the client can arm
 * the same lost-startGame safety-net it already uses for reconnections.
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

describe('PlayerJoinHandler — classroom late join switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(true);
  });

  it('refuses a NEW student when the teacher turned late join off and the round is running', async () => {
    mockGetGame.mockReturnValue(inProgressGame());
    mockCheckSeat.mockResolvedValue({ game: { settings: { allowLateJoin: false } }, refused: false });
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Latecomer' });
    expect(emitError).toHaveBeenCalledWith(expect.anything(), 'GAME_CLOSED', expect.anything());
    expect(mockAddUserToGame).not.toHaveBeenCalled();
  });

  it('still lets a student already in the room reconnect', async () => {
    mockGetGame.mockReturnValue(inProgressGame({ users: { Sam: { socketId: 'old' } } }));
    mockCheckSeat.mockResolvedValue({ game: { settings: { allowLateJoin: false } }, refused: false });
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam' });
    expect(emitError).not.toHaveBeenCalled();
    expect(handleReconnection).toHaveBeenCalled();
  });

  it('lets a late student in when the switch is on or unset', async () => {
    mockGetGame.mockReturnValue(inProgressGame());
    mockCheckSeat.mockResolvedValue({ game: { settings: { allowLateJoin: true } }, refused: false });
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Latecomer' });
    expect(emitError).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });
});

describe('PlayerJoinHandler — a taken display name is not a reconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue('old-socket');
    mockShouldSendGameState.mockReturnValue(true);
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
  });

  it('refuses a different guest who types the name of a seated student', async () => {
    mockGetGame.mockReturnValue(inProgressGame({ users: { Sam: { socketId: 'old-socket', guestTokenHash: 'h1' } } }));
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam', guestTokenHash: 'h2' });
    expect(emitError).toHaveBeenCalledWith(expect.anything(), 'PLAYER_USERNAME_TAKEN', expect.anything());
    expect(handleReconnection).not.toHaveBeenCalled();
  });

  it('still reconnects the same guest (same token hash)', async () => {
    mockGetGame.mockReturnValue(inProgressGame({ users: { Sam: { socketId: 'old-socket', guestTokenHash: 'h1' } } }));
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam', guestTokenHash: 'h1' });
    expect(emitError).not.toHaveBeenCalled();
    expect(handleReconnection).toHaveBeenCalled();
  });

  it('keeps reconnecting when the seat or the joiner carries no identity to compare', async () => {
    mockGetGame.mockReturnValue(inProgressGame({ users: { Sam: { socketId: 'old-socket' } } }));
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam', guestTokenHash: 'h2' });
    expect(handleReconnection).toHaveBeenCalled();
  });
});

describe('PlayerJoinHandler — joining while the results screen is up (session still live)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
    mockShouldSendGameState.mockReturnValue(false);
  });

  it('seats the student in the waiting room for the next round: no error, no stale board replayed', async () => {
    mockGetGame.mockReturnValue(inProgressGame({ gameState: 'finished' }));
    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Straggler' });

    expect(emitError).not.toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalled();
    const joined = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === 'joined');
    expect(joined![1]).toMatchObject({ success: true, gameInProgress: false });
    expect(handleLateJoin).not.toHaveBeenCalled();
  });
});

describe('PlayerJoinHandler — late-join recovery flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
  });

  it('marks gameInProgress=true in the joined payload for a late joiner', async () => {
    mockGetGame.mockReturnValue(inProgressGame());
    mockShouldSendGameState.mockReturnValue(true);

    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Latecomer' });

    const joinedCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls
      .find((c) => c[0] === 'joined');
    expect(joinedCall).toBeDefined();
    expect(joinedCall![1]).toMatchObject({ success: true, gameInProgress: true });
  });

  it('marks gameInProgress=false when joining a lobby (not yet started)', async () => {
    mockGetGame.mockReturnValue(inProgressGame({ gameState: 'waiting' }));
    mockShouldSendGameState.mockReturnValue(false);

    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'EarlyBird' });

    const joinedCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls
      .find((c) => c[0] === 'joined');
    expect(joinedCall).toBeDefined();
    expect(joinedCall![1]).toMatchObject({ success: true, gameInProgress: false });
  });
});

/**
 * Reconnect-after-deploy: the linchpin of the "You are not in a game" fix.
 *
 * After a server restart the in-memory socket→username map is WIPED
 * (`getSocketIdByUsername` → undefined), but the game (incl. its `users` map,
 * keyed by username) is restored from Redis. The re-emitted `join` must route
 * to RECONNECTION on the strength of `game.users[username]` ALONE — otherwise
 * the player is treated as a brand-new late-joiner (membership never rebound,
 * results never re-sent, score reset). This locks the seam between persistence
 * (users survive — see backend/redis/__tests__/gameState.roundtrip.test.ts) and
 * the join gate, which unit tests on `handleReconnection` alone cannot prove.
 */
describe('PlayerJoinHandler — reconnect after server restart (deploy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    // Post-restart reality: the socket→username map is empty.
    mockGetSocketIdByUsername.mockReturnValue(undefined);
  });

  it('routes to reconnection (not late-join) when only the restored game.users entry identifies the player', async () => {
    mockGetGame.mockReturnValue(inProgressGame({
      // Survived the Redis round-trip, keyed by username; socketId was stripped.
      users: { Paca: { isHost: false, disconnected: true, authUserId: null, guestTokenHash: null } },
    }));
    mockShouldSendGameState.mockReturnValue(true);

    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Paca' });

    expect(handleReconnection).toHaveBeenCalled();
    expect(handleLateJoin).not.toHaveBeenCalled();
  });

  it('treats a genuinely new username as a late-join, not a reconnection', async () => {
    mockGetGame.mockReturnValue(inProgressGame({
      users: { Paca: { isHost: false, disconnected: true, authUserId: null, guestTokenHash: null } },
    }));
    mockShouldSendGameState.mockReturnValue(true);

    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Stranger' });

    expect(handleReconnection).not.toHaveBeenCalled();
    expect(handleLateJoin).toHaveBeenCalled();
  });
});
