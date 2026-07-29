/**
 * lobbyReady → server-owned lobby auto-start wiring.
 *
 * The initial *waiting* lobby previously sent NO host signal when every guest
 * readied (only the silent `playersReadyUpdate` count), so a stalled host could
 * strand a fully-ready lobby. These tests lock in the fix: all-ready now both
 * nudges the host (`allPlayersReady`) and starts a synced countdown that fires
 * the host's start; any un-ready cancels it.
 *
 * The real `lobbyAutoStart` module runs here (not mocked) so the countdown
 * behaviour is exercised end-to-end under fake timers.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clearAutoStartState } from '../../modules/lobbyAutoStart';

const {
  mockCheckRateLimit,
  mockGetGameBySocketId,
  mockGetUsernameBySocketId,
  mockGetGame,
  mockMarkReady,
  mockUnmarkReady,
  mockGetPlayersReadyCount,
  mockBroadcastToRoom,
  mockGetGameRoom,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockGetGameBySocketId: vi.fn(),
  mockGetUsernameBySocketId: vi.fn(),
  mockGetGame: vi.fn(),
  mockMarkReady: vi.fn(),
  mockUnmarkReady: vi.fn(),
  mockGetPlayersReadyCount: vi.fn(),
  mockBroadcastToRoom: vi.fn(),
  mockGetGameRoom: vi.fn().mockReturnValue('room:ABC'),
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
  getGameUsers: vi.fn().mockReturnValue([]),
  updateUsernameMapping: vi.fn(),
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
  markPlayerReadyForNextGame: mockMarkReady,
  getPlayersReadyCount: mockGetPlayersReadyCount,
  unmarkPlayerReady: mockUnmarkReady,
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
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn(), endGame: vi.fn() }));
vi.mock('../../../backend/redisClient', () => ({ saveGameState: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../backend/utils/metrics', () => ({ inc: vi.fn(), incPerGame: vi.fn(), ensureGame: vi.fn() }));
vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('../../../backend/handlers/gameStartHandler', () => ({ registerStartGameHandler: vi.fn() }));
vi.mock('../../../backend/modules/leaderboardManager', () => ({ getLeaderboard: vi.fn().mockReturnValue([]) }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyRoomCreated: vi.fn() }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomAvatar: vi.fn() }));
vi.mock('../../../backend/dictionary', () => ({ getRandomLongWordsWithTheme: vi.fn(), ensureLanguageLoaded: vi.fn() }));
vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: vi.fn(), createGameSchema: {}, getWordsForBoardSchema: {},
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
    id, handlers,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => { handlers[event] = cb; }),
    emit: vi.fn(), join: vi.fn(), leave: vi.fn(), to: vi.fn().mockReturnThis(), data: {},
  };
}

function makeIo() {
  const emit = vi.fn();
  return { io: { to: vi.fn(() => ({ emit })), emit: vi.fn() } as never, hostEmit: emit };
}

const broadcastEvents = () => mockBroadcastToRoom.mock.calls.map((c) => c[2] as string);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockCheckRateLimit.mockReturnValue(true);
  mockGetGameBySocketId.mockReturnValue('ABC');
  mockGetUsernameBySocketId.mockReturnValue('Guest');
  mockGetGame.mockReturnValue({ gameState: 'waiting', hostSocketId: 'sock-host', users: {} });
});

afterEach(() => {
  clearAutoStartState('ABC');
  vi.useRealTimers();
});

describe('lobbyReady → lobby auto-start', () => {
  it('nudges the host and begins a synced countdown when everyone is ready', () => {
    mockGetPlayersReadyCount.mockReturnValue({ readyCount: 2, totalPlayers: 2, readyUsernames: ['A', 'B'] });
    const { io } = makeIo();
    const socket = createSocket();
    registerGameLifecycleHandlers(io, socket as never);

    socket.handlers['lobbyReady']({ ready: true });

    const events = broadcastEvents();
    expect(events).toContain('allPlayersReady');
    expect(events).toContain('lobbyAutoStartTick'); // immediate first tick
  });

  it('does NOT start a countdown while some players are still not ready', () => {
    mockGetPlayersReadyCount.mockReturnValue({ readyCount: 1, totalPlayers: 2, readyUsernames: ['A'] });
    const { io } = makeIo();
    const socket = createSocket();
    registerGameLifecycleHandlers(io, socket as never);

    socket.handlers['lobbyReady']({ ready: true });

    const events = broadcastEvents();
    expect(events).toContain('playersReadyUpdate');
    expect(events).not.toContain('allPlayersReady');
    expect(events).not.toContain('lobbyAutoStartTick');
  });

  it('fires the host start after the countdown elapses', () => {
    mockGetPlayersReadyCount.mockReturnValue({ readyCount: 1, totalPlayers: 1, readyUsernames: ['A'] });
    const { io, hostEmit } = makeIo();
    const socket = createSocket();
    registerGameLifecycleHandlers(io, socket as never);

    socket.handlers['lobbyReady']({ ready: true });
    vi.advanceTimersByTime(6000); // past AUTO_START_SECONDS

    expect(hostEmit).toHaveBeenCalledWith('lobbyAutoStartFire', {});
  });

  it('cancels the countdown when a player un-readies', () => {
    mockGetPlayersReadyCount.mockReturnValue({ readyCount: 2, totalPlayers: 2, readyUsernames: ['A', 'B'] });
    const { io, hostEmit } = makeIo();
    const socket = createSocket();
    registerGameLifecycleHandlers(io, socket as never);

    socket.handlers['lobbyReady']({ ready: true });
    // Now someone toggles off
    mockGetPlayersReadyCount.mockReturnValue({ readyCount: 1, totalPlayers: 2, readyUsernames: ['A'] });
    socket.handlers['lobbyReady']({ ready: false });

    expect(broadcastEvents()).toContain('lobbyAutoStartCancelled');
    vi.advanceTimersByTime(6000);
    expect(hostEmit).not.toHaveBeenCalledWith('lobbyAutoStartFire', {});
  });

  it('host can cancel via lobbyAutoStartCancel', () => {
    mockGetPlayersReadyCount.mockReturnValue({ readyCount: 1, totalPlayers: 1, readyUsernames: ['A'] });
    const { io, hostEmit } = makeIo();
    const socket = createSocket();
    registerGameLifecycleHandlers(io, socket as never);

    socket.handlers['lobbyReady']({ ready: true });
    socket.handlers['lobbyAutoStartCancel']();

    expect(broadcastEvents()).toContain('lobbyAutoStartCancelled');
    vi.advanceTimersByTime(6000);
    expect(hostEmit).not.toHaveBeenCalledWith('lobbyAutoStartFire', {});
  });
});
