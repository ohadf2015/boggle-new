/**
 * `requestGameState` on a FINISHED game must resend the SAME results payload
 * every other recovery door sends.
 *
 * Recurring pitfall class 3 — two routes to "restore this player's results",
 * one of them quietly thinner. `requestResults` and `playerReconnectHandler`
 * both resend `game.cachedResultsPayload`; this branch sent a hand-built
 * `{ leaderboard, gameMode, reconnect }` with NO `scores`, NO `gameSessionId`
 * and NO `classroomSummary`.
 *
 * What that costs: the client's `validatedScores` handler treats any payload as
 * "results processed" and marks the session displayed, so `ResultsPage` renders
 * its empty "Calculating results" state — and the REAL broadcast that follows
 * is then swallowed by the dedup guard for the rest of the round. A classroom
 * student reaches the results screen with no podium and no lesson recap, while
 * the server log cheerfully reads "Resending results to reconnecting player in
 * finished game".
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

const CACHED = {
  scores: [
    { username: 'Noa', totalScore: 12, words: ['photosynthesis'] },
    { username: 'Ms. Gauntlet', totalScore: 4, words: [] },
  ],
  letterGrid: [['A', 'B'], ['C', 'D']],
  gameMode: 'classic',
  gameSessionId: 7,
  classroomSummary: { lessonWords: ['photosynthesis'], foundWords: ['photosynthesis'] },
  tvMode: false,
};

describe('requestGameState — finished game resends the cached results payload', () => {
  it('emits the full cached payload, not a leaderboard-only stub', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('SSPBSW');
    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'classic',
      cachedResultsPayload: CACHED,
    });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    const validated = mockSafeEmit.mock.calls.filter((c) => c[1] === 'validatedScores');
    expect(validated).toHaveLength(1);
    const payload = validated[0][2] as Record<string, unknown>;
    // The three fields the student's results screen cannot render without.
    expect(payload.scores).toEqual(CACHED.scores);
    expect(payload.classroomSummary).toEqual(CACHED.classroomSummary);
    expect(payload.gameSessionId).toBe(CACHED.gameSessionId);
  });

  it('also emits validationComplete, exactly like the requestResults door', () => {
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('SSPBSW');
    mockGetGame.mockReturnValue({
      gameState: 'finished',
      gameMode: 'classic',
      cachedResultsPayload: CACHED,
    });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    const complete = mockSafeEmit.mock.calls.filter((c) => c[1] === 'validationComplete');
    expect(complete).toHaveLength(1);
    expect((complete[0][2] as Record<string, unknown>).scores).toEqual(CACHED.scores);
  });

  it('stays silent when there is no cached payload rather than sending a stub', () => {
    // A stub payload is worse than none: it poisons the client dedup guard for
    // the session, so the real broadcast that follows is dropped. Silence lets
    // the client's own 15s `requestResults` watchdog do its job.
    const socket = createSocket();
    mockGetGameBySocketId.mockReturnValue('SSPBSW');
    (getLeaderboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { username: 'Noa', score: 12 },
    ]);
    mockGetGame.mockReturnValue({ gameState: 'finished', gameMode: 'classic' });

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestGameState']();

    expect(mockSafeEmit.mock.calls.filter((c) => c[1] === 'validatedScores')).toHaveLength(0);
  });
});
