/**
 * TDD RED: wordHandler should broadcast wordHuntLifeUpdate after restoreLife
 *
 * Bug: restoreLife() is called but no wordHuntLifeUpdate event is emitted,
 * so clients see stale life values for up to 1 second (until next timer tick).
 */

import { vi, type Mock } from 'vitest';

// Mock dependencies before imports
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  addPlayerWord: vi.fn(),
  playerHasWord: vi.fn().mockReturnValue(false),
  updatePlayerScore: vi.fn(),
  addPlayerEventBonus: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
  getLeaderboardThrottled: vi.fn().mockReturnValue([]),
  markUserActivity: vi.fn(),
  recordPeerValidationVote: vi.fn(),
  removePeerRejectedWordScore: vi.fn(),
  trackAiApprovedWord: vi.fn(),
  getFirstFinder: vi.fn().mockReturnValue(null),
  recordFirstFinder: vi.fn(),
}));

vi.mock('../../../backend/modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: vi.fn(),
}));

vi.mock('../../../backend/dictionary', () => ({
  isDictionaryWord: vi.fn().mockReturnValue(true),
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
  getGameRoom: vi.fn().mockImplementation((gc: string) => `game:${gc}`),
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

// wordValidationHandler NOT mocked — real implementation needed for broadcastToRoom/wordHuntLifeUpdate

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
}));

vi.mock('../../../backend/utils/logger', () => {
  const loggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), log: vi.fn() };
  return { __esModule: true, default: loggerMock };
});

vi.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { broadcastToRoom } from '../../../backend/utils/socketHelpers';
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

describe('wordHandler word-hunt life restore broadcast', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();

    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('HUNT01');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
  });

  it('should broadcast wordHuntLifeUpdate immediately after restoreLife on accepted word', async () => {
    // GIVEN: word-hunt game with wordHuntState
    const huntState = {
      targetWord: 'hello',
      targetWordLength: 5,
      playerLives: { alice: 80, bob: 90 },
      eliminatedPlayers: [],
      targetFoundBy: null,
      isFirstFinderClaimed: false,
    };

    (getGame as Mock).mockReturnValue({
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

    (isWordOnBoardAsync as Mock).mockResolvedValue(true);

    // WHEN: player submits a valid word
    await handlers['submitWord']({ word: 'cat' });

    // THEN: wordHuntLifeUpdate should be broadcast with updated lives
    const lifeCalls = (broadcastToRoom as Mock).mock.calls.filter(
      (call: any[]) => call[2] === 'wordHuntLifeUpdate'
    );
    expect(lifeCalls.length).toBeGreaterThanOrEqual(1);
    expect(lifeCalls[0][3]).toEqual(
      expect.objectContaining({
        playerLives: expect.any(Object),
      })
    );
  });
});
