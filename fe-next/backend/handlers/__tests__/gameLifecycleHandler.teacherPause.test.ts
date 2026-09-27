/**
 * Teacher pause — `requestGameState` must (1) carry `isPaused` + the frozen
 * `remainingTime` so a student who reconnects mid-pause sees the pause, and
 * (2) NOT run orphan-timer recovery: a paused round has no interval by design.
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
vi.mock('../../../backend/utils/gameStateMachine', () => ({
  isInProgress: (s: string) => s === 'in-progress',
}));
vi.mock('../../../backend/modules/playerRename', () => ({ renamePlayerInGame: vi.fn() }));
vi.mock('../../../backend/modules/lobbyAutoStart', () => ({
  shouldTriggerAutoStart: vi.fn(), cancelAutoStartCountdown: vi.fn(), clearAutoStartState: vi.fn(),
}));
vi.mock('../../../backend/utils/gameStartCoordinator', () => ({
  default: { recordAcknowledgment: vi.fn(), recordCountdownComplete: vi.fn() },
}));

import { registerGameLifecycleHandlers } from '../gameLifecycleHandler';

function createSocket() {
  const handlers: Record<string, (...a: any[]) => any> = {};
  const socket = {
    id: 'sock-1',
    data: {},
    emit: vi.fn(),
    on: vi.fn((e: string, h: (...a: any[]) => any) => { handlers[e] = h; }),
  };
  registerGameLifecycleHandlers({} as any, socket as any);
  return { socket, handlers };
}

function startGamePayload() {
  const call = mockSafeEmit.mock.calls.find((c) => c[1] === 'startGame');
  return call?.[2];
}

describe('requestGameState — teacher pause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetGameBySocketId.mockReturnValue('CLS1');
  });

  it('carries isPaused=true + the frozen remainingTime and skips orphan recovery while paused', () => {
    mockHasGameTimer.mockReturnValue(false); // paused → no interval, by design
    mockGetGame.mockReturnValue({
      gameState: 'in-progress', gameMode: 'classic', letterGrid: [['A']], language: 'en',
      timerSeconds: 120, remainingTime: 47, gameSessionId: 3, isPaused: true, pausedRemainingMs: 47_000,
    });
    const { handlers } = createSocket();

    handlers.requestGameState();

    expect(mockStartGameTimer).not.toHaveBeenCalled();
    expect(startGamePayload()).toEqual(expect.objectContaining({
      isPaused: true, remainingTime: 47, timerSeconds: 47, reconnect: true,
    }));
  });

  it('carries isPaused=false for a running round (and still recovers a real orphan)', () => {
    mockHasGameTimer.mockReturnValue(false);
    mockGetGame.mockReturnValue({
      gameState: 'in-progress', gameMode: 'classic', letterGrid: [['A']], language: 'en',
      timerSeconds: 120, remainingTime: 90, gameSessionId: 3, isPaused: false,
    });
    const { handlers } = createSocket();

    handlers.requestGameState();

    expect(mockStartGameTimer).toHaveBeenCalledWith({}, 'CLS1', 90);
    expect(startGamePayload()).toEqual(expect.objectContaining({ isPaused: false, remainingTime: 90 }));
  });
});
