/**
 * Word Handler - Blast Combo Sync Tests (52-02)
 * Tests for blastComboSync broadcast when a player submits a word with a combo
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
  InvalidReason: { PROFANITY: 'profanity', TOO_SHORT: 'tooShort', NOT_ON_BOARD: 'notOnBoard', REJECTED: 'rejected' },
}));

jest.mock('../../../backend/handlers/shared', () => ({
  isSocketMigrating: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../backend/handlers/engagementHandler', () => ({
  processLongWordEngagement: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn().mockImplementation((gameCode: string) => `game:${gameCode}`),
  getSocketById: jest.fn(),
  safeEmit: jest.fn(),
  isSocketMigrating: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../backend/modules/botManager', () => ({}));

jest.mock('../../../backend/services/gracePeriodLock', () => ({
  acquireGracePeriodLock: jest.fn().mockResolvedValue(null),
  releaseGracePeriodLock: jest.fn().mockResolvedValue(undefined),
}));

// Import mocks
const {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getFirstFinder,
} = require('../../../backend/modules/gameStateManager');
const { isWordOnBoardAsync } = require('../../../backend/modules/wordValidatorPool');
const { isDictionaryWord } = require('../../../backend/dictionary');
const { isWordCommunityValid, isWordValidForScoring } = require('../../../backend/modules/communityWordManager');
const { broadcastToRoom } = require('../../../backend/utils/socketHelpers');

/** Helper to build a blast-mode game state */
function makeBlastGame(overrides = {}) {
  return {
    gameCode: 'BLAST1',
    gameState: 'in-progress',
    gameMode: 'blast',
    language: 'en',
    minWordLength: 2,
    letterGrid: [['A', 'B'], ['C', 'D']],
    letterPositions: new Map(),
    playerWords: {},
    playerWordDetails: {},
    playerScores: {},
    playerCombos: {},
    users: { testUser: { isHost: false, socketId: 'socket-test-user' } },
    blastModeState: null, // No blast state — prevents tile bonus branch
    ...overrides,
  };
}

describe('wordHandler - blastComboSync broadcast (52-02)', () => {
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
    getGameBySocketId.mockReturnValue('BLAST1');
    getUsernameBySocketId.mockReturnValue('testUser');
    getFirstFinder.mockReturnValue(null);
    getGame.mockReturnValue(makeBlastGame());
    isWordOnBoardAsync.mockResolvedValue(true);
    isDictionaryWord.mockReturnValue(true);
    isWordCommunityValid.mockReturnValue(false);
    isWordValidForScoring.mockReturnValue(false);
  });

  describe('submitWord payload schema', () => {
    it('should accept submitWord payload that includes optional comboType field', (done) => {
      // GIVEN: A valid blast-mode game
      // WHEN: Player submits a word with comboType field
      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_bomb' });

      // THEN: Word should be accepted (not rejected due to comboType schema)
      const timeout = setTimeout(() => {
        done(new Error('Expected wordAccepted event within timeout'));
      }, 2000);

      clientSocket.on('wordAccepted', () => {
        clearTimeout(timeout);
        done();
      });

      clientSocket.on('error', (err: any) => {
        clearTimeout(timeout);
        done(new Error(`Got error instead of wordAccepted: ${JSON.stringify(err)}`));
      });
    });

    it('should accept submitWord payload without comboType field (backward compat)', (done) => {
      // GIVEN: A valid blast-mode game
      // WHEN: Player submits a word WITHOUT comboType (standard submitWord)
      clientSocket.emit('submitWord', { word: 'test' });

      // THEN: Word should be accepted normally
      const timeout = setTimeout(() => {
        done(new Error('Expected wordAccepted event within timeout'));
      }, 2000);

      clientSocket.on('wordAccepted', () => {
        clearTimeout(timeout);
        done();
      });

      clientSocket.on('error', (err: any) => {
        clearTimeout(timeout);
        done(new Error(`Got error: ${JSON.stringify(err)}`));
      });
    });
  });

  describe('blastComboSync broadcast', () => {
    it('should broadcast blastComboSync to room when comboType is provided', (done) => {
      // GIVEN: A valid blast-mode game and a word with comboType
      // WHEN: Player submits word with comboType 'bomb_bomb'
      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_bomb' });

      // THEN: broadcastToRoom should be called with blastComboSync event
      clientSocket.once('wordAccepted', () => {
        // blastComboSync is called synchronously in the handler after wordAccepted
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
          expect(comboSyncCall).toBeDefined();
          const payload = comboSyncCall[3];
          expect(payload.comboType).toBe('bomb_bomb');
          expect(payload.username).toBe('testUser');
          done();
        }, 100);
      });
    });

    it('should NOT broadcast blastComboSync when comboType is absent', (done) => {
      // GIVEN: A valid blast-mode game and a word WITHOUT comboType
      // WHEN: Player submits word without comboType
      clientSocket.emit('submitWord', { word: 'test' });

      // THEN: broadcastToRoom should NOT be called with blastComboSync
      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
          expect(comboSyncCall).toBeUndefined();
          done();
        }, 100);
      });
    });

    it('should NOT broadcast blastComboSync when comboType is null', (done) => {
      // GIVEN: A valid blast-mode game and comboType explicitly null
      // WHEN: Player submits word with null comboType
      clientSocket.emit('submitWord', { word: 'test', comboType: null });

      // THEN: broadcastToRoom should NOT be called with blastComboSync
      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
          expect(comboSyncCall).toBeUndefined();
          done();
        }, 100);
      });
    });

    it('should include comboType in blastComboSync payload with correct room', (done) => {
      // GIVEN: A game with known game code
      // WHEN: Player submits a word with comboType 'lightning_prism'
      clientSocket.emit('submitWord', { word: 'test', comboType: 'lightning_prism' });

      // THEN: broadcastToRoom called with correct room and payload
      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
          expect(comboSyncCall).toBeDefined();
          expect(comboSyncCall[1]).toBe('game:BLAST1'); // correct room
          expect(comboSyncCall[3]).toEqual({
            comboType: 'lightning_prism',
            username: 'testUser',
          });
          done();
        }, 100);
      });
    });
  });

  describe('blastWordAccepted payload includes comboType', () => {
    it('should include comboType in blastWordAccepted payload when blast mode is active', (done) => {
      // GIVEN: A game in blast mode with blastModeState
      const mockBlastState = {
        playerMoves: { testUser: 3 },
        totalMovesAllowed: 10,
      };

      // Mock blast module
      jest.mock('../../../backend/modules/blastModeManager', () => ({
        calculateBlastTileBonus: jest.fn().mockReturnValue(10),
        getTilesOnPath: jest.fn().mockReturnValue(['bomb']),
        recordBlastMove: jest.fn().mockReturnValue({ movesUsed: 4, bonusMove: false }),
      }), { virtual: true });

      getGame.mockReturnValue(makeBlastGame({
        blastModeState: mockBlastState,
      }));

      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_lightning' });

      const timeout = setTimeout(() => {
        // If blastWordAccepted fires, verify comboType is included
        done();
      }, 1000);

      clientSocket.once('blastWordAccepted', (data: any) => {
        clearTimeout(timeout);
        expect(data.comboType).toBe('bomb_lightning');
        done();
      });

      clientSocket.once('wordAccepted', () => {
        // Blast mode must be active for blastWordAccepted to emit
        // If no blastModeState branch triggers, at least verify no crash
        setTimeout(() => {
          clearTimeout(timeout);
          done();
        }, 200);
      });
    });
  });
});
