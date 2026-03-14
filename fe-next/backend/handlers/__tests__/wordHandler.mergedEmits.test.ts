/**
 * wordHandler - merged blast emits tests (Fix 2)
 * TDD: RED phase
 *
 * After the fix:
 * - wordAccepted payload includes optional `blast` field (when gameMode=blast)
 * - playerFoundWord broadcast includes optional `comboSync` field (when comboType present)
 * - NO separate blastWordAccepted emit
 * - NO separate blastComboSync broadcast
 */

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';

// Mock all dependencies (same as wordHandler.blast.test.ts)
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

jest.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: jest.fn().mockReturnValue(10),
  getTilesOnPath: jest.fn().mockReturnValue(['bomb', 'gold']),
  recordBlastMove: jest.fn().mockReturnValue({ movesUsed: 4, bonusMove: true }),
}));

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

function makeBlastGame(overrides = {}) {
  return {
    gameCode: 'MERGE1',
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
    users: { testUser: { isHost: false, socketId: 'socket-merge-test' } },
    blastModeState: {
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 3 },
      playerBonusMoves: { testUser: 0 },
      playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0 } },
      seed: 12345,
    },
    ...overrides,
  };
}

describe('wordHandler - merged blast emits (Fix 2)', () => {
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
    getGameBySocketId.mockReturnValue('MERGE1');
    getUsernameBySocketId.mockReturnValue('testUser');
    getFirstFinder.mockReturnValue(null);
    getGame.mockReturnValue(makeBlastGame());
    isWordOnBoardAsync.mockResolvedValue(true);
    isDictionaryWord.mockReturnValue(true);
    isWordCommunityValid.mockReturnValue(false);
    isWordValidForScoring.mockReturnValue(false);
  });

  describe('wordAccepted includes blast field when in blast mode', () => {
    it('should include blast field in wordAccepted payload when gameMode is blast', (done) => {
      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_gold' });

      const timeout = setTimeout(() => {
        done(new Error('Timeout waiting for wordAccepted'));
      }, 2000);

      clientSocket.once('wordAccepted', (data: any) => {
        clearTimeout(timeout);
        try {
          expect(data.blast).toBeDefined();
          expect(data.blast.tilesCleared).toBeDefined();
          expect(data.blast.movesUsed).toBeDefined();
          expect(data.blast.bonusMove).toBeDefined();
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should NOT include blast field in wordAccepted when gameMode is classic', (done) => {
      getGame.mockReturnValue(makeBlastGame({ gameMode: 'classic', blastModeState: null }));
      clientSocket.emit('submitWord', { word: 'test' });

      const timeout = setTimeout(() => {
        done(new Error('Timeout waiting for wordAccepted'));
      }, 2000);

      clientSocket.once('wordAccepted', (data: any) => {
        clearTimeout(timeout);
        try {
          expect(data.blast).toBeUndefined();
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should NOT emit separate blastWordAccepted event', (done) => {
      let blastWordAcceptedReceived = false;
      clientSocket.on('blastWordAccepted', () => {
        blastWordAcceptedReceived = true;
      });

      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_gold' });

      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          expect(blastWordAcceptedReceived).toBe(false);
          clientSocket.off('blastWordAccepted');
          done();
        }, 200);
      });
    });
  });

  describe('playerFoundWord includes comboSync field when comboType present', () => {
    it('should include comboSync in playerFoundWord payload when comboType is provided', (done) => {
      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_bomb' });

      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const foundWordCall = calls.find((call: any[]) => call[2] === 'playerFoundWord');
          expect(foundWordCall).toBeDefined();
          const payload = foundWordCall[3];
          expect(payload.comboSync).toBeDefined();
          expect(payload.comboSync.comboType).toBe('bomb_bomb');
          expect(payload.comboSync.username).toBe('testUser');
          done();
        }, 150);
      });
    });

    it('should NOT include comboSync in playerFoundWord when comboType is absent', (done) => {
      clientSocket.emit('submitWord', { word: 'test' });

      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const foundWordCall = calls.find((call: any[]) => call[2] === 'playerFoundWord');
          expect(foundWordCall).toBeDefined();
          const payload = foundWordCall[3];
          expect(payload.comboSync).toBeUndefined();
          done();
        }, 150);
      });
    });

    it('should NOT emit separate blastComboSync broadcast', (done) => {
      clientSocket.emit('submitWord', { word: 'test', comboType: 'bomb_bomb' });

      clientSocket.once('wordAccepted', () => {
        setTimeout(() => {
          const calls = broadcastToRoom.mock.calls;
          const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
          expect(comboSyncCall).toBeUndefined();
          done();
        }, 150);
      });
    });
  });
});
