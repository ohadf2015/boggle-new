/**
 * Word Handler - Event Bonus Accumulator Wiring
 *
 * Golden / lightning / special-word / word-hunt board bonuses are added to the
 * LIVE running score (playerScores) but are NOT baked into the stored per-word
 * score (addPlayerWord), so the end-of-game word recompute can't reconstruct them.
 * The handler must mirror these into a per-player `playerEventBonuses` accumulator
 * (via addPlayerEventBonus) so the final result page matches the in-game leaderboard.
 */

import { vi, type Mock } from 'vitest';

vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  addPlayerWord: vi.fn(),
  playerHasWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  addPlayerEventBonus: vi.fn(),
  getLeaderboard: vi.fn(),
  getLeaderboardThrottled: vi.fn(),
  markUserActivity: vi.fn(),
  recordPeerValidationVote: vi.fn(),
  removePeerRejectedWordScore: vi.fn(),
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
  calculateWordScore: vi.fn().mockReturnValue(8),
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
      tier: 'warning', invalidCount: 1, penaltyApplied: 0, cooldownDuration: 0,
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

vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockImplementation((code: string) => `game:${code}`),
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
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

vi.mock('../../../backend/modules/blastModeManager', () => ({
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
  getOrInitPlayerBoard: vi.fn(),
  getWordPath: vi.fn(() => []),
  cascadeBlastWord: vi.fn(() => ({ clearedCount: 0, totalMoves: 0 })),
}));

vi.mock('../../../backend/modules/blastBoardRegen', () => ({
  regenerateBlastBoardIfExhausted: vi.fn(() => false),
  isBlastBoardExhausted: vi.fn(() => false),
}));

vi.mock('../../../backend/modules/wordHuntManager', () => ({
  restoreLife: vi.fn(),
  getLifeBonus: vi.fn(() => 0),
  computeDiscoveryClues: vi.fn(() => ({ greenPositions: [], knownLetters: [] })),
}));

vi.mock('@/shared/constants/wordHuntMultiplayerConstants', () => ({
  BOARD_WORD_SCORE_PER_LETTER: 2,
}));

import { getGame, getGameBySocketId, getUsernameBySocketId, updatePlayerScore, addPlayerEventBonus, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { registerWordHandlers } from '../wordHandler';

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

function baseGame(overrides = {}) {
  return {
    gameCode: 'EVT1',
    gameState: 'in-progress',
    gameMode: 'classic',
    language: 'en',
    minWordLength: 2,
    letterGrid: [['T', 'B'], ['C', 'D']],
    letterPositions: new Map(),
    playerWords: {},
    playerWordDetails: {},
    playerScores: {},
    playerCombos: {},
    users: { testUser: { isHost: false, socketId: 'socket-test' } },
    ...overrides,
  };
}

describe('wordHandler - event bonus accumulator wiring', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('EVT1');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (isValidWordCached as Mock).mockResolvedValue(true);
    (isDictionaryWord as Mock).mockReturnValue(true);
    (isWordCommunityValid as Mock).mockReturnValue(false);
    (isWordValidForScoring as Mock).mockReturnValue(false);
  });

  it('records the golden-letter bonus into the event accumulator (classic)', async () => {
    // letterGrid[0][0] = 'T' is golden; word 'test' uses 't'. wordScore mocked to 8.
    // goldenBonus = ceil(8 * 0.25) = 2. This is NOT stored in addPlayerWord, so it
    // must land in the per-player event-bonus accumulator instead.
    (getGame as Mock).mockReturnValue(baseGame({ goldenLetters: [{ row: 0, col: 0 }] }));

    await handlers['submitWord']({ word: 'test' });

    const call = (addPlayerEventBonus as Mock).mock.calls[0];
    expect(call).toBeDefined();
    expect(call[1]).toBe('testUser');
    expect(call[2]).toBe(2);
    // sanity: live score still carries the full delta (word + bonus)
    expect((updatePlayerScore as Mock).mock.calls[0][2]).toBe(10);
  });

  it('records the word-hunt per-letter board bonus into the event accumulator', async () => {
    // word 'test' (len 4) * BOARD_WORD_SCORE_PER_LETTER(2) = 8.
    (getGame as Mock).mockReturnValue(baseGame({
      gameMode: 'word-hunt',
      wordHuntState: { targetWord: 'zzzzz', playerLives: { testUser: 3 }, eliminatedPlayers: [], discoveryWordCount: 0 },
    }));

    await handlers['submitWord']({ word: 'test' });

    const call = (addPlayerEventBonus as Mock).mock.calls[0];
    expect(call).toBeDefined();
    expect(call[2]).toBe(8);
  });

  it('does not touch the accumulator for a plain classic word (no golden/lightning/special)', async () => {
    // letterGrid[0][0]='T' is golden, so use a word that avoids every golden letter.
    (getGame as Mock).mockReturnValue(baseGame());

    await handlers['submitWord']({ word: 'bcd' });

    expect((addPlayerEventBonus as Mock).mock.calls.length).toBe(0);
  });
});
