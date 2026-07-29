/**
 * Player Join Handler - Invite Link Reconnection Tests
 * Tests for bug: authenticated users joining via invite link should use NEW username/avatar,
 * not existing ones from a previous connection to the same game.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { Server, Socket } from 'socket.io';

// Mock dependencies before imports
const { mockGetGame, mockGetAuthUserConnection, mockGetSocketIdByUsername, mockAddUserToGame, mockUpdateUserSocketId, mockRemoveUserFromGame, mockGetGameUsers, mockGetActiveRooms, mockIsRoomEmpty, mockRestoreGameFromRedis, mockUpdateHostSocketId, mockGetLeaderboard, mockGetTournamentIdFromGame, mockGetGameSpectators, mockAddSpectatorToGame, mockGetSocketById } = vi.hoisted(() => {
  const mockGetGame = vi.fn();
  const mockGetAuthUserConnection = vi.fn();
  const mockGetSocketIdByUsername = vi.fn();
  const mockAddUserToGame = vi.fn();
  const mockUpdateUserSocketId = vi.fn();
  const mockRemoveUserFromGame = vi.fn();
  const mockGetGameUsers = vi.fn();
  const mockGetActiveRooms = vi.fn();
  const mockIsRoomEmpty = vi.fn();
  const mockRestoreGameFromRedis = vi.fn();
  const mockUpdateHostSocketId = vi.fn();
  const mockGetLeaderboard = vi.fn();
  const mockGetTournamentIdFromGame = vi.fn();
  const mockGetGameSpectators = vi.fn();
  const mockAddSpectatorToGame = vi.fn();
  const mockGetSocketById = vi.fn();
  return { mockGetGame, mockGetAuthUserConnection, mockGetSocketIdByUsername, mockAddUserToGame, mockUpdateUserSocketId, mockRemoveUserFromGame, mockGetGameUsers, mockGetActiveRooms, mockIsRoomEmpty, mockRestoreGameFromRedis, mockUpdateHostSocketId, mockGetLeaderboard, mockGetTournamentIdFromGame, mockGetGameSpectators, mockAddSpectatorToGame, mockGetSocketById };
});

vi.mock('../../modules/gameStateManager', () => ({
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
  upgradeSpectatorToPlayer: vi.fn(),
  deleteGame: vi.fn(),
  transferHost: vi.fn(),
  getNextEligibleHost: vi.fn(),
  clearSocketMappingsForLeave: vi.fn(),
  isSpectator: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  safeEmit: vi.fn(),
  getSocketById: mockGetSocketById,
  disconnectSocket: vi.fn(),
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../../utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errorHandler')>('../../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});

vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../../utils/timerManager', () => ({ default: {
  clearGameTimer: vi.fn(),
}, clearGameTimer: vi.fn() }));

vi.mock('../../modules/botManager', () => ({
  cleanupGameBots: vi.fn(),
}));

vi.mock('../../modules/tournamentManager', () => ({
  addPlayerMidTournament: vi.fn(),
  getTournament: vi.fn(),
  getTournamentStandings: vi.fn(),
}));

vi.mock('../../utils/gameUtils', () => ({
  generateRandomAvatar: vi.fn().mockReturnValue({ color: 'blue', icon: 'cat' }),
}));

vi.mock('../../modules/achievementManager', () => ({
  ACHIEVEMENT_ICONS: {},
}));

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema, data) => ({ success: true, data })),
  joinGameSchema: {},
  leaveRoomSchema: {},
}));

vi.mock('../../utils/consts', () => ({
  MAX_PLAYERS_PER_ROOM: 8,
}));

vi.mock('../../utils/gameStateMachine', () => ({
  isInProgress: vi.fn().mockReturnValue(false),
  canJoinFreely: vi.fn().mockReturnValue(true),
  shouldSendGameState: vi.fn().mockReturnValue(false),
}));

vi.mock('../../modules/notificationService', () => ({
  notifyPlayerJoined: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(),
  getWordScore: vi.fn(),
  voteOnWord: vi.fn(),
}));

vi.mock('../../modules/communityWordHybridValidation', () => ({
  setPendingVotesRef: vi.fn(),
  shouldUseAIValidation: vi.fn(),
  SELF_HEALING_CONFIG: {},
}));

// Import after mocks
import { handleExistingAuthConnectionJoin } from '../playerJoinHandler';

describe('PlayerJoinHandler - Invite Link Bug', () => {
  let mockIo: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      id: 'new-socket-123',
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      data: {},
    };

    mockIo = {
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
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
      mockGetSocketById.mockReturnValue(null); // No active old socket

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
        emit: vi.fn(),
      };
      mockGetSocketById.mockReturnValue(mockOldSocket);

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
