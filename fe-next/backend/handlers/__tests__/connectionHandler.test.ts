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
  upgradeSpectatorToPlayer,
  getGameSpectators,
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

// PostHog server capture spy — assert the MP-drop telemetry payloads end-to-end
// (the real builder runs, so this also pins durationSec to disconnectedAt).
const { mockCapture } = vi.hoisted(() => ({ mockCapture: vi.fn() }));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: mockCapture }) }));

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
const mockUpgradeSpectatorToPlayer = upgradeSpectatorToPlayer as Mock;
const mockGetGameSpectators = getGameSpectators as Mock;
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
    mockGetGameSpectators.mockReturnValue([]);
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

    it('does NOT close room immediately when the last player disconnects (reconnection-friendly)', () => {
      // Regression: a transient mobile disconnect of the last player used to
      // delete the room instantly, so the reconnecting socket hit
      // GAME_NOT_FOUND ("room closed/inactive"). Mirror the host grace path.
      const game = makeGame({ users: { Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      // Not deleted on the spot; a grace timer is armed instead.
      expect(mockDeleteGame).not.toHaveBeenCalled();
      expect(mockTimerManager.setTimeout).toHaveBeenCalledWith(
        'reconnect:GAME1:Player1',
        expect.any(Function),
        expect.any(Number)
      );
    });

    it('deletes the empty room only after the player grace expires without reconnect', () => {
      const game = makeGame({ users: { Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');
      expect(mockDeleteGame).not.toHaveBeenCalled();

      // Player never came back — grace timer fires, room is reaped.
      vi.advanceTimersByTime(120000);

      expect(mockRemoveUserFromGame).toHaveBeenCalledWith('GAME1', 'Player1');
      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
    });

    it('preserves the empty room when the last player reconnects within grace', () => {
      const game = makeGame({ users: { Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-p1');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Player1');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);

      handlers['disconnect']('transport close');

      // Reconnect before grace expiry clears the disconnected flag.
      game.users.Player1.disconnected = false;
      vi.advanceTimersByTime(120000);

      expect(mockDeleteGame).not.toHaveBeenCalled();
      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
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

    it('does NOT close room immediately when solo host disconnects (backgrounding-friendly)', () => {
      // User scenario: host creates a room, backgrounds Chrome / locks phone — must NOT
      // tear down the room. We schedule a grace timer instead and only delete on expiry.
      const game = makeGame({ users: { Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      // Room must survive the immediate disconnect tick.
      expect(mockDeleteGame).not.toHaveBeenCalled();
      // A grace timer must be scheduled so we can clean up later if host never comes back.
      expect(mockTimerManager.setTimeout).toHaveBeenCalledWith(
        'hostReconnect:GAME1',
        expect.any(Function),
        expect.any(Number)
      );
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected', expect.objectContaining({ gracePeriodMs: expect.any(Number) })
      );
    });

    it('deletes solo-host room only after grace period expires without reconnect', () => {
      const game = makeGame({ users: { Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      // Advance well past any reasonable grace window (5 minutes default).
      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
      expect(mockClearGameTimer).toHaveBeenCalledWith('GAME1');
    });

    it('preserves solo-host room when host reconnects within grace window', () => {
      const game = makeGame({ users: { Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false } } });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(true);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      // Simulate reconnect: hostSocketId rotates to new socket before timer fires.
      game.hostSocketId = 'new-socket-host';

      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(mockDeleteGame).not.toHaveBeenCalled();
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
        expect.objectContaining({
          gracePeriodMs: expect.any(Number),
          i18nKey: 'playerView.hostDisconnected',
          i18nParams: expect.objectContaining({ host: 'Host' }),
        })
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
      vi.advanceTimersByTime(300000);

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostLeftRoomClosing',
        expect.objectContaining({
          message: expect.any(String),
          reason: 'grace_expired',
          i18nKey: 'multiplayerFlow.hostLeftReason.graceExpired',
          i18nParams: expect.objectContaining({ host: 'Host' }),
        })
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

      vi.advanceTimersByTime(300000);

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

      vi.advanceTimersByTime(300000);

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
        expect.objectContaining({ gracePeriodMs: expect.any(Number) })
      );
    });

    // T1 (audit 2026-05-10): retry budget should explore up to 3 DIFFERENT
    // candidates when transfers fail. Pre-fix the loop short-circuited because
    // getNextEligibleHost lacked an exclude-list, so attempts 2/3 selected the
    // same already-tried username and the duplicate-check broke the loop.
    it('tries up to 3 distinct candidates when transferHost keeps failing', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);

      // Simulate the BUG scenario: getNextEligibleHost is called multiple
      // times. Pre-fix, the wrapper only knows to exclude the leaving host —
      // so absent a separate per-attempt exclude list, callers that don't
      // mutate state between attempts get the SAME candidate back. Mirror
      // that here with `.mockReturnValue('Player1')` (no `.Once`). Post-fix,
      // the connectionHandler passes a growing exclude-list, so the mock
      // SHOULD be invoked with progressively larger arrays — and the
      // duplicate-check should NOT short-circuit (it's the exclude-list,
      // not the duplicate-check, that drives correctness now).
      mockGetNextEligibleHost.mockImplementation(
        (_gameCode: string, exclude: string[] = []) => {
          // Simulate a real impl: skip excluded users, return Player1/2/3 in order.
          const candidates = ['Player1', 'Player2', 'Player3'];
          return candidates.find((c) => !exclude.includes(c)) || null;
        }
      );
      mockTransferHost.mockReturnValue({ success: false, error: 'race' });

      handlers['disconnect']('transport close');

      const calledWith = mockTransferHost.mock.calls.map((c) => c[1]);
      expect(calledWith).toEqual(['Player1', 'Player2', 'Player3']);
    });

    // T2 (audit 2026-05-10): when no eligible user remains but a spectator
    // is present, promote the spectator to host (non-ranked/non-classroom/
    // non-tournament rooms only). Closes the bug where invite-link rooms
    // strand willing spectators because join hit MAX_PLAYERS_PER_ROOM.
    it('promotes a spectator to host when no eligible user exists (T2)', () => {
      const game = makeGame({
        users: { Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false } },
        spectators: { Specta: { socketId: 'socket-specta', avatar: {}, joinedAt: Date.now() } },
      });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null); // no eligible user
      mockGetGameSpectators.mockReturnValue([{ username: 'Specta', socketId: 'socket-specta', avatar: {}, joinedAt: Date.now() }]);
      mockUpgradeSpectatorToPlayer.mockReturnValue(true);
      mockTransferHost.mockReturnValue({ success: true });

      handlers['disconnect']('transport close');

      expect(mockUpgradeSpectatorToPlayer).toHaveBeenCalledWith('GAME1', 'Specta');
      expect(mockTransferHost).toHaveBeenCalledWith('GAME1', 'Specta');
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostTransferred',
        expect.objectContaining({ newHost: 'Specta' })
      );
    });

    it('does NOT promote spectator in ranked/classroom/tournament rooms (T2 guard)', () => {
      const game = makeGame({
        isRanked: true,
        users: { Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false } },
        spectators: { Specta: { socketId: 'socket-specta', avatar: {}, joinedAt: Date.now() } },
      });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue(null);

      handlers['disconnect']('transport close');

      expect(mockUpgradeSpectatorToPlayer).not.toHaveBeenCalled();
      // Goes straight to grace period.
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected', expect.anything()
      );
    });

    // T3 (audit 2026-05-10): hostTransferred event must carry i18nKey +
    // params so non-EN locales don't leak the English template literal.
    // Mirrors the envelope shipped for hostLeftRoomClosing / hostDisconnected.
    it('hostTransferred broadcast carries i18nKey + i18nParams (T3)', () => {
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

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostTransferred',
        expect.objectContaining({
          previousHost: 'Host',
          newHost: 'Player1',
          i18nKey: 'multiplayerFlow.hostTransferredAnnouncement',
          i18nParams: expect.objectContaining({ previousHost: 'Host', newHost: 'Player1' }),
        })
      );
    });

    // T5 (audit 2026-05-10): tournament rooms have host-bound state in
    // tournamentManager that doesn't reconcile after a silent transfer.
    // Preserve match integrity by NOT transferring.
    it('does NOT auto-transfer host when game has tournamentId (T5)', () => {
      const game = makeGame({ tournamentId: 'tourn-abc' });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue('Player1');

      handlers['disconnect']('transport close');

      expect(mockTransferHost).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected',
        expect.objectContaining({ gracePeriodMs: expect.any(Number) })
      );
    });

    // T6 (audit 2026-05-10): ranked rooms tie MMR / match outcome to the
    // original host's session. A silent transfer attributes results to the
    // wrong player. Skip auto-transfer; close-on-grace preserves rating math.
    it('does NOT auto-transfer host when game.isRanked=true (T6)', () => {
      const game = makeGame({ isRanked: true });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost.mockReturnValue('Player1');

      handlers['disconnect']('transport close');

      expect(mockTransferHost).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected',
        expect.objectContaining({ gracePeriodMs: expect.any(Number) })
      );
    });

    // T4 (audit 2026-05-10): classroom rooms must never auto-promote a student
    // to teacher. Skip the transfer loop entirely and fall straight to the
    // grace period, giving the teacher 5 minutes to reconnect.
    it('does NOT auto-transfer host when game.isClassroom=true (teacher protection)', () => {
      const game = makeGame({ isClassroom: true });
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      // Eligible candidate exists — but classroom guard must prevent its use.
      mockGetNextEligibleHost.mockReturnValue('Player1');

      handlers['disconnect']('transport close');

      expect(mockTransferHost).not.toHaveBeenCalled();
      expect(mockBroadcastToRoom).not.toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostTransferred', expect.anything()
      );
      // Should skip straight to grace-period notification.
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo, 'game:GAME1', 'hostDisconnected',
        expect.objectContaining({ gracePeriodMs: expect.any(Number) })
      );
    });

    it('passes growing exclude-list to getNextEligibleHost across retries', () => {
      const game = makeGame();
      const { socket, handlers } = createMockSocket('socket-host');
      registerConnectionHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetUsernameBySocketId.mockReturnValue('Host');
      mockGetGame.mockReturnValue(game);
      mockIsRoomEmpty.mockReturnValue(false);
      mockGetNextEligibleHost
        .mockReturnValueOnce('Player1')
        .mockReturnValueOnce('Player2')
        .mockReturnValueOnce(null);
      mockTransferHost.mockReturnValueOnce({ success: false, error: 'race' });

      handlers['disconnect']('transport close');

      // First call excludes only the leaving host.
      expect(mockGetNextEligibleHost.mock.calls[0]).toEqual(['GAME1', ['Host']]);
      // Second call must also exclude Player1 (the failed candidate).
      expect(mockGetNextEligibleHost.mock.calls[1]).toEqual(['GAME1', ['Host', 'Player1']]);
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

      vi.advanceTimersByTime(300000);

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

// ─── MP-drop telemetry wiring (mp_player_dropped) ───
describe('mp_player_dropped telemetry', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
    mockGetGameRoom.mockReturnValue('game:GAME1');
    mockGetActiveRooms.mockReturnValue([]);
    mockGetGameUsers.mockReturnValue([]);
    mockGetGameSpectators.mockReturnValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('emits a grace-expiry drop whose durationSec is measured from the disconnect moment, not grace-expiry', () => {
    // Started 30s before the disconnect. The grace callback fires 120s LATER —
    // if duration were measured at expiry it would read ~150s and hide rage-quits.
    const game = makeGame({
      gameState: 'in-progress',
      gameMode: 'classic',
      gameStartedAt: 1_000_000 - 30_000,
      users: { Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false } },
    });
    const { socket, handlers } = createMockSocket('socket-p1');
    registerConnectionHandlers(mockIo, socket);

    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetUsernameBySocketId.mockReturnValue('Player1');
    mockGetGame.mockReturnValue(game);
    mockIsRoomEmpty.mockReturnValue(false);

    handlers['disconnect']('transport close');
    vi.advanceTimersByTime(120000); // grace expires

    const dropCall = mockCapture.mock.calls.find((c) => c[0]?.event === 'mp_player_dropped');
    expect(dropCall).toBeDefined();
    expect(dropCall[0].distinctId).toBe('Player1');
    expect(dropCall[0].properties.reason).toBe('transport close');
    expect(dropCall[0].properties.source).toBe('grace_expiry');
    expect(dropCall[0].properties.durationSec).toBe(30); // NOT ~150
  });

  it('emits a host_left drop for each remaining human when the host abandons and the room closes', () => {
    const game = makeGame({ gameState: 'in-progress', gameMode: 'classic', gameStartedAt: 1_000_000 - 60_000 });
    const { socket, handlers } = createMockSocket('socket-host');
    registerConnectionHandlers(mockIo, socket);

    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetUsernameBySocketId.mockReturnValue('Host');
    mockGetGame.mockReturnValue(game);
    mockGetNextEligibleHost.mockReturnValue(null); // no transfer target → room closes at grace

    handlers['disconnect']('transport close');
    vi.advanceTimersByTime(300000); // host grace expires → room closes

    const hostLeftDrops = mockCapture.mock.calls
      .map((c) => c[0])
      .filter((e) => e?.event === 'mp_player_dropped' && e.properties.source === 'host_left');
    expect(hostLeftDrops.map((e) => e.distinctId).sort()).toEqual(['Host', 'Player1']);
    expect(hostLeftDrops.every((e) => e.properties.reason === 'host_left')).toBe(true);
  });
});
