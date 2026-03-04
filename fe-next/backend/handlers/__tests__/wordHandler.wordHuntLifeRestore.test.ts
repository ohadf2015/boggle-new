/**
 * TDD RED: wordHandler should broadcast wordHuntLifeUpdate after restoreLife
 *
 * Bug: restoreLife() is called but no wordHuntLifeUpdate event is emitted,
 * so clients see stale life values for up to 1 second (until next timer tick).
 */

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

// Mock dependencies before imports
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
  getGameRoom: jest.fn().mockImplementation((gc: string) => `game:${gc}`),
  getSocketById: jest.fn(),
  safeEmit: jest.fn(),
  isSocketMigrating: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../backend/modules/botManager', () => ({}));

jest.mock('../../../backend/modules/wordHuntManager', () => ({
  restoreLife: jest.fn().mockReturnValue(85),
  getLifeBonus: jest.fn().mockReturnValue(5),
}));

jest.mock('../../../backend/utils/logger', () => {
  const loggerMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), log: jest.fn() };
  return { __esModule: true, default: loggerMock };
});

const { getGame, getGameBySocketId, getUsernameBySocketId } = require('../../../backend/modules/gameStateManager');
const { isWordOnBoardAsync } = require('../../../backend/modules/wordValidatorPool');
const { broadcastToRoom } = require('../../../backend/utils/socketHelpers');

describe('wordHandler word-hunt life restore broadcast', () => {
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
    getGameBySocketId.mockReturnValue('HUNT01');
    getUsernameBySocketId.mockReturnValue('alice');
  });

  it('should broadcast wordHuntLifeUpdate immediately after restoreLife on accepted word', (done) => {
    // GIVEN: word-hunt game with wordHuntState
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 80, bob: 90 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    getGame.mockReturnValue({
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
      wordHuntState: huntState,
    });

    isWordOnBoardAsync.mockResolvedValue(true);

    // WHEN: player submits a valid word
    clientSocket.emit('submitWord', { word: 'cat' });

    // THEN: wordHuntLifeUpdate should be broadcast with updated lives
    setTimeout(() => {
      const lifeCalls = broadcastToRoom.mock.calls.filter(
        (call: any[]) => call[2] === 'wordHuntLifeUpdate'
      );
      expect(lifeCalls.length).toBeGreaterThanOrEqual(1);
      expect(lifeCalls[0][3]).toEqual(
        expect.objectContaining({
          playerLives: expect.any(Object),
        })
      );
      done();
    }, 200);
  });
});
