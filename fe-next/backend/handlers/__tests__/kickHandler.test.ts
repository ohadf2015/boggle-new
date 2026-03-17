/**
 * Kick Handler Tests
 * Tests host kick and auto-kick inactive players
 */

import type { Server, Socket } from 'socket.io';

// Mock dependencies
const mockGetGame = jest.fn();
const mockGetGameBySocketId = jest.fn();
const mockGetSocketIdByUsername = jest.fn();
const mockRemoveUserFromGame = jest.fn();
const mockGetGameUsers = jest.fn();
const mockGetActiveRooms = jest.fn();
const mockIsRoomEmpty = jest.fn();
const mockClearSocketMappingsForLeave = jest.fn();
const mockGetNextEligibleHost = jest.fn();
const mockTransferHost = jest.fn();

jest.mock('../../modules/gameStateManager.js', () => ({
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

const mockBroadcastToRoom = jest.fn();
const mockBroadcastActiveRooms = jest.fn();
const mockGetGameRoom = jest.fn().mockReturnValue('game:TEST123');
const mockSafeEmit = jest.fn();
const mockGetSocketById = jest.fn();
const mockLeaveRoom = jest.fn();

jest.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => mockBroadcastToRoom(...args),
  broadcastActiveRooms: (...args: unknown[]) => mockBroadcastActiveRooms(...args),
  getGameRoom: (...args: unknown[]) => mockGetGameRoom(...args),
  safeEmit: (...args: unknown[]) => mockSafeEmit(...args),
  getSocketById: (...args: unknown[]) => mockGetSocketById(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
}));

const mockCheckRateLimit = jest.fn().mockReturnValue(true);
jest.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../../utils/gameStartCoordinator.js', () => {
  const coordinator = { handlePlayerDisconnect: jest.fn(), cleanupSequence: jest.fn() };
  return { default: coordinator, __esModule: true };
});

jest.mock('../../utils/playerCleanup.js', () => ({
  cleanupPlayerData: jest.fn(),
}));

import { registerKickHandler } from '../kickHandler';

// Helper to create mock socket
function createMockSocket(id = 'host-socket-1'): Socket {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: jest.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    emit: jest.fn(),
    data: {},
    _handlers: handlers,
  } as unknown as Socket & { _handlers: Record<string, Function> };
}

function createMockIO(): Server {
  return {
    sockets: { sockets: new Map() },
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
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
    jest.resetAllMocks();
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
