/**
 * TDD RED: handleValidatedWord must award a Lightning round-event score bonus.
 *
 * The Lightning round event broadcasts `chargedTiles` + `bonusMultiplier: 1.5`
 * and persists them on `game.lightningTiles`, but the word-scoring path never
 * read them — so the advertised lightning bonus was never applied (dead wiring).
 *
 * Like the golden-letter bonus that lives in the same function, the lightning
 * bonus is CHARACTER-based: if the submitted word uses any letter that sits on
 * a charged tile while `activeRoundEvent === 'lightning'`, award +50% of the
 * word score (ceil), added to the authoritative score delta and emitted to the
 * client so the HUD reconciles.
 */

import { vi, type Mock } from 'vitest';

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
  calculateWordScore: vi.fn().mockReturnValue(3),
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

vi.mock('../../../backend/modules/blastModeManager', () => ({
  validateBlastWordPath: vi.fn().mockReturnValue(null),
  getTilesOnResolvedPath: vi.fn().mockReturnValue([]),
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId, updatePlayerScore } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { calculateWordScore } from '../../../backend/modules/scoringEngine';
import { registerWordHandlers } from '../wordHandler';

// Grid where the letter at [0][0] is 'C' (charged in lightning tests below).
function makeClassicGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'LGT01',
    gameState: 'in-progress',
    gameMode: 'classic',
    language: 'en',
    minWordLength: 2,
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['X', 'Y', 'Z']],
    letterPositions: new Map(),
    playerWords: {},
    playerScores: {},
    users: {},
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

describe('wordValidationHandler - lightning round-event bonus', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);
    (getGameBySocketId as Mock).mockReturnValue('LGT01');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
  });

  it('awards +50% (ceil) when a word uses a charged-tile letter during lightning', async () => {
    // GIVEN: lightning active, charged tile at [0][0] = 'C'; word "cat" uses 'c'
    (getGame as Mock).mockReturnValue(makeClassicGame({
      activeRoundEvent: 'lightning',
      lightningTiles: [{ row: 0, col: 0 }],
    }));
    (calculateWordScore as Mock).mockReturnValue(4);

    // base 4 + ceil(4 * 0.5) = 4 + 2 = 6
    await handlers['submitWord']({ word: 'cat' });

    const scoreCalls = (updatePlayerScore as Mock).mock.calls;
    expect(scoreCalls.length).toBeGreaterThanOrEqual(1);
    expect(scoreCalls[scoreCalls.length - 1][2]).toBe(6);
  });

  it('emits lightningBonus on wordAccepted so the HUD reconciles', async () => {
    (getGame as Mock).mockReturnValue(makeClassicGame({
      activeRoundEvent: 'lightning',
      lightningTiles: [{ row: 0, col: 0 }],
    }));
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'cat' });

    const accepted = (mockSocket.emit as Mock).mock.calls.find(c => c[0] === 'wordAccepted');
    expect(accepted).toBeDefined();
    expect(accepted![1].lightningBonus).toBe(2);
  });

  it('does NOT award lightning bonus when the word avoids charged letters', async () => {
    // charged tile [0][0]='C'; word "dog" (d/o/g) touches no charged letter
    (getGame as Mock).mockReturnValue(makeClassicGame({
      activeRoundEvent: 'lightning',
      lightningTiles: [{ row: 0, col: 0 }],
    }));
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'dog' });

    const scoreCalls = (updatePlayerScore as Mock).mock.calls;
    expect(scoreCalls[scoreCalls.length - 1][2]).toBe(4);
    const accepted = (mockSocket.emit as Mock).mock.calls.find(c => c[0] === 'wordAccepted');
    expect(accepted![1].lightningBonus).toBeUndefined();
  });

  it('does NOT award lightning bonus when no lightning event is active', async () => {
    // charged tiles present but event not active (stale) → no bonus
    (getGame as Mock).mockReturnValue(makeClassicGame({
      activeRoundEvent: null,
      lightningTiles: [{ row: 0, col: 0 }],
    }));
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'cat' });

    const scoreCalls = (updatePlayerScore as Mock).mock.calls;
    expect(scoreCalls[scoreCalls.length - 1][2]).toBe(4);
  });
});
