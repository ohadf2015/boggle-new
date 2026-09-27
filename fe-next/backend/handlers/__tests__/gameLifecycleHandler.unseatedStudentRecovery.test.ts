/**
 * Regression — `requestGameState` from a socket the server never seated.
 *
 * `requestGameState` is the recovery door a stuck client knocks on. Its two
 * opening guards — no socket→game mapping, and a mapping to a game that is
 * gone — both `return` without emitting anything. To the client that is
 * indistinguishable from "nothing to do": the watchdog fires, the server says
 * nothing, and a student sits on a spinner for the rest of the lesson
 * (recurring pitfall class 4).
 *
 * Its sibling in the SAME file, `resetGame`, answers both conditions with
 * `emitError(PLAYER_NOT_IN_GAME)` / `emitError(GAME_NOT_FOUND)`. Two routes
 * through the same two guards, one of them silent — class 3 on top of class 4.
 * This pins the recovery door to the sibling's behaviour.
 *
 * Named `...StudentRecovery` deliberately: the gate filters vitest by path
 * substring (`education classroom teacher student lesson …`), so a test file
 * without one of those words in its path never runs in the gate and is a
 * vacuous green.
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
  mockEmitError,
  mockLoggerWarn,
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
  mockEmitError: vi.fn(),
  mockLoggerWarn: vi.fn(),
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
  default: { info: vi.fn(), error: vi.fn(), warn: mockLoggerWarn, debug: vi.fn(), log: vi.fn() },
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
  return { ...actual, emitError: mockEmitError };
});

import { registerGameLifecycleHandlers } from '../gameLifecycleHandler';

interface SocketHandlerMap { [event: string]: (...args: unknown[]) => void }

function createSocket(id = 'sock-unseated') {
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
  mockHasGameTimer.mockReturnValue(true);
});

describe('requestGameState — a socket the server never seated', () => {
  it('GIVEN no socket→game mapping WHEN the student watchdog asks THEN it answers PLAYER_NOT_IN_GAME instead of going quiet', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue(undefined);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_IN_GAME');
  });

  it('GIVEN no socket→game mapping THEN the server leaves a warning, not silence', () => {
    const socket = createSocket('sock-ghost');
    mockGetGameBySocketId.mockReturnValue(undefined);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'SOCKET',
      expect.stringContaining('sock-ghost')
    );
  });

  it('GIVEN a mapping to a game that is gone WHEN asked THEN it answers GAME_NOT_FOUND', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('GONE42');
    mockGetGame.mockReturnValue(undefined);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(mockLoggerWarn).toHaveBeenCalledWith('SOCKET', expect.stringContaining('GONE42'));
  });

  it('GIVEN a healthy in-progress round THEN it still restores the board and raises NO error', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('LIVE01');
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      remainingTime: 60,
      timerSeconds: 120,
      letterGrid: [[]],
      language: 'en',
      minWordLength: 2,
      gameMode: 'classic',
      gameSessionId: 7,
      users: {},
    });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockSafeEmit).toHaveBeenCalledWith(socket, 'startGame', expect.any(Object));
    expect(mockEmitError).not.toHaveBeenCalled();
  });

  it('GIVEN the rate limiter refuses the burst THEN it stays silent (the limiter already answered)', () => {
    const socket = createSocket();
    mockCheckRateLimit.mockReturnValue(false);
    mockGetGameBySocketId.mockReturnValue(undefined);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockEmitError).not.toHaveBeenCalled();
  });
});
