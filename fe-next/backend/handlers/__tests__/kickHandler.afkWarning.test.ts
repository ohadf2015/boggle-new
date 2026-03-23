/**
 * AFK Warning Tests
 * Tests that players receive a warning before being auto-kicked for inactivity
 */

import type { Server } from 'socket.io';

const mockGetGame = jest.fn();
const mockGetSocketIdByUsername = jest.fn();
const mockGetGameUsers = jest.fn();
const mockGetActiveRooms = jest.fn();
const mockRemoveUserFromGame = jest.fn();
const mockClearSocketMappingsForLeave = jest.fn();

jest.mock('../../modules/gameStateManager.js', () => ({
  getGame: (...args: unknown[]) => mockGetGame(...args),
  getGameBySocketId: jest.fn(),
  getSocketIdByUsername: (...args: unknown[]) => mockGetSocketIdByUsername(...args),
  removeUserFromGame: (...args: unknown[]) => mockRemoveUserFromGame(...args),
  getGameUsers: (...args: unknown[]) => mockGetGameUsers(...args),
  getActiveRooms: (...args: unknown[]) => mockGetActiveRooms(...args),
  clearSocketMappingsForLeave: (...args: unknown[]) => mockClearSocketMappingsForLeave(...args),
}));

const mockSafeEmit = jest.fn();
const mockGetSocketById = jest.fn();
const mockBroadcastToRoom = jest.fn();
const mockBroadcastActiveRooms = jest.fn();
const mockGetGameRoom = jest.fn().mockReturnValue('game:TEST123');
const mockLeaveRoom = jest.fn();

jest.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => mockBroadcastToRoom(...args),
  broadcastActiveRooms: (...args: unknown[]) => mockBroadcastActiveRooms(...args),
  getGameRoom: (...args: unknown[]) => mockGetGameRoom(...args),
  safeEmit: (...args: unknown[]) => mockSafeEmit(...args),
  getSocketById: (...args: unknown[]) => mockGetSocketById(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
}));

jest.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../../utils/gameStartCoordinator.js', () => ({
  default: { handlePlayerDisconnect: jest.fn() },
  __esModule: true,
}));

jest.mock('../../utils/playerCleanup.js', () => ({
  cleanupPlayerData: jest.fn(),
}));

import { checkAfkWarnings } from '../kickHandler';

function createMockIO(): Server {
  return {
    sockets: { sockets: new Map() },
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Server;
}

describe('AFK Warning', () => {
  const AFK_KICK_MS = 180000; // 3 minutes
  const AFK_WARNING_MS = AFK_KICK_MS - 30000; // 2.5 minutes = warning threshold

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetGameRoom.mockReturnValue('game:TEST123');
  });

  it('should send afkWarning to players approaching AFK threshold', () => {
    const io = createMockIO();
    const now = Date.now();
    const mockSocket = { id: 'player-socket', connected: true };

    mockGetSocketIdByUsername.mockReturnValue('player-socket');
    mockGetSocketById.mockReturnValue(mockSocket);

    // Player has been inactive for 155s (past warning threshold of 150s, before kick at 180s)
    const game = {
      gameState: 'waiting',
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true, lastActivity: now },
        Player1: { username: 'Player1', isHost: false, isBot: false, disconnected: false, lastActivity: now - 155000, _afkWarned: false },
      },
    };

    const forEachGame = (cb: (gameCode: string, game: any) => void) => {
      cb('TEST123', game);
    };

    checkAfkWarnings(io, forEachGame);

    // Should emit afkWarning to the player
    expect(mockSafeEmit).toHaveBeenCalledWith(
      mockSocket,
      'afkWarning',
      expect.objectContaining({ secondsRemaining: expect.any(Number) })
    );
  });

  it('should NOT send afkWarning to host', () => {
    const io = createMockIO();
    const now = Date.now();

    const game = {
      gameState: 'waiting',
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true, lastActivity: now - 155000 },
      },
    };

    const forEachGame = (cb: (gameCode: string, game: any) => void) => {
      cb('TEST123', game);
    };

    checkAfkWarnings(io, forEachGame);

    expect(mockSafeEmit).not.toHaveBeenCalled();
  });

  it('should NOT send afkWarning to bots', () => {
    const io = createMockIO();
    const now = Date.now();

    const game = {
      gameState: 'waiting',
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true, lastActivity: now },
        Bot1: { username: 'Bot1', isBot: true, lastActivity: now - 155000 },
      },
    };

    const forEachGame = (cb: (gameCode: string, game: any) => void) => {
      cb('TEST123', game);
    };

    checkAfkWarnings(io, forEachGame);

    expect(mockSafeEmit).not.toHaveBeenCalled();
  });

  it('should NOT send afkWarning during active games', () => {
    const io = createMockIO();
    const now = Date.now();

    const game = {
      gameState: 'playing',
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true, lastActivity: now },
        Player1: { username: 'Player1', isHost: false, isBot: false, disconnected: false, lastActivity: now - 155000 },
      },
    };

    const forEachGame = (cb: (gameCode: string, game: any) => void) => {
      cb('TEST123', game);
    };

    checkAfkWarnings(io, forEachGame);

    expect(mockSafeEmit).not.toHaveBeenCalled();
  });

  it('should NOT warn players who are still active', () => {
    const io = createMockIO();
    const now = Date.now();

    const game = {
      gameState: 'waiting',
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true, lastActivity: now },
        Player1: { username: 'Player1', isHost: false, isBot: false, disconnected: false, lastActivity: now - 60000 }, // Only 60s inactive
      },
    };

    const forEachGame = (cb: (gameCode: string, game: any) => void) => {
      cb('TEST123', game);
    };

    checkAfkWarnings(io, forEachGame);

    expect(mockSafeEmit).not.toHaveBeenCalled();
  });

  it('should NOT re-warn players already warned', () => {
    const io = createMockIO();
    const now = Date.now();
    const mockSocket = { id: 'player-socket', connected: true };

    mockGetSocketIdByUsername.mockReturnValue('player-socket');
    mockGetSocketById.mockReturnValue(mockSocket);

    const game = {
      gameState: 'waiting',
      hostUsername: 'Host',
      users: {
        Host: { username: 'Host', isHost: true, lastActivity: now },
        Player1: { username: 'Player1', isHost: false, isBot: false, disconnected: false, lastActivity: now - 155000, _afkWarned: true },
      },
    };

    const forEachGame = (cb: (gameCode: string, game: any) => void) => {
      cb('TEST123', game);
    };

    checkAfkWarnings(io, forEachGame);

    expect(mockSafeEmit).not.toHaveBeenCalled();
  });
});
