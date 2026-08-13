/**
 * Word Handler - Blast Scoring Tests
 * Verifies that blast tile bonuses are included in stored word details
 * so that final score recalculation (scoringEngine) produces correct totals.
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

// wordValidationHandler NOT mocked — real implementation needed for addPlayerWord/updatePlayerScore

vi.mock('../../../backend/handlers/playerDataInit', () => ({
  ensurePlayerState: vi.fn(),
}));

vi.mock('../../../backend/services/gracePeriodLock', () => ({
  acquireGracePeriodLock: vi.fn().mockResolvedValue(null),
  releaseGracePeriodLock: vi.fn(),
}));

// Setup blast mode manager mock with controllable tile bonus
vi.mock('../../../backend/modules/blastModeManager', () => ({
  validateBlastWordPath: vi.fn().mockReturnValue(null),
  getTilesOnResolvedPath: vi.fn().mockReturnValue([]),
  calculateBlastTileBonus: vi.fn().mockReturnValue(10),
  getTilesOnPath: vi.fn().mockReturnValue(['gold', 'standard']),
  recordBlastMove: vi.fn().mockReturnValue({ movesUsed: 1, bonusMove: false }),
  // Per-player board model: handler now resolves a player board + cascades on it.
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

import { getGame, getGameBySocketId, getUsernameBySocketId, addPlayerWord, updatePlayerScore, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { registerWordHandlers } from '../wordHandler';

function makeBlastGame(overrides = {}) {
  return {
    gameCode: 'BLAST1',
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
    users: { testUser: { isHost: false, socketId: 'socket-test' } },
    blastModeState: {
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 0 },
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

describe('wordHandler - Blast tile bonus in stored word details', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();

    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('BLAST1');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
    (getGame as Mock).mockReturnValue(makeBlastGame());
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (isValidWordCached as Mock).mockResolvedValue(true);
    (isDictionaryWord as Mock).mockReturnValue(true);
    (isWordCommunityValid as Mock).mockReturnValue(false);
    (isWordValidForScoring as Mock).mockReturnValue(false);
  });

  it('should include blast tile bonus in addPlayerWord score', async () => {
    // GIVEN: Blast mode with tile bonus of 10, word score of 5
    // WHEN: Player submits a word
    await handlers['submitWord']({ word: 'test' });

    // THEN: addPlayerWord stores wordScore(5) + tileBonus(10) + letterBonus(4) = 19
    // letterBonus = deterministic letter-value sum of 'TEST' (T1+E1+S1+T1).
    const addCall = (addPlayerWord as Mock).mock.calls[0];
    expect(addCall).toBeDefined();
    const options = addCall[3]; // 4th arg is options
    expect(options.score).toBe(19); // 5 (word) + 10 (tile) + 4 (letter value)
  });

  it('should call updatePlayerScore with word score + tile bonus', async () => {
    // GIVEN: Blast mode with tile bonus of 10, word score of 5
    // WHEN: Player submits a word
    await handlers['submitWord']({ word: 'test' });

    // THEN: updatePlayerScore called with 19 (5 word + 10 tile + 4 letter value)
    const scoreCall = (updatePlayerScore as Mock).mock.calls[0];
    expect(scoreCall).toBeDefined();
    expect(scoreCall[2]).toBe(19); // score = wordScore + tileBonus + letterBonus
    expect(scoreCall[3]).toBe(true); // isDelta
  });

  it('emits wordAccepted.score including the tile bonus so the per-word number matches the points actually awarded', async () => {
    // GIVEN: Blast mode, word score 5, tile bonus 10 (total delta = 15)
    // WHEN: Player submits a word
    await handlers['submitWord']({ word: 'test' });

    // THEN: the wordAccepted emit reports the full per-word delta (15), not the
    // bare word score (5). Otherwise the live total (server-authoritative,
    // includes tile bonus) outruns the sum of the player's per-word chips.
    const emitCall = (mockSocket.emit as Mock).mock.calls.find((c: unknown[]) => c[0] === 'wordAccepted');
    expect(emitCall).toBeDefined();
    const payload = emitCall![1] as { score: number; blast?: { tileBonus: number } };
    expect(payload.score).toBe(19); // 5 (word) + 10 (tile) + 4 (letter value)
    // Breakdown is still available for any UI that wants to itemise it — the
    // tile bonus stays reported on its own (letter value rides in the total).
    expect(payload.blast?.tileBonus).toBe(10);
  });
});

describe('wordHandler - Blast combo resets on a miss (HUD/scoring parity)', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);

    (getGameBySocketId as Mock).mockReturnValue('BLAST1');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
    (isValidWordCached as Mock).mockResolvedValue(true);
    (isDictionaryWord as Mock).mockReturnValue(true);
    (isWordCommunityValid as Mock).mockReturnValue(false);
    (isWordValidForScoring as Mock).mockReturnValue(false);
  });

  // The server combo (playerCombos) is what scoring uses; the client HUD resets
  // its combo on every miss. Before this fix the server combo only climbed
  // (reset per round, never on a miss), so the badge the player saw and the
  // combo the server scored with diverged. Server must break the streak too.

  it('resets the player combo to 0 when a Blast word is not on the board', async () => {
    const game = makeBlastGame({ playerCombos: { testUser: 4 } });
    (getGame as Mock).mockReturnValue(game);
    (isWordOnBoardAsync as Mock).mockResolvedValue(false);

    await handlers['submitWord']({ word: 'test' });

    expect((game.playerCombos as Record<string, number>).testUser).toBe(0);
  });

  it('resets the player combo to 0 when a Blast word is rejected as not in the dictionary', async () => {
    const game = makeBlastGame({ playerCombos: { testUser: 4 } });
    (getGame as Mock).mockReturnValue(game);
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (isValidWordCached as Mock).mockResolvedValue(false); // not a real word

    await handlers['submitWord']({ word: 'test' });

    expect((game.playerCombos as Record<string, number>).testUser).toBe(0);
  });

  it('does NOT reset combo on a partial-credit confirmation find (it still counts as a chain)', async () => {
    const game = makeBlastGame({ playerCombos: { testUser: 4 } });
    (getGame as Mock).mockReturnValue(game);
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (getFirstFinder as Mock).mockReturnValue({ username: 'other', avatar: null });

    await handlers['submitWord']({ word: 'test' });

    // Existing behaviour: confirmation finds keep the streak alive (+1).
    expect((game.playerCombos as Record<string, number>).testUser).toBe(5);
  });

  it('leaves combo intact on a miss in non-Blast mode (scope guard)', async () => {
    const game = makeBlastGame({ gameMode: 'classic', playerCombos: { testUser: 4 } });
    (getGame as Mock).mockReturnValue(game);
    (isWordOnBoardAsync as Mock).mockResolvedValue(false);

    await handlers['submitWord']({ word: 'test' });

    expect((game.playerCombos as Record<string, number>).testUser).toBe(4);
  });
});
