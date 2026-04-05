/**
 * Kick Handler Tests
 * Tests host kick and auto-kick inactive players
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server, Socket } from 'socket.io';

// Mock dependencies
const { mockGetGame, mockGetGameBySocketId, mockGetSocketIdByUsername, mockRemoveUserFromGame, mockGetGameUsers, mockGetActiveRooms, mockIsRoomEmpty, mockClearSocketMappingsForLeave, mockGetNextEligibleHost, mockTransferHost } = vi.hoisted(() => {
  const mockGetGame = vi.fn();
  const mockGetGameBySocketId = vi.fn();
  const mockGetSocketIdByUsername = vi.fn();
  const mockRemoveUserFromGame = vi.fn();
  const mockGetGameUsers = vi.fn();
  const mockGetActiveRooms = vi.fn();
  const mockIsRoomEmpty = vi.fn();
  const mockClearSocketMappingsForLeave = vi.fn();
  const mockGetNextEligibleHost = vi.fn();
  const mockTransferHost = vi.fn();
  return { mockGetGame, mockGetGameBySocketId, mockGetSocketIdByUsername, mockRemoveUserFromGame, mockGetGameUsers, mockGetActiveRooms, mockIsRoomEmpty, mockClearSocketMappingsForLeave, mockGetNextEligibleHost, mockTransferHost };
});

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: (...args: unknown[]) => mockGetGame(...args),
  getGameBySocketId: (...args: unknown[]) => mockGetGameBySocketId(...args),
  getSocketIdByUsername: (...args: unknown[]) => mockGetSocketIdByUsername(...args),
  removeUserFromGame: (...args: unknown[]) => mockRemoveUserFromGame(...args),
  getGameUsers: (...args: unknown[]) => mockGetGameUsers(...args),
  getActiveRooms: (...args: unknown[]) => mockGetActiveRooms(...args),
  isRoomEmpty: (...args: unknown[]) => mockIsRoomEmpty(...args),
  clearSocketMappingsForLeave: (...args: unknown[]) => mockClearSocketMappingsForLeave(...args),
  getNextEligibleHost: (...args: unknown[]) => mockGetNextEligibleHost(...args),
  transferHost: (...args: unknown[]) => mockTransferHost(...args),
}));

const mockBroadcastToRoom = vi.fn();
const mockBroadcastActiveRooms = vi.fn();
const mockGetGameRoom = vi.fn().mockReturnValue('game:TEST123');
const mockSafeEmit = vi.fn();
const mockGetSocketById = vi.fn();
const mockLeaveRoom = vi.fn();

vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => mockBroadcastToRoom(...args),
  broadcastActiveRooms: (...args: unknown[]) => mockBroadcastActiveRooms(...args),
  getGameRoom: (...args: unknown[]) => mockGetGameRoom(...args),
  safeEmit: (...args: unknown[]) => mockSafeEmit(...args),
  getSocketById: (...args: unknown[]) => mockGetSocketById(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
}));

const mockCheckRateLimit = vi.fn().mockReturnValue(true);
vi.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/gameStartCoordinator.js', () => {
  const coordinator = { handlePlayerDisconnect: vi.fn(), cleanupSequence: vi.fn() };
  return { default: coordinator, __esModule: true };
});

vi.mock('../../utils/playerCleanup.js', () => ({
  cleanupPlayerData: vi.fn(),
}));

import { registerKickHandler } from '../kickHandler';

// Helper to create mock socket
function createMockSocket(id = 'host-socket-1'): Socket {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    emit: vi.fn(),
    data: {},
    _handlers: handlers,
  } as unknown as Socket & { _handlers: Record<string, Function> };
}

function createMockIO(): Server {
  return {
    sockets: { sockets: new Map() },
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  } as unknown as Server;
}

function createGame(overrides = {}) {
  return {
    hostSocketId: 'host-socket-1',
    hostUsername: 'HostPlayer',
    gameState: 'waiting',
    users: {
      HostPlayer: { username: 'HostPlayer', isHost: true, disconnected: false },
      Player2: { username: 'Player2', isHost: false, disconnected: false },
      Player3: { username: 'Player3', isHost: false, disconnected: false },
    },
    kickedPlayers: new Set<string>(),
    ...overrides,
  };
}

describe('kickHandler', () => {
  let io: Server;
  let socket: Socket & { _handlers: Record<string, Function> };

  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetGameRoom.mockReturnValue('game:TEST123');
    io = createMockIO();
    socket = createMockSocket() as Socket & { _handlers: Record<string, Function> };
    registerKickHandler(io, socket);
  });

  describe('kickPlayer event', () => {
    it('should register kickPlayer event handler', () => {
      expect(socket.on).toHaveBeenCalledWith('kickPlayer', expect.any(Function));
    });

    it('should kick a player when host sends kickPlayer', () => {
      const game = createGame();
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(game);
      mockGetSocketIdByUsername.mockReturnValue('player2-socket');
      mockGetSocketById.mockReturnValue({ id: 'player2-socket', connected: true });
      mockGetGameUsers.mockReturnValue([{ username: 'HostPlayer' }, { username: 'Player3' }]);
      mockIsRoomEmpty.mockReturnValue(false);

      socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

      // Should notify the kicked player
      expect(mockSafeEmit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'player2-socket' }),
        'kicked',
        expect.objectContaining({ reason: 'host' })
      );

      // Should remove from socket room
      expect(mockLeaveRoom).toHaveBeenCalled();

      // Should remove from game state
      expect(mockRemoveUserFromGame).toHaveBeenCalledWith('TEST123', 'Player2');

      // Should add to kickedPlayers set
      expect(game.kickedPlayers.has('Player2')).toBe(true);

      // Should broadcast playerKicked and updateUsers
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        io, 'game:TEST123', 'playerKicked',
        expect.objectContaining({ username: 'Player2' })
      );
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        io, 'game:TEST123', 'updateUsers',
        expect.objectContaining({ users: expect.any(Array) })
      );
    });

    it('should NOT kick when sender is not the host', () => {
      const game = createGame({ hostSocketId: 'other-socket' });
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(game);

      socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
      expect(mockSafeEmit).not.toHaveBeenCalled();
    });

    it('should NOT allow host to kick themselves', () => {
      const game = createGame();
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(game);

      socket._handlers['kickPlayer']({ targetUsername: 'HostPlayer' });

      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
    });

    it('should NOT kick a player that does not exist', () => {
      const game = createGame();
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(game);

      socket._handlers['kickPlayer']({ targetUsername: 'NonExistent' });

      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
    });

    it('should respect rate limiting', () => {
      mockCheckRateLimit.mockReturnValue(false);
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(createGame());

      socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

      expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
    });

    it('should clear socket mappings for the kicked player', () => {
      const game = createGame();
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(game);
      mockGetSocketIdByUsername.mockReturnValue('player2-socket');
      mockGetSocketById.mockReturnValue({ id: 'player2-socket', connected: true });
      mockGetGameUsers.mockReturnValue([]);
      mockIsRoomEmpty.mockReturnValue(false);

      socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

      expect(mockClearSocketMappingsForLeave).toHaveBeenCalledWith('player2-socket', 'TEST123', 'Player2');
    });

    it('should handle kick when target socket is already disconnected', () => {
      const game = createGame();
      mockGetGameBySocketId.mockReturnValue('TEST123');
      mockGetGame.mockReturnValue(game);
      mockGetSocketIdByUsername.mockReturnValue('player2-socket');
      mockGetSocketById.mockReturnValue(null); // socket already gone
      mockGetGameUsers.mockReturnValue([]);
      mockIsRoomEmpty.mockReturnValue(false);

      // Should not throw
      socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

      expect(mockRemoveUserFromGame).toHaveBeenCalledWith('TEST123', 'Player2');
      expect(game.kickedPlayers.has('Player2')).toBe(true);
    });
  });
});
