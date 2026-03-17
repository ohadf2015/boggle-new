/**
 * Word Handler - Blast Scoring Tests
 * Verifies that blast tile bonuses are included in stored word details
 * so that final score recalculation (scoringEngine) produces correct totals.
 */

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

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
      tier: 'warning', invalidCount: 1, penaltyApplied: 0, cooldownDuration: 0,
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
  getGameRoom: jest.fn().mockImplementation((code: string) => `game:${code}`),
  getSocketById: jest.fn(),
  safeEmit: jest.fn(),
}));

jest.mock('../../../backend/modules/botManager', () => ({}));

jest.mock('../../../backend/services/gracePeriodLock', () => ({
  acquireGracePeriodLock: jest.fn().mockResolvedValue(null),
  releaseGracePeriodLock: jest.fn().mockResolvedValue(undefined),
}));

// Setup blast mode manager mock with controllable tile bonus
jest.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: jest.fn().mockReturnValue(10),
  getTilesOnPath: jest.fn().mockReturnValue(['gold', 'standard']),
  recordBlastMove: jest.fn().mockReturnValue({ movesUsed: 1, bonusMove: false }),
}));

const {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  addPlayerWord,
  updatePlayerScore,
  getFirstFinder,
} = require('../../../backend/modules/gameStateManager');
const { isWordOnBoardAsync } = require('../../../backend/modules/wordValidatorPool');
const { isDictionaryWord } = require('../../../backend/dictionary');
const { isWordCommunityValid, isWordValidForScoring } = require('../../../backend/modules/communityWordManager');

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
    users: { testUser: { isHost: false, socketId: 'socket-test' } },
    blastModeState: {
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 0 },
      playerBonusMoves: { testUser: 0 },
      playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 } },
      seed: 12345,
    },
    ...overrides,
  };
}

describe('wordHandler - Blast tile bonus in stored word details', () => {
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

  it('should include blast tile bonus in addPlayerWord score', (done) => {
    // GIVEN: Blast mode with tile bonus of 10, word score of 5
    // WHEN: Player submits a word
    clientSocket.emit('submitWord', { word: 'test' });

    clientSocket.once('wordAccepted', () => {
      // THEN: addPlayerWord should store score = wordScore(5) + tileBonus(10) = 15
      const addCall = addPlayerWord.mock.calls[0];
      expect(addCall).toBeDefined();
      const options = addCall[3]; // 4th arg is options
      expect(options.score).toBe(15); // 5 (word) + 10 (tile bonus)
      done();
    });
  });

  it('should call updatePlayerScore with word score + tile bonus', (done) => {
    // GIVEN: Blast mode with tile bonus of 10, word score of 5
    // WHEN: Player submits a word
    clientSocket.emit('submitWord', { word: 'test' });

    clientSocket.once('wordAccepted', () => {
      // THEN: updatePlayerScore called with 15 (5 + 10)
      const scoreCall = updatePlayerScore.mock.calls[0];
      expect(scoreCall).toBeDefined();
      expect(scoreCall[2]).toBe(15); // score = wordScore + tileBonus
      expect(scoreCall[3]).toBe(true); // isDelta
      done();
    });
  });
});
