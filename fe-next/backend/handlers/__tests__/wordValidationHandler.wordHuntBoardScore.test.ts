/**
 * TDD RED: wordValidationHandler should award BOARD_WORD_SCORE_PER_LETTER
 * extra points per letter when a board word is found in word-hunt mode.
 *
 * This ensures non-target board words contribute meaningfully to score,
 * decoupling life-gain from score-gain so vocabulary skill is rewarded.
 */

jest.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getUsernameBySocketId: jest.fn(),
  addPlayerWord: jest.fn(),
  playerHasWord: jest.fn().mockReturnValue(false),
  updatePlayerScore: jest.fn(),
  getLeaderboard: jest.fn().mockReturnValue([]),
  getLeaderboardThrottled: jest.fn().mockReturnValue([]),
  markUserActivity: jest.fn(),
  recordPeerValidationVote: jest.fn(),
  removePeerRejectedWordScore: jest.fn(),
  trackAiApprovedWord: jest.fn(),
  getFirstFinder: jest.fn().mockReturnValue(null),
  recordFirstFinder: jest.fn(),
}));

jest.mock('../../../backend/modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: jest.fn(),
}));

jest.mock('../../../backend/dictionary', () => ({
  isDictionaryWord: jest.fn().mockReturnValue(true),
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
  calculateWordScore: jest.fn().mockReturnValue(3),
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
  getGameRoom: jest.fn().mockImplementation((gc: string) => `game:${gc}`),
  getSocketById: jest.fn(),
  safeEmit: jest.fn(),
  isSocketMigrating: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../backend/modules/botManager', () => ({}));

jest.mock('../../../backend/modules/wordHuntManager', () => ({
  restoreLife: jest.fn().mockReturnValue(85),
  getLifeBonus: jest.fn().mockReturnValue(5),
  computeDiscoveryClues: jest.fn().mockReturnValue({ greenPositions: [], knownLetters: [] }),
}));

jest.mock('../../../backend/utils/logger', () => {
  const loggerMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), log: jest.fn() };
  return { __esModule: true, default: loggerMock };
});

jest.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: jest.fn().mockReturnValue(0),
  getTilesOnPath: jest.fn().mockReturnValue([]),
  recordBlastMove: jest.fn().mockReturnValue(null),
}));

const { getGame, getGameBySocketId, getUsernameBySocketId, updatePlayerScore } =
  require('../../../backend/modules/gameStateManager');
const { isWordOnBoardAsync } = require('../../../backend/modules/wordValidatorPool');
const { calculateWordScore } = require('../../../backend/modules/scoringEngine');

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';

function makeWordHuntGame() {
  return {
    gameCode: 'HUNT01',
    gameState: 'in-progress',
    gameMode: 'word-hunt',
    language: 'en',
    minWordLength: 2,
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['X', 'Y', 'Z']],
    letterPositions: new Map(),
    playerWords: {},
    playerScores: {},
    users: {},
    wordHuntState: {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 80, bob: 90 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    },
  };
}

describe('wordValidationHandler - word-hunt board word score bonus', () => {
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

  afterAll((done) => {
    clientSocket.close();
    io.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getGameBySocketId.mockReturnValue('HUNT01');
    getUsernameBySocketId.mockReturnValue('alice');
  });

  it('exports BOARD_WORD_SCORE_PER_LETTER constant with value 2', () => {
    expect(BOARD_WORD_SCORE_PER_LETTER).toBe(2);
  });

  it('should award word.length * BOARD_WORD_SCORE_PER_LETTER extra score in word-hunt mode', (done) => {
    // GIVEN: word-hunt game, word "cat" (3 letters), calculateWordScore returns 3
    getGame.mockReturnValue(makeWordHuntGame());
    isWordOnBoardAsync.mockResolvedValue(true);
    calculateWordScore.mockReturnValue(3);

    // Expected total: base score (3) + board word bonus (3 * 2 = 6) = 9
    const expectedTotal = 3 + 3 * BOARD_WORD_SCORE_PER_LETTER;

    // WHEN: player submits a valid board word
    clientSocket.emit('submitWord', { word: 'cat' });

    // THEN: updatePlayerScore called with total including board word bonus
    setTimeout(() => {
      const scoreCalls = updatePlayerScore.mock.calls;
      expect(scoreCalls.length).toBeGreaterThanOrEqual(1);
      const lastCall = scoreCalls[scoreCalls.length - 1];
      // Called with (gameCode, username, totalScore, additive)
      expect(lastCall[2]).toBe(expectedTotal);
      done();
    }, 300);
  });

  it('should NOT award board word bonus in non-word-hunt modes', (done) => {
    // GIVEN: classic game (not word-hunt)
    const classicGame = {
      ...makeWordHuntGame(),
      gameMode: 'classic',
      wordHuntState: undefined,
    };
    getGame.mockReturnValue(classicGame);
    isWordOnBoardAsync.mockResolvedValue(true);
    calculateWordScore.mockReturnValue(3);

    clientSocket.emit('submitWord', { word: 'cat' });

    setTimeout(() => {
      const scoreCalls = updatePlayerScore.mock.calls;
      expect(scoreCalls.length).toBeGreaterThanOrEqual(1);
      const lastCall = scoreCalls[scoreCalls.length - 1];
      // Should only be base score (3), no bonus
      expect(lastCall[2]).toBe(3);
      done();
    }, 300);
  });

  it('should award larger bonus for longer words in word-hunt mode', (done) => {
    // GIVEN: word-hunt game, word "stone" (5 letters), calculateWordScore returns 4
    getGame.mockReturnValue(makeWordHuntGame());
    isWordOnBoardAsync.mockResolvedValue(true);
    calculateWordScore.mockReturnValue(4);

    // Expected: base (4) + bonus (5 * 2 = 10) = 14
    const expectedTotal = 4 + 5 * BOARD_WORD_SCORE_PER_LETTER;

    clientSocket.emit('submitWord', { word: 'stone' });

    setTimeout(() => {
      const scoreCalls = updatePlayerScore.mock.calls;
      expect(scoreCalls.length).toBeGreaterThanOrEqual(1);
      const lastCall = scoreCalls[scoreCalls.length - 1];
      expect(lastCall[2]).toBe(expectedTotal);
      done();
    }, 300);
  });
});
