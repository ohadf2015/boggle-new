/**
 * Player Join Handler - Invite Link Reconnection Tests
 * Tests for bug: authenticated users joining via invite link should use NEW username/avatar,
 * not existing ones from a previous connection to the same game.
 */

import { Server, Socket } from 'socket.io';

// Mock dependencies before imports
const mockGetGame = jest.fn();
const mockGetAuthUserConnection = jest.fn();
const mockGetSocketIdByUsername = jest.fn();
const mockAddUserToGame = jest.fn();
const mockUpdateUserSocketId = jest.fn();
const mockRemoveUserFromGame = jest.fn();
const mockGetGameUsers = jest.fn();
const mockGetActiveRooms = jest.fn();
const mockIsRoomEmpty = jest.fn();
const mockRestoreGameFromRedis = jest.fn();
const mockUpdateHostSocketId = jest.fn();
const mockGetLeaderboard = jest.fn();
const mockGetTournamentIdFromGame = jest.fn();
const mockGetGameSpectators = jest.fn();
const mockAddSpectatorToGame = jest.fn();

jest.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getAuthUserConnection: mockGetAuthUserConnection,
  getSocketIdByUsername: mockGetSocketIdByUsername,
  addUserToGame: mockAddUserToGame,
  updateUserSocketId: mockUpdateUserSocketId,
  removeUserFromGame: mockRemoveUserFromGame,
  getGameUsers: mockGetGameUsers,
  getActiveRooms: mockGetActiveRooms,
  isRoomEmpty: mockIsRoomEmpty,
  restoreGameFromRedis: mockRestoreGameFromRedis,
  updateHostSocketId: mockUpdateHostSocketId,
  getLeaderboard: mockGetLeaderboard,
  getTournamentIdFromGame: mockGetTournamentIdFromGame,
  getGameSpectators: mockGetGameSpectators,
  addSpectatorToGame: mockAddSpectatorToGame,
  upgradeSpectatorToPlayer: jest.fn(),
  deleteGame: jest.fn(),
  transferHost: jest.fn(),
  getNextEligibleHost: jest.fn(),
  clearSocketMappingsForLeave: jest.fn(),
  isSpectator: jest.fn(),
}));

jest.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  broadcastToRoomExceptSender: jest.fn(),
  getGameRoom: jest.fn((code: string) => `game:${code}`),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  safeEmit: jest.fn(),
  getSocketById: jest.fn(),
  disconnectSocket: jest.fn(),
  isSocketMigrating: jest.fn().mockReturnValue(false),
}));

jest.mock('../../utils/errorHandler', () => ({
  emitError: jest.fn(),
  ErrorMessages: { GAME_NOT_FOUND: 'Game not found' },
}));

jest.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/timerManager', () => ({
  clearGameTimer: jest.fn(),
}));

jest.mock('../../modules/botManager', () => ({
  cleanupGameBots: jest.fn(),
}));

jest.mock('../../modules/tournamentManager', () => ({
  addPlayerMidTournament: jest.fn(),
  getTournament: jest.fn(),
  getTournamentStandings: jest.fn(),
}));

jest.mock('../../utils/gameUtils', () => ({
  generateRandomAvatar: jest.fn().mockReturnValue({ color: 'blue', icon: 'cat' }),
}));

jest.mock('../../modules/achievementManager', () => ({
  ACHIEVEMENT_ICONS: {},
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../utils/socketValidation', () => ({
  validatePayload: jest.fn().mockImplementation((_schema, data) => ({ success: true, data })),
  joinGameSchema: {},
  leaveRoomSchema: {},
}));

jest.mock('../../utils/consts', () => ({
  MAX_PLAYERS_PER_ROOM: 8,
}));

jest.mock('../../utils/gameStateMachine', () => ({
  isInProgress: jest.fn().mockReturnValue(false),
  canJoinFreely: jest.fn().mockReturnValue(true),
  shouldSendGameState: jest.fn().mockReturnValue(false),
}));

jest.mock('../../modules/notificationService', () => ({
  notifyPlayerJoined: jest.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import { handleExistingAuthConnectionJoin } from '../playerJoinHandler';

describe('PlayerJoinHandler - Invite Link Bug', () => {
  let mockIo: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      id: 'new-socket-123',
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      data: {},
    };

    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };
  });

  describe('handleExistingAuthConnectionJoin', () => {
    it('should NOT override username when user explicitly joins with new username via invite link', async () => {
      // GIVEN: User previously connected to game with username "אוהד פישר"
      const authUserId = 'auth-user-123';
      const gameCode = 'WSEQ54';
      const existingUsername = 'אוהד פישר';
      const newUsername = 'Fish'; // User wants to join with new username

      // Existing connection for the same game
      mockGetAuthUserConnection.mockReturnValue({
        socketId: 'old-socket-456',
        gameCode: gameCode, // Same game
        username: existingUsername,
        isHost: false,
      });

      // Mock that old socket is NOT connected (user is rejoining fresh via invite link)
      const { getSocketById } = require('../../utils/socketHelpers');
      getSocketById.mockReturnValue(null); // No active old socket

      // WHEN: User joins same game via invite link with new username
      const result = await handleExistingAuthConnectionJoin(
        mockIo as Server,
        mockSocket as Socket,
        authUserId,
        gameCode,
        newUsername
      );

      // THEN: Should NOT return existingUsername - user's new username choice should be respected
      // The bug: currently returns { handled: true, existingUsername: 'אוהד פישר' }
      // Expected: should allow user to use their new username 'Fish'
      expect(result.existingUsername).toBeUndefined();
      // OR if handled is true, existingUsername should be undefined to allow new username
      if (result.handled) {
        expect(result.existingUsername).toBeUndefined();
      }
    });

    it('should override username when user has active session in another tab (multi-tab detection)', async () => {
      // GIVEN: User has active session in another tab
      const authUserId = 'auth-user-123';
      const gameCode = 'WSEQ54';
      const existingUsername = 'אוהד פישר';
      const attemptedUsername = 'Fish';

      mockGetAuthUserConnection.mockReturnValue({
        socketId: 'old-socket-456',
        gameCode: gameCode, // Same game
        username: existingUsername,
        isHost: false,
      });

      // Mock that old socket IS connected (active multi-tab scenario)
      const mockOldSocket = {
        connected: true,
        data: {},
        emit: jest.fn(),
      };
      const { getSocketById } = require('../../utils/socketHelpers');
      getSocketById.mockReturnValue(mockOldSocket);

      // WHEN: User opens another tab with same game
      const result = await handleExistingAuthConnectionJoin(
        mockIo as Server,
        mockSocket as Socket,
        authUserId,
        gameCode,
        attemptedUsername
      );

      // THEN: Should use existing username (prevent duplicates in active session takeover)
      expect(result.handled).toBe(true);
      expect(result.existingUsername).toBe(existingUsername);
    });
  });
});
