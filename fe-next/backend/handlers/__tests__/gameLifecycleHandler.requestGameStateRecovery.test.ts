/**
 * Regression — MP timer "stuck at 2 min" recovery.
 *
 * Symptom: client sits on initial timerSeconds because server's
 * `startGameTimer` was never invoked (coordinator cancellation race, or any
 * crash between state transition → 'in-progress' and the timer setInterval
 * call). Client watchdog emits `requestGameState`, server re-emits `startGame`
 * with the stale `game.remainingTime`, and the recovery loops forever.
 *
 * Fix: server's `requestGameState` handler detects the orphan (state says
 * in-progress but `hasGameTimer` returns false) and restarts the interval.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockCheckRateLimit,
  mockGetGameBySocketId,
  mockGetGame,
  mockHasGameTimer,
  mockClearGameTimer,
  mockStartGameTimer,
  mockSafeEmit,
  mockGetGameRoom,
  mockSentryCapture,
  mockSentryBreadcrumb,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockGetGameBySocketId: vi.fn(),
  mockGetGame: vi.fn(),
  mockHasGameTimer: vi.fn(),
  mockClearGameTimer: vi.fn(),
  mockStartGameTimer: vi.fn(),
  mockSafeEmit: vi.fn(),
  mockGetGameRoom: vi.fn().mockReturnValue('room:TEST'),
  mockSentryCapture: vi.fn(),
  mockSentryBreadcrumb: vi.fn(),
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
  createGame: vi.fn(),
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  gameExists: vi.fn(),
  addUserToGame: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  getSocketIdByUsername: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  resetGameForNewRound: vi.fn(),
  getAuthUserConnection: vi.fn(),
  transitionGameState: vi.fn().mockReturnValue({ success: true }),
  canTransitionGameState: vi.fn().mockReturnValue(true),
  isRoomEmpty: vi.fn(),
  markPlayerReadyForNextGame: vi.fn(),
  getPlayersReadyCount: vi.fn(),
  removeUserFromGame: vi.fn(),
  updateUsernameMapping: vi.fn(),
  unmarkPlayerReady: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
}));
vi.mock('../../../backend/utils/socketHelpers', () => ({
  safeEmit: mockSafeEmit,
  getGameRoom: mockGetGameRoom,
  broadcastToRoom: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));
vi.mock('../../../backend/utils/timerManager', () => ({
  default: { clearGameTimer: mockClearGameTimer, hasGameTimer: mockHasGameTimer },
  clearGameTimer: mockClearGameTimer,
  hasGameTimer: mockHasGameTimer,
}));
vi.mock('../../../backend/handlers/shared', () => ({
  startGameTimer: mockStartGameTimer,
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
  captureMessage: mockSentryCapture,
  addBreadcrumb: mockSentryBreadcrumb,
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
import { getLeaderboard } from '../../../backend/modules/gameStateManager';

interface SocketHandlerMap { [event: string]: (...args: unknown[]) => void }

function createSocket(id = 'sock-1') {
  const handlers: SocketHandlerMap = {};
  return {
    id,
    handlers,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
    }),
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
});

describe('requestGameState — orphan timer recovery', () => {
  it('restarts startGameTimer when game is in-progress but no interval registered', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      remainingTime: 120,
      timerSeconds: 120,
      letterGrid: [[]],
      language: 'en',
      minWordLength: 2,
      gameMode: 'classic',
      gameSessionId: 1,
    });
    mockHasGameTimer.mockReturnValue(false);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockStartGameTimer).toHaveBeenCalledTimes(1);
    expect(mockStartGameTimer).toHaveBeenCalledWith(fakeIo, 'ABC', 120);
    expect(mockSentryBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'mp_server_timer_orphan_recovered', level: 'info' })
    );
  });

  it('does NOT restart timer when interval already registered (healthy path)', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      remainingTime: 47,
      timerSeconds: 120,
      letterGrid: [[]],
      language: 'en',
      minWordLength: 2,
      gameMode: 'classic',
      gameSessionId: 2,
    });
    mockHasGameTimer.mockReturnValue(true);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockStartGameTimer).not.toHaveBeenCalled();
    expect(mockSentryCapture).not.toHaveBeenCalled();
    expect(mockSafeEmit).toHaveBeenCalledWith(
      socket,
      'startGame',
      expect.objectContaining({ timerSeconds: 47, reconnect: true })
    );
  });

  it('falls back to timerSeconds when remainingTime is missing', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      timerSeconds: 180,
      letterGrid: [[]],
      language: 'en',
      gameMode: 'classic',
      gameSessionId: 1,
    });
    mockHasGameTimer.mockReturnValue(false);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockStartGameTimer).toHaveBeenCalledWith(fakeIo, 'ABC', 180);
  });

  it('does NOT restart timer when game is finished', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({ gameState: 'finished', gameMode: 'classic' });
    mockHasGameTimer.mockReturnValue(false);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockStartGameTimer).not.toHaveBeenCalled();
  });

  it('does nothing when game does not exist', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue(undefined);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockStartGameTimer).not.toHaveBeenCalled();
    expect(mockSafeEmit).not.toHaveBeenCalled();
  });
});

/**
 * Regression — reconnect score "0 PUNTOS".
 *
 * The watchdog recovery path (`requestGameState`) restored the board + timer
 * via `startGame` but — unlike the primary `join` reconnect
 * (playerReconnectHandler emits updateLeaderboard) — never re-sent the score.
 * The live score lives ONLY in the client `leaderboard[]`, fed by
 * `updateLeaderboard`; without that emit the player's score sat at 0 after a
 * deploy/reconnect until the next word submission. Fix: the in-progress
 * recovery branch must also emit the authoritative leaderboard.
 */
describe('requestGameState — score restore on reconnect', () => {
  it('emits updateLeaderboard with current scores when the game is in-progress', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      remainingTime: 64,
      timerSeconds: 120,
      letterGrid: [[]],
      language: 'es',
      minWordLength: 2,
      gameMode: 'classic',
      gameSessionId: 1,
    });
    mockHasGameTimer.mockReturnValue(true);
    vi.mocked(getLeaderboard).mockReturnValue([{ username: 'alice', score: 20 }] as never);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockSafeEmit).toHaveBeenCalledWith(socket, 'updateLeaderboard', {
      leaderboard: [{ username: 'alice', score: 20 }],
    });
  });

  it('also carries the leaderboard INSIDE the startGame recovery payload (atomic restore)', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      remainingTime: 64,
      timerSeconds: 120,
      letterGrid: [[]],
      language: 'es',
      minWordLength: 2,
      gameMode: 'classic',
      gameSessionId: 1,
    });
    mockHasGameTimer.mockReturnValue(true);
    vi.mocked(getLeaderboard).mockReturnValue([{ username: 'alice', score: 20 }] as never);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockSafeEmit).toHaveBeenCalledWith(
      socket,
      'startGame',
      expect.objectContaining({ leaderboard: [{ username: 'alice', score: 20 }] }),
    );
  });

  it('does NOT emit updateLeaderboard for a finished game (results path owns the leaderboard)', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('ABC');
    mockGetGame.mockReturnValue({ gameState: 'finished', gameMode: 'classic' });
    vi.mocked(getLeaderboard).mockReturnValue([{ username: 'alice', score: 20 }] as never);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    const updateLeaderboardCalls = mockSafeEmit.mock.calls.filter(
      (c) => c[1] === 'updateLeaderboard',
    );
    expect(updateLeaderboardCalls).toHaveLength(0);
  });
});
