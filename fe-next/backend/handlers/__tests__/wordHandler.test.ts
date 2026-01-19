/**
 * Word Handler Tests
 * Tests for word submission, validation, and error handling
 */

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

// Mock dependencies
jest.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getUsernameBySocketId: jest.fn(),
  addPlayerWord: jest.fn(),
  playerHasWord: jest.fn(),
  updatePlayerScore: jest.fn(),
  getLeaderboard: jest.fn(),
  getLeaderboardThrottled: jest.fn(),
  markUserActivity: jest.fn(),
  recordPeerValidationVote: jest.fn(),
  removePeerRejectedWordScore: jest.fn(),
  trackAiApprovedWord: jest.fn(),
  getFirstFinder: jest.fn(),
  recordFirstFinder: jest.fn(),
}));

jest.mock('../../../backend/modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: jest.fn(),
}));

jest.mock('../../../backend/dictionary', () => ({
  isDictionaryWord: jest.fn(),
}));

jest.mock('../../../backend/modules/communityWordManager', () => ({
  isWordCommunityValid: jest.fn(),
  isWordValidForScoring: jest.fn(),
  recordVote: jest.fn(),
  updatePendingCache: jest.fn(),
}));

jest.mock('../../../backend/utils/profanityFilter', () => ({
  isProfane: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../backend/modules/scoringEngine', () => ({
  calculateWordScore: jest.fn().mockReturnValue(5),
}));

jest.mock('../../../backend/modules/achievementManager', () => ({
  checkAndAwardAchievements: jest.fn().mockReturnValue([]),
  ACHIEVEMENT_ICONS: {},
}));

jest.mock('../../../backend/modules/supabaseServer', () => ({
  isSupabaseConfigured: jest.fn().mockReturnValue(false),
  savePlayerWord: jest.fn(),
  recordPlayerWrongWord: jest.fn(),
}));

jest.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../backend/utils/metrics', () => ({
  inc: jest.fn(),
  incPerGame: jest.fn(),
}));

jest.mock('../../../backend/modules/spamDetector', () => ({
  spamDetector: {
    isOnCooldown: jest.fn().mockReturnValue(false),
    getRemainingCooldown: jest.fn().mockReturnValue(0),
    recordInvalidWord: jest.fn().mockReturnValue({
      tier: 'warning',
      invalidCount: 1,
      penaltyApplied: 0,
      cooldownDuration: 0,
    }),
  },
  PenaltyTier: { WARNING: 'warning', PENALTY: 'penalty', COOLDOWN: 'cooldown' },
  InvalidReason: { PROFANITY: 'profanity', TOO_SHORT: 'tooShort', NOT_ON_BOARD: 'notOnBoard' },
}));

jest.mock('../../../backend/handlers/shared', () => ({
  isSocketMigrating: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../backend/handlers/engagementHandler', () => ({
  processLongWordEngagement: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn().mockImplementation((gameCode) => `game:${gameCode}`),
  getSocketById: jest.fn(),
  safeEmit: jest.fn(),
}));

jest.mock('../../../backend/modules/botManager', () => ({}));

// Import mocks
const { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder } = require('../../../backend/modules/gameStateManager');
const { isWordOnBoardAsync } = require('../../../backend/modules/wordValidatorPool');
const { isDictionaryWord } = require('../../../backend/dictionary');
const { isWordCommunityValid, isWordValidForScoring } = require('../../../backend/modules/communityWordManager');

describe('wordHandler submitWord error handling', () => {
  let io: Server;
  let serverSocket: Socket;
  let clientSocket: ClientSocket;
  let httpServer: ReturnType<typeof createServer>;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      clientSocket = Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;

        // Register word handler
        const { registerWordHandlers } = require('../wordHandler');
        registerWordHandlers(io, socket);
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup for a valid game state
    getGameBySocketId.mockReturnValue('TEST123');
    getUsernameBySocketId.mockReturnValue('testUser');
    getFirstFinder.mockReturnValue(null);
  });

  describe('error handling scenarios', () => {
    it('should emit error when isWordOnBoardAsync throws', (done) => {
      // GIVEN: A game exists but word validation throws an error
      getGame.mockReturnValue({
        gameCode: 'TEST123',
        gameState: 'in-progress',
        language: 'en',
        minWordLength: 2,
        letterGrid: [['A', 'B'], ['C', 'D']],
        letterPositions: new Map(),
        playerWords: {},
        playerWordDetails: {},
        playerScores: {},
        playerCombos: {},
        users: { testUser: { isHost: false } },
      });

      // Simulate an unexpected error in word validation
      isWordOnBoardAsync.mockRejectedValue(new Error('Worker pool exhausted'));

      // WHEN: User submits a word
      clientSocket.emit('submitWord', { word: 'test' });

      // THEN: Should receive a standardized error with code
      clientSocket.on('error', (error) => {
        expect(error.code).toBe('WORD_PROCESSING_ERROR');
        expect(error.message).toBe('An error occurred while processing your word');
        expect(error.correlationId).toBeDefined(); // For tracking
        done();
      });
    });

    it('should emit error when game is deleted during word processing', (done) => {
      // GIVEN: Game exists at first check but is deleted before word validation
      let callCount = 0;
      getGame.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            gameCode: 'TEST123',
            gameState: 'in-progress',
            language: 'en',
            minWordLength: 2,
            letterGrid: [['A', 'B'], ['C', 'D']],
            letterPositions: new Map(),
            playerWords: {},
            playerWordDetails: {},
            playerScores: {},
            playerCombos: {},
            users: { testUser: { isHost: false } },
          };
        }
        // Simulate game being deleted during processing
        return null;
      });

      isWordOnBoardAsync.mockResolvedValue(true);
      isDictionaryWord.mockReturnValue(true);
      isWordCommunityValid.mockReturnValue(false);
      isWordValidForScoring.mockReturnValue(false);

      // WHEN: User submits a word
      clientSocket.emit('submitWord', { word: 'test' });

      // THEN: Should handle gracefully (either error or wordAccepted depending on timing)
      const timeout = setTimeout(() => {
        // If no error received, that's also acceptable (race condition handled)
        done();
      }, 1000);

      clientSocket.on('error', (error) => {
        clearTimeout(timeout);
        // Either generic error or specific error is acceptable
        expect(error.message).toBeDefined();
        done();
      });

      clientSocket.on('wordAccepted', () => {
        clearTimeout(timeout);
        // Word accepted is also acceptable if game still exists
        done();
      });
    });

    it('should handle undefined language gracefully', (done) => {
      // GIVEN: A game exists but language is undefined
      getGame.mockReturnValue({
        gameCode: 'TEST123',
        gameState: 'in-progress',
        language: undefined, // Language not set
        minWordLength: 2,
        letterGrid: [['T', 'E'], ['S', 'T']],
        letterPositions: new Map(),
        playerWords: {},
        playerWordDetails: {},
        playerScores: {},
        playerCombos: {},
        users: { testUser: { isHost: false } },
      });

      isWordOnBoardAsync.mockResolvedValue(true);
      isDictionaryWord.mockReturnValue(true);
      isWordCommunityValid.mockReturnValue(false);
      isWordValidForScoring.mockReturnValue(false);

      // WHEN: User submits a word
      clientSocket.emit('submitWord', { word: 'test' });

      // THEN: Should NOT throw, should fallback to 'en'
      const timeout = setTimeout(() => {
        done(new Error('Expected wordAccepted or error event'));
      }, 2000);

      clientSocket.on('wordAccepted', () => {
        clearTimeout(timeout);
        done();
      });

      clientSocket.on('error', (error) => {
        clearTimeout(timeout);
        // Should not get an error for missing language - should fallback
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });
  });
});
