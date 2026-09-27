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

import { vi, type Mock } from 'vitest';

// Mock all dependencies (same as wordHandler.blast.test.ts)
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  addPlayerWord: vi.fn(),
  playerHasWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  getLeaderboard: vi.fn(),
  getLeaderboardThrottled: vi.fn(),
  markUserActivity: vi.fn(),
  recordPeerValidationVote: vi.fn(),
  removePeerRejectedWordScore: vi.fn(),
  trackAiApprovedWord: vi.fn(),
  getFirstFinder: vi.fn(),
  recordFirstFinder: vi.fn(),
}));

vi.mock('../../../backend/modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: vi.fn(),
}));

vi.mock('../../../backend/dictionary', () => ({
  isDictionaryWord: vi.fn(),
  isValidWordCached: vi.fn(),
}));

vi.mock('../../../backend/modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(),
  isWordValidForScoring: vi.fn(),
  recordVote: vi.fn(),
  updatePendingCache: vi.fn(),
}));

vi.mock('../../../backend/utils/profanityFilter', () => ({
  isProfane: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../backend/modules/scoringEngine', () => ({
  calculateWordScore: vi.fn().mockReturnValue(5),
}));

vi.mock('../../../backend/modules/achievementManager', () => ({
  checkAndAwardAchievements: vi.fn().mockReturnValue([]),
  ACHIEVEMENT_ICONS: {},
}));

vi.mock('../../../backend/modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
  savePlayerWord: vi.fn(),
  recordPlayerWrongWord: vi.fn(),
}));

vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../../../backend/middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('../../../backend/utils/metrics', () => ({
  inc: vi.fn(),
  incPerGame: vi.fn(),
}));

vi.mock('../../../backend/modules/spamDetector', () => ({
  spamDetector: {
    isOnCooldown: vi.fn().mockReturnValue(false),
    getRemainingCooldown: vi.fn().mockReturnValue(0),
    recordInvalidWord: vi.fn().mockReturnValue({
      tier: 'warning',
      invalidCount: 1,
      penaltyApplied: 0,
      cooldownDuration: 0,
    }),
  },
  PenaltyTier: { WARNING: 'warning', PENALTY: 'penalty', COOLDOWN: 'cooldown' },
  InvalidReason: { PROFANITY: 'profanity', TOO_SHORT: 'tooShort', NOT_ON_BOARD: 'notOnBoard', REJECTED: 'rejected' },
}));

vi.mock('../../../backend/handlers/shared', () => ({
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../backend/handlers/engagementHandler', () => ({
  processLongWordEngagement: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../backend/utils/playerFoundWordBatcher', () => ({
  queuePlayerFoundWord: vi.fn(),
  clearPlayerFoundWords: vi.fn(),
}));
vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockImplementation((gameCode: string) => `game:${gameCode}`),
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../backend/modules/botManager', () => ({ isBot: vi.fn(() => false), stopAllBots: vi.fn(), cleanupGameBots: vi.fn(), getGameBots: vi.fn(() => []), getBotByUsername: vi.fn(), addBot: vi.fn(), removeBot: vi.fn(), resetBotCombo: vi.fn(), addWordToBlacklist: vi.fn() }));

vi.mock('../../../backend/utils/errorHandler', () => ({
  emitError: vi.fn(),
  ErrorCodes: { WORD_PROCESSING_ERROR: 'WORD_PROCESSING_ERROR', INVALID_STATE: 'INVALID_STATE' },
}));

vi.mock('../../../backend/utils/timerManager', () => ({
  __esModule: true,
  default: { setTimeout: vi.fn(), clearTimeout: vi.fn() },
}));

vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema: unknown, data: unknown) => ({ success: true, data })),
  submitWordSchema: {},
  submitWordVoteSchema: {},
  submitPeerValidationVoteSchema: {},
}));

// wordValidationHandler NOT mocked — real implementation needed for wordAccepted/broadcastToRoom

vi.mock('../../../backend/handlers/playerDataInit', () => ({
  ensurePlayerState: vi.fn(),
}));

vi.mock('../../../backend/services/gracePeriodLock', () => ({
  acquireGracePeriodLock: vi.fn().mockResolvedValue(null),
  releaseGracePeriodLock: vi.fn(),
}));

vi.mock('../../../backend/modules/blastModeManager', () => ({
  validateBlastWordPath: vi.fn().mockReturnValue(null),
  getTilesOnResolvedPath: vi.fn().mockReturnValue([]),
  calculateBlastTileBonus: vi.fn().mockReturnValue(10),
  getTilesOnPath: vi.fn().mockReturnValue(['bomb', 'gold']),
  recordBlastMove: vi.fn().mockReturnValue({ movesUsed: 4, bonusMove: true }),
  // Per-player board model.
  getOrInitPlayerBoard: vi.fn(() => ({
    grid: [['A', 'B'], ['C', 'D']], tileStates: [[{}, {}], [{}, {}]],
    overlay: [], overlayMap: new Map(), seed: 1, totalMoves: 0, refillCount: 0,
  })),
  getWordPath: vi.fn(() => [{ row: 0, col: 0 }]),
  cascadeBlastWord: vi.fn(() => ({ clearedCount: 1, totalMoves: 1 })),
  safeCascadeBlastWord: vi.fn(() => ({
    ok: true,
    board: { grid: [['A', 'B'], ['C', 'D']], tileStates: [[{}, {}], [{}, {}]], overlay: [], overlayMap: new Map(), seed: 1, totalMoves: 0, refillCount: 0 },
    clearedCount: 1,
    totalMoves: 1,
  })),
}));

vi.mock('../../../backend/modules/blastBoardRegen', () => ({
  regenerateBlastBoardIfExhausted: vi.fn(() => false),
  isBlastBoardExhausted: vi.fn(() => false),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { broadcastToRoom } from '../../../backend/utils/socketHelpers';
import { queuePlayerFoundWord } from '../../../backend/utils/playerFoundWordBatcher';
import { registerWordHandlers } from '../wordHandler';

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
      playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 } },
      seed: 12345,
    },
    ...overrides,
  };
}

function createMockSocket() {
  const handlers: Record<string, Function> = {};
  const socket = {
    id: 'mock-socket-id',
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }),
    join: vi.fn(),
    rooms: new Set(['mock-socket-id']),
  };
  return { socket, handlers };
}

const mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

describe('wordHandler - merged blast emits (Fix 2)', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();

    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('MERGE1');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
    (getGame as Mock).mockReturnValue(makeBlastGame());
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (isValidWordCached as Mock).mockResolvedValue(true);
    (isDictionaryWord as Mock).mockReturnValue(true);
    (isWordCommunityValid as Mock).mockReturnValue(false);
    (isWordValidForScoring as Mock).mockReturnValue(false);
  });

  describe('wordAccepted includes blast field when in blast mode', () => {
    it('should include blast field in wordAccepted payload when gameMode is blast', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'bomb_gold' });

      const wordAcceptedCall = (mockSocket.emit as Mock).mock.calls.find(
        (call: any[]) => call[0] === 'wordAccepted'
      );
      expect(wordAcceptedCall).toBeDefined();
      const data = wordAcceptedCall[1];
      expect(data.blast).toBeDefined();
      expect(data.blast.tilesCleared).toBeDefined();
      expect(data.blast.movesUsed).toBeDefined();
      expect(data.blast.bonusMove).toBeDefined();
    });

    it('should NOT include blast field in wordAccepted when gameMode is classic', async () => {
      (getGame as Mock).mockReturnValue(makeBlastGame({ gameMode: 'classic', blastModeState: null }));

      await handlers['submitWord']({ word: 'test' });

      const wordAcceptedCall = (mockSocket.emit as Mock).mock.calls.find(
        (call: any[]) => call[0] === 'wordAccepted'
      );
      expect(wordAcceptedCall).toBeDefined();
      const data = wordAcceptedCall[1];
      expect(data.blast).toBeUndefined();
    });

    it('should NOT emit separate blastWordAccepted event', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'bomb_gold' });

      const blastWordAcceptedCall = (mockSocket.emit as Mock).mock.calls.find(
        (call: any[]) => call[0] === 'blastWordAccepted'
      );
      expect(blastWordAcceptedCall).toBeUndefined();
    });
  });

  describe('playerFoundWord includes comboSync field when comboType present', () => {
    it('should include comboSync in queued playerFoundWord payload when comboType is provided', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'bomb_bomb' });

      // playerFoundWord is coalesced via the batcher: queuePlayerFoundWord(io, gameCode, payload)
      const calls = (queuePlayerFoundWord as Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const payload = calls[0][2];
      expect(payload.comboSync).toBeDefined();
      expect(payload.comboSync.comboType).toBe('bomb_bomb');
      expect(payload.comboSync.username).toBe('testUser');
    });

    it('should NOT include comboSync in queued playerFoundWord when comboType is absent', async () => {
      await handlers['submitWord']({ word: 'test' });

      const calls = (queuePlayerFoundWord as Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const payload = calls[0][2];
      expect(payload.comboSync).toBeUndefined();
    });

    it('should NOT emit separate blastComboSync broadcast', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'bomb_bomb' });

      const calls = (broadcastToRoom as Mock).mock.calls;
      const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
      expect(comboSyncCall).toBeUndefined();
    });
  });
});
