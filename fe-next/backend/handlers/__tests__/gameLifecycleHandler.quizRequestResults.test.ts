/**
 * Regression — a live vocab quiz must survive the board orphan guard.
 *
 * Live evidence, game GHYRVS on 2026-09-05 (server log 16:56:38):
 *
 *   WARN requestResults on orphaned (no start stamp + no timer) in-progress
 *   game GHYRVS — forcing endGame
 *
 * A vocab-quiz room sets NEITHER `gameStartedAt` NOR a board timer: the quiz
 * owns its own clock (`vocabQuizHandler`'s 250ms interval), and the board is a
 * placeholder nothing draws. Every board heuristic therefore reads a perfectly
 * healthy quiz as an orphaned round. A student's 15s results watchdog fired
 * mid-quiz, the guard force-ended the room through the generic board path, and
 * that path took the Redis idempotency key `classroom_game_persisted:GHYRVS`.
 * Thirty seconds later the quiz's own `finishQuiz` was refused as a duplicate.
 *
 * This is Class 3 (asymmetric paths): two routes end the same room, and the
 * board one wins the race while knowing nothing about the quiz.
 *
 * Contract: while a quiz session is live for the room, `requestResults` is
 * handled by the quiz — never by `endGame`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockCheckRateLimit,
  mockGetGameBySocketId,
  mockGetGame,
  mockHasGameTimer,
  mockEndGame,
  mockSafeEmit,
  mockHandleQuizRequestResults,
} = vi.hoisted(() => ({
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
  mockGetGameBySocketId: vi.fn(),
  mockGetGame: vi.fn(),
  mockHasGameTimer: vi.fn(),
  mockEndGame: vi.fn(),
  mockSafeEmit: vi.fn(),
  mockHandleQuizRequestResults: vi.fn(),
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
  getGameRoom: vi.fn().mockReturnValue('room:TEST'),
  broadcastToRoom: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));
vi.mock('../../../backend/utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn(), hasGameTimer: mockHasGameTimer },
  clearGameTimer: vi.fn(),
  hasGameTimer: mockHasGameTimer,
}));
vi.mock('../../../backend/handlers/shared', () => ({
  startGameTimer: vi.fn(),
  endGame: mockEndGame,
}));
vi.mock('../../../backend/handlers/vocabQuizHandler', () => ({
  handleQuizRequestResults: mockHandleQuizRequestResults,
  registerVocabQuizHandlers: vi.fn(),
  startVocabQuizForClassroom: vi.fn(),
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
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('../../../backend/handlers/gameStartHandler', () => ({ registerStartGameHandler: vi.fn() }));
vi.mock('../../../backend/modules/leaderboardManager', () => ({ getLeaderboard: vi.fn().mockReturnValue([]) }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyRoomCreated: vi.fn() }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomAvatar: vi.fn() }));
vi.mock('../../../backend/dictionary', () => ({
  getRandomLongWordsWithTheme: vi.fn(), ensureLanguageLoaded: vi.fn(),
}));
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

function createSocket(id = 'sock-1') {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
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

/** Exactly the room shape a live quiz leaves behind: no stamp, no board timer. */
const quizShapedRoom = {
  gameState: 'in-progress',
  gameMode: 'classic',
  timerSeconds: 180,
  gameStartedAt: undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue(true);
  mockGetGameBySocketId.mockReturnValue('GHYRVS');
  mockHasGameTimer.mockReturnValue(false);
});

describe('requestResults on a room running a live vocab quiz', () => {
  it('does NOT force endGame — the quiz owns its own end', () => {
    mockHandleQuizRequestResults.mockReturnValue(true);
    mockGetGame.mockReturnValue(quizShapedRoom);
    const socket = createSocket();

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('hands the request to the quiz so the client is answered, not ignored', () => {
    mockHandleQuizRequestResults.mockReturnValue(true);
    mockGetGame.mockReturnValue(quizShapedRoom);
    const socket = createSocket();

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockHandleQuizRequestResults).toHaveBeenCalledWith(fakeIo, socket, 'GHYRVS');
  });

  it('still force-finalizes a genuinely orphaned BOARD game (no quiz for the room)', () => {
    mockHandleQuizRequestResults.mockReturnValue(false);
    mockGetGame.mockReturnValue({ ...quizShapedRoom, gameMode: 'word-hunt' });
    const socket = createSocket();

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).toHaveBeenCalledWith(fakeIo, 'GHYRVS');
  });

  it('does not consult the quiz at all for a healthy live board game', () => {
    mockHandleQuizRequestResults.mockReturnValue(false);
    mockGetGame.mockReturnValue({
      gameState: 'in-progress',
      gameMode: 'blast',
      timerSeconds: 180,
      gameStartedAt: Date.now() - 5_000,
    });
    mockHasGameTimer.mockReturnValue(true);
    const socket = createSocket();

    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['requestResults']();

    expect(mockEndGame).not.toHaveBeenCalled();
    expect(mockHandleQuizRequestResults).not.toHaveBeenCalled();
  });
});
