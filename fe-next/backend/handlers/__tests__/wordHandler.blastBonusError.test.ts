/**
 * BLT-SCORE-1 (blast MP audit 2026-04-28):
 * Blast bonus calculation catch path must log enriched context (gameCode,
 * username, word, wave, stack) so Sentry has enough triage signal — not
 * just a bare error message that swallows context.
 */
import { vi, type Mock } from 'vitest';

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

vi.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));

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
    recordInvalidWord: vi.fn().mockReturnValue({ tier: 'warning', invalidCount: 1, penaltyApplied: 0, cooldownDuration: 0 }),
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

vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockImplementation((gameCode: string) => `game:${gameCode}`),
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../backend/modules/botManager', () => ({
  isBot: vi.fn(() => false), stopAllBots: vi.fn(), cleanupGameBots: vi.fn(),
  getGameBots: vi.fn(() => []), getBotByUsername: vi.fn(), addBot: vi.fn(),
  removeBot: vi.fn(), resetBotCombo: vi.fn(), addWordToBlacklist: vi.fn(),
  resyncBotsForNewGrid: vi.fn(),
}));

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

vi.mock('../../../backend/handlers/playerDataInit', () => ({
  ensurePlayerState: vi.fn(),
}));

vi.mock('../../../backend/services/gracePeriodLock', () => ({
  acquireGracePeriodLock: vi.fn().mockResolvedValue(null),
  releaseGracePeriodLock: vi.fn(),
}));

// Force getTilesOnPath to throw — simulates an unexpected blast state corruption.
vi.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn(() => { throw new Error('boom: overlay corruption'); }),
  recordBlastMove: vi.fn().mockReturnValue({ movesUsed: 0, bonusMove: false }),
  isBlastBoardCleared: vi.fn().mockReturnValue(false),
  advanceBlastWave: vi.fn(),
  tryBeginWaveAdvance: vi.fn().mockReturnValue(false),
  endWaveAdvance: vi.fn(),
  resyncBotsForNewGrid: vi.fn(),
  // Per-player board model — must resolve a board before the (throwing)
  // getTilesOnPath, so the thrown error is the intended overlay-corruption one.
  getOrInitPlayerBoard: vi.fn(() => ({
    grid: [['A']], tileStates: [[{ letter: 'A', type: 'standard', isCleared: false }]],
    overlay: [], overlayMap: new Map(), seed: 1, totalMoves: 0, refillCount: 0,
  })),
  getWordPath: vi.fn(() => [{ row: 0, col: 0 }]),
  cascadeBlastWord: vi.fn(() => ({ clearedCount: 0, totalMoves: 1 })),
}));

const { loggerErrorMock } = vi.hoisted(() => ({ loggerErrorMock: vi.fn() }));
vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerErrorMock,
    debug: vi.fn(),
    forGame: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
    forSocket: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
  },
}));

import {
  getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder,
} from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { registerWordHandlers } from '../wordHandler';

function makeBlastGame() {
  return {
    gameCode: 'BERR1',
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
    users: { testUser: { isHost: false, socketId: 'sock-err' } },
    blastModeState: {
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 1 },
      playerBonusMoves: { testUser: 0 },
      playerStats: {
        testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 },
      },
      seed: 9999,
      wave: 3,
    },
  };
}

function createMockSocket() {
  const handlers: Record<string, Function> = {};
  const socket = {
    id: 'mock-socket-id',
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    join: vi.fn(),
    rooms: new Set(['mock-socket-id']),
  };
  return { socket, handlers };
}

const mockIo = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

describe('wordHandler — blast bonus calc error path enriches Sentry context', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('BERR1');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
    (getGame as Mock).mockReturnValue(makeBlastGame());
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (isValidWordCached as Mock).mockResolvedValue(true);
    (isDictionaryWord as Mock).mockReturnValue(true);
    (isWordCommunityValid as Mock).mockReturnValue(false);
    (isWordValidForScoring as Mock).mockReturnValue(false);
  });

  it('logs BLAST category with metadata when blast bonus calc throws', async () => {
    await handlers['submitWord']({ word: 'foo' });

    expect(loggerErrorMock).toHaveBeenCalled();
    const blastCall = loggerErrorMock.mock.calls.find((c) => c[0] === 'BLAST');
    expect(blastCall).toBeDefined();
    const [, message, data] = blastCall!;
    expect(typeof message).toBe('string');
    expect(message).toContain('boom: overlay corruption');
    expect(data).toBeDefined();
    expect(data).toMatchObject({
      gameCode: 'BERR1',
      username: 'testUser',
      word: 'foo',
      wave: 3,
    });
    expect(typeof data.stack).toBe('string');
  });

  it('does not crash the submission — handler still completes', async () => {
    await expect(handlers['submitWord']({ word: 'foo' })).resolves.not.toThrow();
  });
});
