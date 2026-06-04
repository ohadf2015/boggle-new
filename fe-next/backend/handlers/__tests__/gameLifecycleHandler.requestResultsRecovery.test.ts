/**
 * Regression — stuck "Calculating results" screen recovery via requestResults.
 *
 * Symptom: a player's client never received `validatedScores` (the game's
 * end-trigger was lost — dropped in-memory timer, transition race). After 15s
 * the client emits `requestResults`, but the handler used to SILENTLY return
 * whenever `gameState !== 'finished'`, sending nothing back. The client then
 * fell to its empty-results fallback and was stuck forever.
 *
 * Fix contract: when `requestResults` arrives for an in-progress game whose
 * server clock has already run out, force-finalize via `endGame` (idempotent)
 * so results are produced + broadcast. A game whose clock has NOT expired is a
 * genuinely live game and must NOT be ended early.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockCheckRateLimit,
  mockGetGameBySocketId,
  mockGetGame,
  mockHasGameTimer,
  mockClearGameTimer,
  mockStartGameTimer,
  mockEndGame,
  mockSafeEmit,
  mockGetGameRoom,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockGetGameBySocketId: vi.fn(),
  mockGetGame: vi.fn(),
  mockHasGameTimer: vi.fn(),
  mockClearGameTimer: vi.fn(),
  mockStartGameTimer: vi.fn(),
  mockEndGame: vi.fn(),
  mockSafeEmit: vi.fn(),
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
  endGame: mockEndGame,
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

function createSocket(id = 'sock-1') {
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
});

describe('requestResults — overdue game recovery', () => {
  it('re-sends cached results for a finished game (and does not force endGame)', () => {
    const socket = createSocket();
    const cached = { scores: [{ username: 'a', totalScore: 5 }], gameMode: 'blast' };
    mockGetGame.mockReturnValue({ gameState: 'finished', gameMode: 'blast', cachedResultsPayload: cached });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockSafeEmit).toHaveBeenCalledWith(socket, 'validatedScores', cached);
    expect(mockSafeEmit).toHaveBeenCalledWith(socket, 'validationComplete', cached);
    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('force-finalizes an in-progress game whose clock has already run out', () => {
    const socket = createSocket();
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'blast',
      timerSeconds: 180,
      gameStartedAt: Date.now() - 200_000, // started 200s ago, 180s game → overdue
    });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).toHaveBeenCalledWith(fakeIo, 'ABC');
  });

  it('does NOT end a genuinely live in-progress game (clock not expired)', () => {
    const socket = createSocket();
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'blast',
      timerSeconds: 180,
      gameStartedAt: Date.now() - 5_000, // only 5s in
    });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('does NOT end a WAITING (between-rounds lobby) game with a stale start time', () => {
    // Between rounds the game sits in 'waiting' but keeps gameStartedAt from the
    // PRIOR round (long past its duration). A reconnect in the lobby legitimately
    // emits requestResults — this must never force-end the lobby game.
    const socket = createSocket();
    mockGetGame.mockReturnValue({
      gameState: 'waiting',
      gameMode: 'blast',
      timerSeconds: 180,
      gameStartedAt: Date.now() - 600_000, // stale from previous round
    });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('does nothing when the game does not exist', () => {
    const socket = createSocket();
    mockGetGame.mockReturnValue(undefined);

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).not.toHaveBeenCalled();
    expect(mockSafeEmit).not.toHaveBeenCalled();
  });
});
