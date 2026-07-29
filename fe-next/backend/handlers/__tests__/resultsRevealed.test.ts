/**
 * resultsRevealed relay handler tests
 * Verifies host-only auth check and broadcast to room
 */

const {
  mockGetGame,
  mockGetGameBySocketId,
  mockBroadcastToRoom,
  mockGetGameRoom,
  mockCheckRateLimit,
} = vi.hoisted(() => ({
  mockGetGame: vi.fn(),
  mockGetGameBySocketId: vi.fn(),
  mockBroadcastToRoom: vi.fn(),
  mockGetGameRoom: vi.fn().mockReturnValue('game:ABCD'),
  mockCheckRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameBySocketId: mockGetGameBySocketId,
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  gameExists: vi.fn(),
  addUserToGame: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  getGameUsers: vi.fn(),
  getActiveRooms: vi.fn(),
  resetGameForNewRound: vi.fn(),
  getAuthUserConnection: vi.fn(),
  isRoomEmpty: vi.fn(),
  markPlayerReadyForNextGame: vi.fn(),
  unmarkPlayerReady: vi.fn(),
  getPlayersReadyCount: vi.fn(),
  removeUserFromGame: vi.fn(),
  updateUsernameMapping: vi.fn(),
  getLeaderboard: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: mockGetGameRoom,
  broadcastActiveRooms: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  safeEmit: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock('../../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock('../../utils/gameStartCoordinator', () => ({ default: { isStarting: vi.fn() } }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../redisClient', () => ({ saveGameState: vi.fn() }));
vi.mock('../../utils/metrics', () => ({ inc: vi.fn(), ensureGame: vi.fn() }));
vi.mock('../../utils/gameUtils', () => ({ generateRandomAvatar: vi.fn() }));
vi.mock('../../dictionary', () => ({ getRandomLongWordsWithTheme: vi.fn(), ensureLanguageLoaded: vi.fn() }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../shared', () => ({ startGameTimer: vi.fn(), endGame: vi.fn() }));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockReturnValue({}),
  createGameSchema: {},
  getWordsForBoardSchema: {},
}));
vi.mock('../../modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../modules/notificationService', () => ({ notifyRoomCreated: vi.fn() }));
vi.mock('../../utils/gameStateMachine', () => ({ isInProgress: vi.fn() }));
vi.mock('../gameStartHandler', () => ({ registerStartGameHandler: vi.fn() }));
vi.mock('../../utils/errorHandler', () => ({
  emitError: vi.fn(),
  ErrorCodes: { GAME_NOT_FOUND: 'GAME_NOT_FOUND' },
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { registerGameLifecycleHandlers } from '../gameLifecycleHandler';

// Helpers
function createMockSocket(id = 'host-socket-123'): Socket {
  const handlers = new Map<string, Function>();
  return {
    id,
    on: vi.fn((event: string, handler: Function) => { handlers.set(event, handler); }),
    emit: vi.fn(),
    _handlers: handlers,
  } as unknown as Socket;
}

function createMockIo(): Server {
  return { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server;
}

function triggerEvent(socket: Socket, event: string, ...args: unknown[]) {
  const handlers = (socket as unknown as { _handlers: Map<string, Function> })._handlers;
  const handler = handlers.get(event);
  if (!handler) throw new Error(`No handler registered for "${event}"`);
  return handler(...args);
}

describe('resultsRevealed relay handler', () => {
  let io: Server;
  let socket: Socket;

  const mockGame = {
    gameCode: 'ABCD',
    hostSocketId: 'host-socket-123',
    gameState: 'finished' as const,
    tvMode: true,
    users: { Host: { socketId: 'host-socket-123', isHost: true } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    io = createMockIo();
    socket = createMockSocket('host-socket-123');
    mockGetGameBySocketId.mockReturnValue('ABCD');
    mockGetGame.mockReturnValue(mockGame);
    registerGameLifecycleHandlers(io, socket);
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('registers a resultsRevealed handler', () => {
    const registeredEvents = (socket.on as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => call[0]
    );
    expect(registeredEvents).toContain('resultsRevealed');
  });

  it('broadcasts resultsRevealed to room when host emits', () => {
    triggerEvent(socket, 'resultsRevealed');

    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      io,
      'game:ABCD',
      'resultsRevealed',
      expect.objectContaining({})
    );
  });

  it('rejects resultsRevealed from non-host socket', () => {
    // Socket ID doesn't match game.hostSocketId
    const playerSocket = createMockSocket('player-socket-456');
    registerGameLifecycleHandlers(io, playerSocket);
    mockGetGameBySocketId.mockReturnValue('ABCD');
    mockGetGame.mockReturnValue(mockGame);

    triggerEvent(playerSocket, 'resultsRevealed');

    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('does nothing when game not found', () => {
    mockGetGameBySocketId.mockReturnValue(null);

    triggerEvent(socket, 'resultsRevealed');

    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('does nothing when rate limited', () => {
    mockCheckRateLimit.mockReturnValueOnce(false);

    triggerEvent(socket, 'resultsRevealed');

    expect(mockBroadcastToRoom).not.toHaveBeenCalled();
  });
});
