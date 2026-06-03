/**
 * Word Handler Tests
 * Tests for word submission, validation, and error handling
 */

import { vi, type Mock } from 'vitest';

// Mock dependencies
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
  isValidWordCached: vi.fn().mockResolvedValue(true),
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
  InvalidReason: { PROFANITY: 'profanity', TOO_SHORT: 'tooShort', NOT_ON_BOARD: 'notOnBoard' },
}));

vi.mock('../../../backend/handlers/shared', () => ({
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../backend/handlers/engagementHandler', () => ({
  processLongWordEngagement: vi.fn().mockResolvedValue(undefined),
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
  ErrorCodes: {
    WORD_PROCESSING_ERROR: 'WORD_PROCESSING_ERROR',
    INVALID_STATE: 'INVALID_STATE',
    GAME_NOT_IN_PROGRESS: 'GAME_NOT_IN_PROGRESS',
    PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
  },
}));

vi.mock('../../../backend/middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
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

vi.mock('../../../backend/handlers/wordValidationHandler', () => ({
  handleValidatedWord: vi.fn().mockResolvedValue(undefined),
  handleWordBecameValid: vi.fn().mockResolvedValue(undefined),
  handlePeerRejection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../backend/handlers/playerDataInit', () => ({
  ensurePlayerState: vi.fn(),
}));

vi.mock('../../../backend/services/gracePeriodLock', () => ({
  acquireGracePeriodLock: vi.fn().mockResolvedValue(null),
  releaseGracePeriodLock: vi.fn(),
}));

vi.mock('../../../backend/modules/wordHuntManager', () => ({
  restoreLife: vi.fn().mockReturnValue(85),
  getLifeBonus: vi.fn().mockReturnValue(5),
  computeDiscoveryClues: vi.fn().mockReturnValue({ greenPositions: [], knownLetters: [] }),
}));

vi.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
}));

// Import mocks
import { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { emitError } from '../../../backend/utils/errorHandler';
import { isSupabaseConfigured, recordPlayerWrongWord } from '../../../backend/modules/supabaseServer';
import { registerWordHandlers } from '../wordHandler';

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

describe('wordHandler submitWord error handling', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();

    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    // Default mock setup for a valid game state
    (getGameBySocketId as Mock).mockReturnValue('TEST123');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
  });

  describe('error handling scenarios', () => {
    it('should emit error when isWordOnBoardAsync throws', async () => {
      // GIVEN: A game exists but word validation throws an error
      (getGame as Mock).mockReturnValue({
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
      (isWordOnBoardAsync as Mock).mockRejectedValue(new Error('Worker pool exhausted'));

      // WHEN: User submits a word
      await handlers['submitWord']({ word: 'test' });

      // THEN: Should call emitError with a standardized error
      expect(emitError).toHaveBeenCalled();
    });

    it('should handle undefined language gracefully', async () => {
      // GIVEN: A game exists but language is undefined
      (getGame as Mock).mockReturnValue({
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

      (isWordOnBoardAsync as Mock).mockResolvedValue(true);
      (isDictionaryWord as Mock).mockReturnValue(true);
      (isWordCommunityValid as Mock).mockReturnValue(false);
      (isWordValidForScoring as Mock).mockReturnValue(false);

      // WHEN: User submits a word — should NOT throw
      await expect(handlers['submitWord']({ word: 'test' })).resolves.not.toThrow();
    });

    it('should NOT record not_on_board rows in invalid_word_submissions (noise, not moderation signal)', async () => {
      // GIVEN: Supabase is configured AND the submitted word is not on the board
      (isSupabaseConfigured as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue({
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
      (isWordOnBoardAsync as Mock).mockResolvedValue(false);

      // WHEN: User submits a word that is not on the board
      await handlers['submitWord']({ word: 'pleat' });

      // THEN: Client is notified but no DB row is written — these events are 96% single-submit
      // with 0 appeals; admins cannot action them since the word simply wasn't on the grid.
      expect(mockSocket.emit).toHaveBeenCalledWith('wordNotOnBoard', expect.objectContaining({ word: 'pleat' }));
      expect(recordPlayerWrongWord).not.toHaveBeenCalled();
    });

    it('should handle game deleted during word processing gracefully', async () => {
      // GIVEN: Game exists at first check but is deleted before word validation
      let callCount = 0;
      (getGame as Mock).mockImplementation(() => {
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
        return null;
      });

      (isWordOnBoardAsync as Mock).mockResolvedValue(true);
      (isDictionaryWord as Mock).mockReturnValue(true);
      (isWordCommunityValid as Mock).mockReturnValue(false);
      (isWordValidForScoring as Mock).mockReturnValue(false);

      // WHEN: User submits a word — should handle gracefully without throwing
      await expect(handlers['submitWord']({ word: 'test' })).resolves.not.toThrow();
    });
  });

  describe('post-game grace window', () => {
    // A player's last-second word often arrives just after the server has moved
    // the round to 'finished'. The grace window must be forgiving enough to
    // absorb real mobile/laggy latency instead of bouncing the word back as
    // GAME_NOT_IN_PROGRESS. These tests pin the boundary behaviour.
    const baseFinishedGame = {
      gameCode: 'TEST123',
      gameState: 'finished' as const,
      language: 'en',
      minWordLength: 2,
      letterGrid: [['T', 'E'], ['S', 'T']],
      letterPositions: new Map(),
      playerWords: {},
      playerWordDetails: {},
      playerScores: {},
      playerCombos: {},
      users: { testUser: { isHost: false } },
    };

    it('accepts a word submitted 2s after the round finished (within the widened grace)', async () => {
      // GIVEN: round finished 2s ago — beyond the old 1.5s window, within the new one
      (getGame as Mock).mockReturnValue({
        ...baseFinishedGame,
        gameEndedAt: Date.now() - 2000,
      });
      (isWordOnBoardAsync as Mock).mockResolvedValue(true);

      // WHEN: the late word arrives
      await handlers['submitWord']({ word: 'test' });

      // THEN: it is NOT rejected as not-in-progress
      expect(emitError).not.toHaveBeenCalledWith(expect.anything(), 'GAME_NOT_IN_PROGRESS');
      expect(emitError).not.toHaveBeenCalledWith(expect.anything(), 'GAME_NOT_IN_PROGRESS', expect.anything());
    });

    it('rejects a word submitted long after the grace window has closed', async () => {
      // GIVEN: round finished 5s ago — outside any reasonable grace window
      (getGame as Mock).mockReturnValue({
        ...baseFinishedGame,
        gameEndedAt: Date.now() - 5000,
      });

      // WHEN: the very-late word arrives
      await handlers['submitWord']({ word: 'test' });

      // THEN: it is rejected as not-in-progress
      expect(emitError).toHaveBeenCalledWith(expect.anything(), 'GAME_NOT_IN_PROGRESS');
    });
  });
});
