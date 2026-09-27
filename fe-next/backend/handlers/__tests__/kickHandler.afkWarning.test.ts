/**
 * AFK Warning Tests
 * Tests that players receive a warning before being auto-kicked for inactivity
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server } from 'socket.io';

const { mockGetGame, mockGetSocketIdByUsername, mockGetGameUsers, mockGetActiveRooms, mockRemoveUserFromGame, mockClearSocketMappingsForLeave } = vi.hoisted(() => {
  const mockGetGame = vi.fn();
  const mockGetSocketIdByUsername = vi.fn();
  const mockGetGameUsers = vi.fn();
  const mockGetActiveRooms = vi.fn();
  const mockRemoveUserFromGame = vi.fn();
  const mockClearSocketMappingsForLeave = vi.fn();
  return { mockGetGame, mockGetSocketIdByUsername, mockGetGameUsers, mockGetActiveRooms, mockRemoveUserFromGame, mockClearSocketMappingsForLeave };
});

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: (...args: unknown[]) => mockGetGame(...args),
  getGameBySocketId: vi.fn(),
  getSocketIdByUsername: (...args: unknown[]) => mockGetSocketIdByUsername(...args),
  removeUserFromGame: (...args: unknown[]) => mockRemoveUserFromGame(...args),
  getGameUsers: (...args: unknown[]) => mockGetGameUsers(...args),
  getActiveRooms: (...args: unknown[]) => mockGetActiveRooms(...args),
  clearSocketMappingsForLeave: (...args: unknown[]) => mockClearSocketMappingsForLeave(...args),
}));

const mockSafeEmit = vi.fn();
const mockGetSocketById = vi.fn();
const mockBroadcastToRoom = vi.fn();
const mockBroadcastActiveRooms = vi.fn();
const mockGetGameRoom = vi.fn().mockReturnValue('game:TEST123');
const mockLeaveRoom = vi.fn();

vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => mockBroadcastToRoom(...args),
  broadcastActiveRooms: (...args: unknown[]) => mockBroadcastActiveRooms(...args),
  getGameRoom: (...args: unknown[]) => mockGetGameRoom(...args),
  safeEmit: (...args: unknown[]) => mockSafeEmit(...args),
  getSocketById: (...args: unknown[]) => mockGetSocketById(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
}));

vi.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/gameStartCoordinator.js', () => ({
  default: { handlePlayerDisconnect: vi.fn() },
  __esModule: true,
}));

vi.mock('../../utils/playerCleanup.js', () => ({
  cleanupPlayerData: vi.fn(),
}));

import { checkAfkWarnings } from '../kickHandler';

function createMockIO(): Server {
  return {
    sockets: { sockets: new Map() },
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  } as unknown as Server;
}

describe('AFK Warning', () => {
  const AFK_KICK_MS = 180000; // 3 minutes
  const AFK_WARNING_MS = AFK_KICK_MS - 30000; // 2.5 minutes = warning threshold

  beforeEach(() => {
    vi.resetAllMocks();
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
