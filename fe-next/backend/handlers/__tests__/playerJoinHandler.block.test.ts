/**
 * Player Join Handler — global moderation blocklist enforcement.
 *
 * An admin-issued block (auth user id / guest session id / IP) must refuse a
 * join: the handler emits the typed PLAYER_BLOCKED error and never adds the
 * user to the game. A non-blocked join proceeds past the block gate.
 */

import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';
import { ErrorCodes } from '../../utils/errorHandler';

const { mockValidatePayload, mockIsBlocked, mockGetGame, mockAddUserToGame } = vi.hoisted(() => ({
  mockValidatePayload: vi.fn(),
  mockIsBlocked: vi.fn(),
  mockGetGame: vi.fn(),
  mockAddUserToGame: vi.fn(),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getAuthUserConnection: vi.fn(),
  getSocketIdByUsername: vi.fn().mockReturnValue(undefined),
  addUserToGame: mockAddUserToGame,
  updateUserSocketId: vi.fn(),
  removeUserFromGame: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  isRoomEmpty: vi.fn(),
  restoreGameFromRedis: vi.fn(),
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

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  getIpFromSocket: vi.fn().mockReturnValue('203.0.113.7'),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));

vi.mock('../../modules/blockListManager', () => ({ isBlocked: mockIsBlocked }));

vi.mock('../../modules/lobbyAutoStart', () => ({ cancelAutoStartCountdown: vi.fn() }));
vi.mock('../../utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn(), clearTimer: vi.fn() }, clearGameTimer: vi.fn(),
}));
vi.mock('../../utils/gameStartCoordinator', () => ({ default: { cancel: vi.fn(), handlePlayerDisconnect: vi.fn() } }));
vi.mock('../../services/gameLifecycle/gameTimer.js', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));
vi.mock('../../utils/gameUtils', () => ({
  generateRandomAvatar: vi.fn().mockReturnValue({ color: 'blue', icon: 'cat' }),
}));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: mockValidatePayload,
  joinGameSchema: {},
}));
vi.mock('../../utils/consts', () => ({ MAX_PLAYERS_PER_ROOM: 8 }));
vi.mock('../../utils/gameStateMachine', () => ({
  isInProgress: vi.fn().mockReturnValue(false),
  canJoinFreely: vi.fn().mockReturnValue(true),
  shouldSendGameState: vi.fn().mockReturnValue(false),
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
vi.mock('../playerDataInit', () => ({ ensurePlayerState: vi.fn().mockResolvedValue(undefined) }));

import { registerPlayerJoinHandlers } from '../playerJoinHandler';

function captureJoinHandler() {
  const listeners: Record<string, (...args: unknown[]) => unknown> = {};
  const socket = {
    id: 'blk-socket-1',
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    handshake: { address: '203.0.113.7', headers: {} },
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { listeners[event] = cb; }),
  } as unknown as Socket;
  const io = { emit: vi.fn(), to: vi.fn().mockReturnThis() } as unknown as Server;
  registerPlayerJoinHandlers(io, socket);
  return { socket, join: listeners['join'] };
}

describe('PlayerJoinHandler — moderation blocklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGame.mockReturnValue({
      gameCode: 'ABC123',
      roomName: 'Room',
      language: 'en',
      gameState: 'waiting',
      users: {},
    });
    mockValidatePayload.mockImplementation((_schema: unknown, data: unknown) => ({ success: true, data }));
  });

  it('refuses a blocked join with PLAYER_BLOCKED and does not add the user', async () => {
    mockIsBlocked.mockResolvedValue({ blockType: 'ip', value: '203.0.113.7', reason: 'abuse' });

    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Eve' });

    const errorCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === 'error');
    expect(errorCall).toBeDefined();
    expect(errorCall![1]).toMatchObject({ code: ErrorCodes.PLAYER_BLOCKED, message: 'abuse' });
    expect(mockAddUserToGame).not.toHaveBeenCalled();
  });

  it('lets a non-blocked join proceed past the block gate', async () => {
    mockIsBlocked.mockResolvedValue(null);

    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Alice' });

    const errorCall = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'error' && c[1]?.code === ErrorCodes.PLAYER_BLOCKED,
    );
    expect(errorCall).toBeUndefined();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });
});
