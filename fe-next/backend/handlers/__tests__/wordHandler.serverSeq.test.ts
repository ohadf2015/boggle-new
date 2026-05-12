/**
 * TDD RED: Phase 3.4 — serverSeq delta payloads
 *
 * game.serverSeq must increment on each accepted word.
 * playerFoundWord broadcast must include serverSeq.
 * scoreUpdate event must be broadcast with delta info.
 */

import { vi, type Mock } from 'vitest';

vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  addPlayerWord: vi.fn(),
  playerHasWord: vi.fn().mockReturnValue(false),
  updatePlayerScore: vi.fn(),
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

vi.mock('../../../backend/modules/botManager', () => ({
  isBot: vi.fn(() => false),
  stopAllBots: vi.fn(),
  cleanupGameBots: vi.fn(),
  getGameBots: vi.fn(() => []),
  getBotByUsername: vi.fn(),
  addBot: vi.fn(),
  removeBot: vi.fn(),
  resetBotCombo: vi.fn(),
  addWordToBlacklist: vi.fn(),
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

vi.mock('../../../backend/modules/wordHuntManager', () => ({
  restoreLife: vi.fn().mockReturnValue(85),
  getLifeBonus: vi.fn().mockReturnValue(5),
  computeDiscoveryClues: vi.fn().mockReturnValue({ greenPositions: [], knownLetters: [] }),
}));

vi.mock('../../../backend/utils/logger', () => {
  const loggerMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), log: vi.fn() };
  return { __esModule: true, default: loggerMock };
});

vi.mock('@/shared/utils/wordShapeFilter', () => ({
  isWordShapeWeird: vi.fn().mockReturnValue({ weird: false }),
}));

vi.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { broadcastToRoom } from '../../../backend/utils/socketHelpers';
import { registerWordHandlers } from '../wordHandler';

function makeClassicGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'SEQ01',
    gameState: 'in-progress',
    gameMode: 'classic',
    language: 'en',
    minWordLength: 2,
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['X', 'Y', 'Z']],
    letterPositions: new Map(),
    playerWords: { alice: [] },
    playerScores: { alice: 10 },
    users: { alice: {} },
    serverSeq: undefined as number | undefined,
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

describe('wordValidationHandler - serverSeq delta payloads (Phase 3.4)', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];
  let game: ReturnType<typeof makeClassicGame>;

  beforeEach(() => {
    vi.clearAllMocks();

    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('SEQ01');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);

    game = makeClassicGame();
    (getGame as Mock).mockReturnValue(game);
  });

  it('increments game.serverSeq from undefined (0) to 1 on first accepted word', async () => {
    await handlers['submitWord']({ word: 'cat' });

    expect(game.serverSeq).toBe(1);
  });

  it('increments game.serverSeq from existing value on subsequent accepted words', async () => {
    game.serverSeq = 5;
    await handlers['submitWord']({ word: 'cat' });

    expect(game.serverSeq).toBe(6);
  });

  it('increments serverSeq on each successive accepted word', async () => {
    (getGame as Mock).mockReturnValue(game);

    await handlers['submitWord']({ word: 'cat' });
    expect(game.serverSeq).toBe(1);

    await handlers['submitWord']({ word: 'dog' });
    expect(game.serverSeq).toBe(2);

    await handlers['submitWord']({ word: 'xyz' });
    expect(game.serverSeq).toBe(3);
  });

  it('includes serverSeq in playerFoundWord broadcast', async () => {
    game.serverSeq = 3;
    await handlers['submitWord']({ word: 'cat' });

    const calls = (broadcastToRoom as Mock).mock.calls;
    const playerFoundCall = calls.find((c: unknown[]) => c[2] === 'playerFoundWord');
    expect(playerFoundCall).toBeDefined();
    expect(playerFoundCall![3]).toMatchObject({ serverSeq: 4 });
  });

  it('broadcasts scoreUpdate event with delta info after accepted word', async () => {
    game.serverSeq = 0;
    game.playerScores = { alice: 10 };
    await handlers['submitWord']({ word: 'cat' });

    const calls = (broadcastToRoom as Mock).mock.calls;
    const scoreUpdateCall = calls.find((c: unknown[]) => c[2] === 'scoreUpdate');
    expect(scoreUpdateCall).toBeDefined();
    const payload = scoreUpdateCall![3];
    expect(payload).toMatchObject({
      serverSeq: 1,
      username: 'alice',
      deltaScore: expect.any(Number),
      totalScore: expect.any(Number),
      lastWord: 'cat',
    });
    expect(payload.deltaScore).toBeGreaterThan(0);
  });

  it('scoreUpdate totalScore matches player score after update', async () => {
    game.playerScores = { alice: 10 };
    await handlers['submitWord']({ word: 'cat' });

    const calls = (broadcastToRoom as Mock).mock.calls;
    const scoreUpdateCall = calls.find((c: unknown[]) => c[2] === 'scoreUpdate');
    expect(scoreUpdateCall).toBeDefined();
    const payload = scoreUpdateCall![3];
    // totalScore should be playerScores[alice] + wordScore (5 from mock) = 15
    expect(payload.totalScore).toBe(15);
    expect(payload.deltaScore).toBe(5);
  });
});
