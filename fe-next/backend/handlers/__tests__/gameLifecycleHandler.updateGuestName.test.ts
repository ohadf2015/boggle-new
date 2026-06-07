/**
 * updateGuestName — lobby rename propagation, for guests AND the host.
 *
 * Bug: the handler rejected hosts (`if (user.isHost) return`), so a host's name
 * change never broadcast `playerListUpdate` and never echoed `guestNameUpdated`.
 * The host's localStorage name only applied on the next reconnect → "name not
 * changed on the spot, takes multiple tries". Fix: hosts may rename; the re-key
 * (incl. game.hostUsername) goes through `renamePlayerInGame`, then the new
 * roster is broadcast to the room and confirmed to the renamer.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockCheckRateLimit,
  mockGetGameBySocketId,
  mockGetUsernameBySocketId,
  mockGetGame,
  mockGetGameUsers,
  mockUpdateUsernameMapping,
  mockBroadcastToRoom,
  mockGetGameRoom,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockGetGameBySocketId: vi.fn(),
  mockGetUsernameBySocketId: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetGameUsers: vi.fn().mockReturnValue([]),
  mockUpdateUsernameMapping: vi.fn(),
  mockBroadcastToRoom: vi.fn(),
  mockGetGameRoom: vi.fn().mockReturnValue('room:TEST'),
}));

vi.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: mockCheckRateLimit,
  default: { checkRateLimit: mockCheckRateLimit },
}));
vi.mock('../../../backend/middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameBySocketId: mockGetGameBySocketId,
  getUsernameBySocketId: mockGetUsernameBySocketId,
  getGameUsers: mockGetGameUsers,
  updateUsernameMapping: mockUpdateUsernameMapping,
  createGame: vi.fn(),
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  gameExists: vi.fn(),
  addUserToGame: vi.fn(),
  getSocketIdByUsername: vi.fn(),
  getActiveRooms: vi.fn().mockReturnValue([]),
  resetGameForNewRound: vi.fn(),
  getAuthUserConnection: vi.fn(),
  transitionGameState: vi.fn().mockReturnValue({ success: true }),
  canTransitionGameState: vi.fn().mockReturnValue(true),
  isRoomEmpty: vi.fn(),
  markPlayerReadyForNextGame: vi.fn(),
  getPlayersReadyCount: vi.fn(),
  unmarkPlayerReady: vi.fn(),
  removeUserFromGame: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
}));
vi.mock('../../../backend/utils/socketHelpers', () => ({
  safeEmit: vi.fn(),
  getGameRoom: mockGetGameRoom,
  broadcastToRoom: mockBroadcastToRoom,
  broadcastActiveRooms: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));
vi.mock('../../../backend/utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn(), hasGameTimer: vi.fn() },
  clearGameTimer: vi.fn(),
  hasGameTimer: vi.fn(),
}));
vi.mock('../../../backend/handlers/shared', () => ({
  startGameTimer: vi.fn(),
  endGame: vi.fn(),
}));
vi.mock('../../../backend/redisClient', () => ({
  saveGameState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../backend/utils/metrics', () => ({
  inc: vi.fn(), incPerGame: vi.fn(), ensureGame: vi.fn(),
}));
vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock('../../../backend/handlers/gameStartHandler', () => ({
  registerStartGameHandler: vi.fn(),
}));
vi.mock('../../../backend/modules/leaderboardManager', () => ({
  getLeaderboard: vi.fn().mockReturnValue([]),
}));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyRoomCreated: vi.fn() }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomAvatar: vi.fn() }));
vi.mock('../../../backend/dictionary', () => ({
  getRandomLongWordsWithTheme: vi.fn(), ensureLanguageLoaded: vi.fn(),
}));
vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: vi.fn(),
  createGameSchema: {},
  getWordsForBoardSchema: {},
}));
vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>(
    '../../../backend/utils/errorHandler'
  );
  return { ...actual, emitError: vi.fn() };
});

import { registerGameLifecycleHandlers } from '../gameLifecycleHandler';

interface SocketHandlerMap { [event: string]: (...args: unknown[]) => void }

function createSocket(id = 'sock-host') {
  const handlers: SocketHandlerMap = {};
  return {
    id,
    handlers,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => { handlers[event] = cb; }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnThis(),
    data: {},
  };
}

const fakeIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as never;

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue(true);
  mockGetGameBySocketId.mockReturnValue('ABC');
  mockGetGameUsers.mockReturnValue([{ username: 'NewName' }]);
});

describe('updateGuestName — host can rename in the lobby', () => {
  it('re-keys the host, updates hostUsername, and broadcasts the new roster', () => {
    const socket = createSocket();
    mockGetUsernameBySocketId.mockReturnValue('OldHost');
    const game = {
      gameState: 'waiting',
      hostUsername: 'OldHost',
      users: { OldHost: { username: 'OldHost', isHost: true } },
      playersReadyForNextGame: {},
    };
    mockGetGame.mockReturnValue(game);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['updateGuestName']({ newName: 'NewHost' });

    // Re-keyed in place, host identity moved
    expect(game.users.OldHost).toBeUndefined();
    expect((game.users as Record<string, unknown>).NewHost).toBeDefined();
    expect(game.hostUsername).toBe('NewHost');

    // Renamer gets confirmation
    expect(socket.emit).toHaveBeenCalledWith('guestNameUpdated', {
      oldName: 'OldHost',
      newName: 'NewHost',
    });

    // Whole room gets the fresh roster (this never fired before the fix)
    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      fakeIo,
      'room:TEST',
      'playerListUpdate',
      expect.objectContaining({ users: expect.any(Array) }),
    );

    // Socket↔username mapping migrated
    expect(mockUpdateUsernameMapping).toHaveBeenCalledWith('ABC', 'OldHost', 'NewHost', 'sock-host');
  });
});

describe('updateGuestName — guest rename still works (regression)', () => {
  it('re-keys a guest without touching hostUsername', () => {
    const socket = createSocket('sock-guest');
    mockGetUsernameBySocketId.mockReturnValue('Alice');
    const game = {
      gameState: 'waiting',
      hostUsername: 'TheHost',
      users: {
        TheHost: { username: 'TheHost', isHost: true },
        Alice: { username: 'Alice', isHost: false },
      },
      playersReadyForNextGame: {},
    };
    mockGetGame.mockReturnValue(game);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['updateGuestName']({ newName: 'Alicia' });

    expect(game.users.Alice).toBeUndefined();
    expect((game.users as Record<string, unknown>).Alicia).toBeDefined();
    expect(game.hostUsername).toBe('TheHost');
    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      fakeIo,
      'room:TEST',
      'playerListUpdate',
      expect.objectContaining({ users: expect.any(Array) }),
    );
  });
});

describe('updateGuestName — rejects outside the lobby', () => {
  it('does nothing once the game is in progress', () => {
    const socket = createSocket();
    mockGetUsernameBySocketId.mockReturnValue('OldHost');
    const game = {
      gameState: 'in-progress',
      hostUsername: 'OldHost',
      users: { OldHost: { username: 'OldHost', isHost: true } },
      playersReadyForNextGame: {},
    };
    mockGetGame.mockReturnValue(game);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['updateGuestName']({ newName: 'NewHost' });

    expect(game.hostUsername).toBe('OldHost');
    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });
});
