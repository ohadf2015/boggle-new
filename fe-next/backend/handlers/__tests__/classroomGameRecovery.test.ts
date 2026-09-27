/**
 * The recovery door must hand a classroom student the same context the front
 * door does — and it must do it without living inside the lifecycle handler.
 *
 * `join` (`playerJoinHandler`) calls `emitClassroomContext`: differentiation
 * level and the lesson word bank, per socket, because a room broadcast would
 * flatten the level. `requestGameState` — the recovery path a client fires when
 * `startGame` never arrived — re-sent the board, the clock, the pause flag and
 * the leaderboard, and nothing about the classroom. Two routes to "restore this
 * student's game", one of them quietly thinner: recurring pitfall class 3, the
 * same shape as the reconnect bug that froze scores at zero.
 *
 * The student it costs is the one the word bank exists for: a support student
 * recovered through this path saw an empty bank and was silently treated as
 * `core`.
 *
 * The classroom half is registered as its OWN listener on the same event, from
 * `classroomGameHandler`, so the 850-line lifecycle handler does not grow and
 * the classroom concern stays in classroom files. Socket.IO runs every listener
 * for an event, so the two coexist — and the first test below asserts exactly
 * that, on a fake that keeps ALL listeners per event rather than the last one.
 */

/**
 * The recovery door must hand a classroom student the same context the front
 * door does.
 *
 * `join` calls `emitClassroomContext` — differentiation level and the lesson
 * word bank, per socket, because a room broadcast would flatten the level.
 * `requestGameState`, the recovery path a client fires when `startGame` never
 * arrived, re-sent the board, the clock, the pause flag and the leaderboard —
 * and nothing about the classroom. Two routes to "restore this student's game",
 * one of them quietly thinner: recurring pitfall class 3, the same shape as the
 * reconnect bug that froze scores at zero.
 *
 * The student it costs is the one the word bank exists for: a support student
 * recovered through this path sees an empty bank and is silently treated as
 * `core`. Both paths now call the same module.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockEmitClassroomContext,
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
  mockEmitClassroomContext: vi.fn(),
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

vi.mock('../../modules/classroomGameContext', () => ({
  emitClassroomContext: mockEmitClassroomContext,
}));

import { registerGameLifecycleHandlers } from '../gameLifecycleHandler';
import { registerClassroomRecoveryHandlers } from '../classroomGameRecovery';

type Listener = (...args: unknown[]) => void;

/**
 * Multi-listener fake. A single-slot `handlers[event] = cb` fake would let the
 * second registration silently overwrite the first, and a coexistence test
 * written on it would pass while proving nothing.
 */
function createSocket(id = 'sock-1', data: Record<string, unknown> = {}) {
  const listeners: Record<string, Listener[]> = {};
  return {
    id,
    listeners,
    on: vi.fn((event: string, cb: Listener) => {
      (listeners[event] ||= []).push(cb);
    }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnThis(),
    data,
  };
}

function fire(socket: ReturnType<typeof createSocket>, event: string) {
  for (const listener of socket.listeners[event] ?? []) listener();
}

const fakeIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as never;

const inProgressGame = {
  gameState: 'in-progress',
  remainingTime: 90,
  timerSeconds: 120,
  letterGrid: [['A']],
  language: 'en',
  minWordLength: 2,
  gameMode: 'classic',
  gameSessionId: 1,
};

let socketSeq = 0;
function recoveringStudent(data: Record<string, unknown> = { verifiedUserId: 'u-maya' }) {
  // A fresh socket id every time: the throttle below is per socket.
  const socket = createSocket(`sock-${++socketSeq}`, data);
  registerGameLifecycleHandlers(fakeIo, socket as never);
  registerClassroomRecoveryHandlers(socket as never);
  return socket;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockReturnValue(true);
  mockHasGameTimer.mockReturnValue(true);
  mockGetGameBySocketId.mockReturnValue('ABC123');
  mockGetGame.mockReturnValue(inProgressGame);
});

describe('requestGameState — classroom context', () => {
  it('restores the board AND the classroom context from one request', async () => {
    // GIVEN a student whose `startGame` never arrived, in a room they are in
    const socket = recoveringStudent();

    // WHEN their client falls back to the recovery request
    fire(socket, 'requestGameState');
    await Promise.resolve();

    // THEN the lifecycle listener still restores the board...
    expect(mockSafeEmit).toHaveBeenCalledWith(socket, 'startGame', expect.anything());
    // ...and they also get their own classroom context, exactly as `join` sends it
    expect(mockEmitClassroomContext).toHaveBeenCalledWith(socket, 'ABC123', 'u-maya');
  });

  it('asks for a guest with no verified id too — the module answers core', () => {
    const socket = recoveringStudent({});

    fire(socket, 'requestGameState');

    expect(mockEmitClassroomContext).toHaveBeenCalledWith(socket, 'ABC123', undefined);
  });

  it('says nothing for a socket that is not in a game', () => {
    mockGetGameBySocketId.mockReturnValue(undefined);
    const socket = recoveringStudent();

    fire(socket, 'requestGameState');

    expect(mockEmitClassroomContext).not.toHaveBeenCalled();
  });

  it('does not re-query per emit when a client retries in a tight loop', () => {
    // This listener is deliberately outside the lifecycle handler's rate-limit
    // bucket — sharing it would halve the real handler's budget — so it carries
    // its own per-socket floor. A watchdog that fires three times in a second
    // must not mean three Supabase membership lookups per student.
    const socket = recoveringStudent();

    fire(socket, 'requestGameState');
    fire(socket, 'requestGameState');
    fire(socket, 'requestGameState');

    expect(mockEmitClassroomContext).toHaveBeenCalledTimes(1);
  });

  it('answers again once the retry storm is over', () => {
    vi.useFakeTimers();
    try {
      const socket = recoveringStudent();

      fire(socket, 'requestGameState');
      vi.advanceTimersByTime(5000);
      fire(socket, 'requestGameState');

      // A genuine second recovery — a student who dropped again — is answered.
      expect(mockEmitClassroomContext).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
