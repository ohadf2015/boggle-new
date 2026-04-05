/**
 * Test: Auth User Stats Recording
 *
 * Verifies that authenticated user's authUserId is preserved during
 * reconnection and properly passed to stats recording.
 *
 * Bug context: authUserId was being cleared when players reconnected
 * without explicitly passing auth data, causing stats to not be recorded
 * for authenticated users.
 */

// Use require to access CommonJS exports including internal maps
import { vi, type Mock, type MockInstance } from 'vitest';
import {
  addUserToGame,
  removeUserFromGame,
  getUserBySocketId,
  updateUserSocketId,
  _socketToGame,
  _socketToUsername,
  _usernameToSocket,
  _authUserConnections,
  getAuthUserConnection,
} from '../modules/userManager';
// Mock logger
vi.mock('../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

interface GameBase {
  users: Record<string, any>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;
  playerAchievements: Record<string, any[]>;
  lastActivity: number;
  gameCode?: string;
}

describe('Auth User Stats Recording', () => {
  // Create a mock game object
  const createMockGame = (): GameBase => ({
    users: {},
    playerScores: {},
    playerWords: {},
    playerAchievements: {},
    lastActivity: Date.now(),
    gameCode: 'TEST123',
  });

  beforeEach(() => {
    // Clear any existing mappings between tests
    _socketToGame.clear();
    _socketToUsername.clear();
    _usernameToSocket.clear();
    _authUserConnections.clear();
  });

  describe('addUserToGame', () => {
    it('should store authUserId when adding authenticated user', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'testuser';
      const socketId = 'socket-123';
      const authUserId = 'auth-user-uuid';

      addUserToGame(game, gameCode, username, socketId, {
        authUserId,
        guestTokenHash: null,
      });

      expect(game.users[username]).toBeDefined();
      expect(game.users[username].authUserId).toBe(authUserId);
    });

    it('should store guestTokenHash when adding guest user', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'guestuser';
      const socketId = 'socket-456';
      const guestTokenHash = 'guest-token-hash';

      addUserToGame(game, gameCode, username, socketId, {
        authUserId: null,
        guestTokenHash,
      });

      expect(game.users[username]).toBeDefined();
      expect(game.users[username].authUserId).toBeNull();
      expect(game.users[username].guestTokenHash).toBe(guestTokenHash);
    });
  });

  describe('updateUserSocketId - auth context preservation', () => {
    it('should preserve existing authUserId when reconnecting without auth data', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'testuser';
      const originalSocketId = 'socket-original';
      const newSocketId = 'socket-reconnect';
      const authUserId = 'auth-user-uuid';

      // First, add user with authUserId
      addUserToGame(game, gameCode, username, originalSocketId, {
        authUserId,
        guestTokenHash: null,
      });

      // Verify authUserId is stored
      expect(game.users[username].authUserId).toBe(authUserId);

      // Now simulate reconnection WITHOUT auth context (undefined values)
      // This was the bug: authContext with null values would clear the authUserId
      updateUserSocketId(game, gameCode, username, newSocketId, {
        authUserId: undefined,
        guestTokenHash: undefined,
      });

      // CRITICAL: authUserId should still be preserved
      expect(game.users[username].authUserId).toBe(authUserId);
      expect(game.users[username].socketId).toBe(newSocketId);
    });

    it('should preserve existing authUserId when reconnecting with null auth context', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'testuser';
      const originalSocketId = 'socket-original';
      const newSocketId = 'socket-reconnect';
      const authUserId = 'auth-user-uuid';

      // Add user with authUserId
      addUserToGame(game, gameCode, username, originalSocketId, {
        authUserId,
        guestTokenHash: null,
      });

      // Simulate reconnection with null auth context
      // This was the exact bug pattern
      updateUserSocketId(game, gameCode, username, newSocketId, {
        authUserId: null,
        guestTokenHash: null,
      });

      // CRITICAL: authUserId should still be preserved
      expect(game.users[username].authUserId).toBe(authUserId);
    });

    it('should update authUserId when reconnecting with new auth data', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'testuser';
      const originalSocketId = 'socket-original';
      const newSocketId = 'socket-reconnect';
      const originalAuthUserId = 'original-auth-uuid';
      const newAuthUserId = 'new-auth-uuid';

      // Add user with original authUserId
      addUserToGame(game, gameCode, username, originalSocketId, {
        authUserId: originalAuthUserId,
        guestTokenHash: null,
      });

      // Reconnect with NEW auth data (legitimate auth update)
      updateUserSocketId(game, gameCode, username, newSocketId, {
        authUserId: newAuthUserId,
        guestTokenHash: null,
      });

      // Should update to new authUserId
      expect(game.users[username].authUserId).toBe(newAuthUserId);
    });

    it('should preserve guest token when reconnecting without new guest data', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'guestuser';
      const originalSocketId = 'socket-original';
      const newSocketId = 'socket-reconnect';
      const guestTokenHash = 'original-guest-hash';

      // Add guest user
      addUserToGame(game, gameCode, username, originalSocketId, {
        authUserId: null,
        guestTokenHash,
      });

      // Reconnect without guest token
      updateUserSocketId(game, gameCode, username, newSocketId, {
        authUserId: null,
        guestTokenHash: null,
      });

      // Guest token should be preserved
      expect(game.users[username].guestTokenHash).toBe(guestTokenHash);
    });
  });

  describe('getUserBySocketId - auth data retrieval', () => {
    it('should return authUserId when retrieving user by socket', () => {
      const game = createMockGame();
      const games = { TEST123: game };
      const gameCode = 'TEST123';
      const username = 'testuser';
      const socketId = 'socket-123';
      const authUserId = 'auth-user-uuid';

      addUserToGame(game, gameCode, username, socketId, {
        authUserId,
        guestTokenHash: null,
      });

      const userInfo = getUserBySocketId(games, socketId);

      expect(userInfo).toBeDefined();
      expect(userInfo?.authUserId).toBe(authUserId);
      expect(userInfo?.username).toBe(username);
    });
  });

  describe('Auth user connection tracking', () => {
    it('should track authenticated user connection globally', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'testuser';
      const socketId = 'socket-123';
      const authUserId = 'auth-user-uuid';

      addUserToGame(game, gameCode, username, socketId, {
        authUserId,
        guestTokenHash: null,
      });

      const connection = getAuthUserConnection(authUserId);

      expect(connection).toBeDefined();
      expect(connection?.gameCode).toBe(gameCode);
      expect(connection?.username).toBe(username);
      expect(connection?.socketId).toBe(socketId);
    });

    it('should update connection tracking on reconnection', () => {
      const game = createMockGame();
      const gameCode = 'TEST123';
      const username = 'testuser';
      const originalSocketId = 'socket-original';
      const newSocketId = 'socket-reconnect';
      const authUserId = 'auth-user-uuid';

      // Add user
      addUserToGame(game, gameCode, username, originalSocketId, {
        authUserId,
        guestTokenHash: null,
      });

      // Reconnect (even without passing authUserId)
      updateUserSocketId(game, gameCode, username, newSocketId, {
        authUserId: undefined,
        guestTokenHash: undefined,
      });

      const connection = getAuthUserConnection(authUserId);

      // Connection should be updated with new socket
      expect(connection).toBeDefined();
      expect(connection?.socketId).toBe(newSocketId);
    });
  });
});
