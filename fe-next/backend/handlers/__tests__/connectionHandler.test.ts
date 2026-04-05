import { vi, type Mock, type MockInstance } from 'vitest';
import { registerConnectionHandlers } from '../connectionHandler';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  deleteGame,
  updateHostSocketId,
  isRoomEmpty,
  getNextEligibleHost,
  transferHost,
} from '../../modules/gameStateManager';
import {
  broadcastToRoom,
  getGameRoom,
  safeEmit,
  getSocketById,
  leaveAllGameRooms,
} from '../../utils/socketHelpers';
import timerManager, { clearGameTimer } from '../../utils/timerManager';
import { resetRateLimit } from '../../utils/rateLimiter';
import { cleanupPlayerData } from '../../utils/playerCleanup';
import { cleanupGameBots } from '../../modules/botManager';
import gameStartCoordinator from '../../utils/gameStartCoordinator';

// Logger must be mocked before any module that transitively requires it
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/timerManager', () => {
  const callbacks: Map<string, () => void> = new Map();
  const mockTimerManager = {
    setTimeout: vi.fn((key: string, callback: () => void, _delay: number) => {
      callbacks.set(key, callback);
      // Use real setTimeout so jest.advanceTimersByTime works
      setTimeout(callback, _delay);
      return key;
    }),
    clearTimer: vi.fn((key: string) => {
      callbacks.delete(key);
    }),
  };
  return {
    __esModule: true,
    default: mockTimerManager,
    clearGameTimer: vi.fn(),
    setGameTimer: vi.fn(),
  };
});
vi.mock('../../utils/rateLimiter', () => ({ default: { checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1'), resetRateLimit: vi.fn() }, checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1'), resetRateLimit: vi.fn() }));
vi.mock('../../utils/playerCleanup');
vi.mock('../../modules/botManager');
vi.mock('../../utils/gameStartCoordinator', () => ({
  __esModule: true,
  default: { handlePlayerDisconnect: vi.fn() },
}));

const mockGetGame = getGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as Mock;
const mockRemoveUserFromGame = removeUserFromGame as Mock;
const mockGetGameUsers = getGameUsers as Mock;
const mockGetActiveRooms = getActiveRooms as Mock;
const mockDeleteGame = deleteGame as Mock;
const mockIsRoomEmpty = isRoomEmpty as Mock;
const mockGetNextEligibleHost = getNextEligibleHost as Mock;
const mockTransferHost = transferHost as Mock;
const mockBroadcastToRoom = broadcastToRoom as Mock;

const mockGetGameRoom = getGameRoom as Mock;
const mockClearGameTimer = clearGameTimer as Mock;
const mockTimerManager = timerManager as Mocked<typeof timerManager>;
const mockResetRateLimit = resetRateLimit as Mock;
const mockCleanupPlayerData = cleanupPlayerData as Mock;
const mockCleanupGameBots = cleanupGameBots as Mock;
const mockHandlePlayerDisconnect = gameStartCoordinator.handlePlayerDisconnect as Mock;

function createMockSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      data: {},
      on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    } as any,
    handlers,
  };
}

function makeGame(overrides: Record<string, any> = {}) {
  return {
    gameCode: 'GAME1',
    hostSocketId: 'socket-host',
    hostUsername: 'Host',
    users: {
      Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false },
      Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false },
    },
    gameState: 'waiting',
    ...overrides,
  };
}

describe('connectionHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetGameRoom.mockReturnValue('game:GAME1');
    mockGetActiveRooms.mockReturnValue([]);
    mockGetGameUsers.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers disconnect handler', () => {
    const { socket } = createMockSocket();
    registerConnectionHandlers(mockIo, socket);
    expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  // ─── Disconnect: no game ───
  it('cleans up rate limit even when socket has no game', () => {
    const { socket, handlers } = createMockSocket();
    registerConnectionHandlers(mockIo, socket);
    mockGetGameBySocketId.mockReturnValue(null);

    handlers['disconnect']('transport close');

    expect(mockResetRateLimit).toHaveBeenCalledWith('socket-host');
    expect(mockDeleteGame).not.toHaveBeenCalled();
  });

  // ─── Migrating socket skips disconnect ───
  it('skips disconnect logic when socket is migrating', () => {
    const { socket, handlers } = createMockSocket();
    socket.data.migrating = true;
    registerConnectionHandlers(mockIo, socket);

    handlers['disconnect']('transport close');

    expect(mockGetGameBySocketId).not.toHaveBeenCalled();
  });

  // ─── Clears migration timeout on disconnect ───
  it('clears migration timeout on disconnect', () => {
    const { socket, handlers } = createMockSocket();
    const timeout = setTimeout(() => {}, 5000);
    socket.data.migrationTimeout = timeout;
    registerConnectionHandlers(mockIo, socket);
    mockGetGameBySocketId.mockReturnValue(null);

    handlers['disconnect']('transport close');

    expect(socket.data.migrationTimeout).toBeUndefined();
  });

  // ─── Player disconnect: marks disconnected, broadcasts, starts timeout ───
  describe('player disconnect', () => {
    it('marks user disconnected and broadcasts playerDisconnected', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      handlers['disconnect']('transport close');

      expect(game.users.Player1.disconnected).toBe(true);
      expect((game.users.Player1 as any).disconnectedAt).toBeDefined();
      expect(mockHandlePlayerDisconnect).toHaveBeenCalledWith('GAME1', 'Player1');
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'playerDisconnected',
        expect.objectContaining({ username: 'Player1' })
      );
    });

    it('removes player after reconnection timeout expires', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      handlers['disconnect']('transport close');

      // After timeout fires, getGame returns game with user still disconnected
      vi.advanceTimersByTime(120000);

      expect(mockCleanupPlayerData).toHaveBeenCalledWith(game, 'Player1');
      expect(mockRemoveUserFromGame).toHaveBeenCalledWith('GAME1', 'Player1');
    });

    it('does not remove player if they reconnected before timeout', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      handlers['disconnect']('transport close');

      // Simulate reconnect: clear disconnected flag
      game.users.Player1.disconnected = false;

      vi.advanceTimersByTime(120000);

      // Should not remove because disconnected is false
      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
    });

    it('closes room immediately if room becomes empty on player disconnect', () => {
      const game = makeGame({ users: { Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      expect(mockClearGameTimer).toHaveBeenCalledWith('GAME1');
      expect(mockCleanupGameBots).toHaveBeenCalledWith('GAME1');
      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
    });

    it('registers reconnection timeout via timerManager', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      handlers['disconnect']('transport close');

      expect(mockTimerManager.setTimeout).toHaveBeenCalledWith(
        'reconnect:GAME1:Player1',
        expect.any(Function),
        expect.any(Number)
      );
    });
  });

  // ─── Bot disconnect: immediate removal ───
  describe('bot disconnect', () => {
    it('removes bot immediately without grace period', () => {
      const game = makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false },
          Bot1: { socketId: 'socket-bot', isHost: false, disconnected: false, isBot: true },
        },
      });
      const { socket, handlers } = createMockSocket('socket-bot');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Bot1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      handlers['disconnect']('transport close');

      expect(mockRemoveUserFromGame).toHaveBeenCalledWith('GAME1', 'Bot1');
      // No timeout should be set
      expect((game.users as any).Bot1?.reconnectionTimeout).toBeUndefined();
    });
  });

  // ─── Host disconnect ───
  describe('host disconnect', () => {
    it('transfers host to next eligible player immediately', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue('Player1');
      mockTransferHost.mockReturnValue({ success: true });

      handlers['disconnect']('transport close');

      expect(mockTransferHost).toHaveBeenCalledWith('GAME1', 'Player1');
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostTransferred',
        expect.objectContaining({ newHost: 'Player1' })
      );
    });

    it('closes room immediately when empty after host disconnect', () => {
      const game = makeGame({ users: { Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
      expect(mockClearGameTimer).toHaveBeenCalledWith('GAME1');
    });

    it('starts grace period when no eligible host and room not empty', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected',
        expect.objectContaining({ gracePeriodMs: 30000 })
      );
      expect(mockTimerManager.setTimeout).toHaveBeenCalledWith(
        'hostReconnect:GAME1',
        expect.any(Function),
        expect.any(Number)
      );
    });

    it('closes room after host grace period expires with no eligible host', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      // After grace period, getGame still returns the game and hostSocketId unchanged
      vi.advanceTimersByTime(30000);

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostLeftRoomClosing',
        expect.objectContaining({ message: expect.any(String) })
      );
      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
    });

    it('transfers host at grace period expiry if eligible host found', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      // No eligible host at disconnect time
      mockGetNextEligibleHost.mockReturnValueOnce(null);

      handlers['disconnect']('transport close');

      // At timeout time, an eligible host appears
      mockGetNextEligibleHost.mockReturnValue('Player1');
      mockTransferHost.mockReturnValue({ success: true });

      vi.advanceTimersByTime(30000);

      expect(mockTransferHost).toHaveBeenCalledWith('GAME1', 'Player1');
      expect(mockDeleteGame).not.toHaveBeenCalled();
    });

    it('clears existing host reconnection timeout on new disconnect', () => {
      const game = makeGame();

      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      expect(mockTimerManager.clearTimer).toHaveBeenCalledWith('hostReconnect:GAME1');
    });

    it('does not close room if host reconnected before grace period expires', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      // Simulate host reconnect: hostSocketId changes
      game.hostSocketId = 'new-socket-host';

      vi.advanceTimersByTime(30000);

      // Should not close because hostSocketId changed
      expect(mockDeleteGame).not.toHaveBeenCalled();
    });

    it('notifies game start coordinator on host disconnect', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      expect(mockHandlePlayerDisconnect).toHaveBeenCalledWith('GAME1', 'Host');
    });

    it('marks host as disconnected', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      expect(game.users.Host.disconnected).toBe(true);
      expect((game.users.Host as any).disconnectedAt).toBeDefined();
    });
  });

  // ─── Host disconnect with failed transfer ───
  describe('host disconnect with failed transfer', () => {
    it('falls through to grace period when transferHost fails', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValueOnce('Player1');
      mockTransferHost.mockReturnValue({ success: false, error: 'some error' });
      // After failed transfer, no eligible host for grace period path
      mockGetNextEligibleHost.mockReturnValueOnce(null);

      handlers['disconnect']('transport close');

      // Should fall through to grace period
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected',
        expect.objectContaining({ gracePeriodMs: 30000 })
      );
    });
  });

  // ─── Player timeout: room becomes empty ───
  describe('player timeout cleans up empty room', () => {
    it('deletes game when player timeout makes room empty', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValueOnce(false); // at disconnect

      handlers['disconnect']('transport close');

      mockIsRoomEmpty.mockReturnValue(true); // at timeout

      vi.advanceTimersByTime(120000);

      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
    });
  });

  // ─── Edge: game deleted before timeout fires ───
  describe('edge cases', () => {
    it('player timeout is no-op if game was deleted', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      handlers['disconnect']('transport close');

      // Game deleted before timeout
      mockGetGame.mockReturnValue(null);

      vi.advanceTimersByTime(120000);

      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
    });

    it('host timeout is no-op if game was deleted', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      mockGetGame.mockReturnValue(null);

      vi.advanceTimersByTime(30000);

      expect(mockDeleteGame).not.toHaveBeenCalled();
    });

    it('handles disconnect when username is null (no game user)', () => {
      const { socket, handlers } = createMockSocket('socket-unknown');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue(null);
      mockGetGame.mockReturnValue(makeGame());

      // Should not throw
      handlers['disconnect']('transport close');

      expect(mockDeleteGame).not.toHaveBeenCalled();
    });

    it('multiple rapid disconnects clear previous host timeout and register new one', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null);

      // First disconnect
      handlers['disconnect']('transport close');

      // Reset disconnected for second disconnect
      game.users.Host.disconnected = false;
      game.hostSocketId = 'socket-host';

      // Second disconnect
      handlers['disconnect']('transport close');

      // clearTimer called twice (once per disconnect)
      expect(mockTimerManager.clearTimer).toHaveBeenCalledWith('hostReconnect:GAME1');
      // setTimeout called twice (once per disconnect)
      expect(mockTimerManager.setTimeout).toHaveBeenCalledTimes(2);
    });
  });
});
