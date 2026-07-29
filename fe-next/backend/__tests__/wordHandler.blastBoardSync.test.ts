/**
 * Word Handler - Blast Board Sync Tests
 * Verifies that game.letterGrid and game.letterPositions stay in sync with
 * the live cascading blast board so subsequent words validate correctly.
 */

import { vi, type Mock } from 'vitest';

vi.mock('../modules/gameStateManager', () => ({
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

vi.mock('../modules/wordValidatorPool', () => ({
  isWordOnBoardAsync: vi.fn(),
}));

vi.mock('../dictionary', () => ({
  isDictionaryWord: vi.fn(),
  isValidWordCached: vi.fn(),
}));

vi.mock('../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(),
  isWordValidForScoring: vi.fn(),
  recordVote: vi.fn(),
  updatePendingCache: vi.fn(),
}));

vi.mock('../utils/profanityFilter', () => ({
  isProfane: vi.fn().mockReturnValue(false),
}));

vi.mock('../modules/scoringEngine', () => ({
  calculateWordScore: vi.fn().mockReturnValue(5),
}));

vi.mock('../modules/achievementManager', () => ({
  checkAndAwardAchievements: vi.fn().mockReturnValue([]),
  ACHIEVEMENT_ICONS: {},
}));

vi.mock('../modules/supabaseServer', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
  savePlayerWord: vi.fn(),
  recordPlayerWrongWord: vi.fn(),
}));

vi.mock('../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('../utils/metrics', () => ({
  inc: vi.fn(),
  incPerGame: vi.fn(),
}));

vi.mock('../modules/spamDetector', () => ({
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

vi.mock('../handlers/shared', () => ({
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));

vi.mock('../handlers/engagementHandler', () => ({
  processLongWordEngagement: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockImplementation((code: string) => `game:${code}`),
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
}));

vi.mock('../modules/botManager', () => ({ isBot: vi.fn(() => false), stopAllBots: vi.fn(), cleanupGameBots: vi.fn(), getGameBots: vi.fn(() => []), getBotByUsername: vi.fn(), addBot: vi.fn(), removeBot: vi.fn(), resetBotCombo: vi.fn(), addWordToBlacklist: vi.fn(), resyncBotsForNewGrid: vi.fn() }));

vi.mock('../utils/errorHandler', () => ({
  emitError: vi.fn(),
  ErrorCodes: { WORD_PROCESSING_ERROR: 'WORD_PROCESSING_ERROR', INVALID_STATE: 'INVALID_STATE' },
}));

vi.mock('../utils/timerManager', () => ({
  __esModule: true,
  default: { setTimeout: vi.fn(), clearTimeout: vi.fn() },
}));

vi.mock('../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema: unknown, data: unknown) => ({ success: true, data })),
  submitWordSchema: {},
  submitWordVoteSchema: {},
  submitPeerValidationVoteSchema: {},
}));

vi.mock('../handlers/playerDataInit', () => ({
  ensurePlayerState: vi.fn(),
}));

vi.mock('../services/gracePeriodLock', () => ({
  acquireGracePeriodLock: vi.fn().mockResolvedValue(null),
  releaseGracePeriodLock: vi.fn(),
}));

// Sentinel grid for testing cascade updates
const SENTINEL_GRID = [['Q','Z'],['X','Y']];

vi.mock('@/components/blast/legacy/utils/clearTilesProcessor', () => ({
  processTilesForWord: vi.fn(() => ({ next: [[{},{}],[{},{}]], newlyClearedCount: 1 })),
}));

vi.mock('@/components/blast/legacy/utils/blastGravity', () => ({
  computeGravityResult: vi.fn(() => ({ newGrid: SENTINEL_GRID, newTileStates: [[{},{}],[{},{}]] })),
}));

vi.mock('@/components/blast/legacy/utils/blastLetterGenerator', () => ({
  createSeededRandom: vi.fn(() => () => 0.5),
}));

// Mock makePositionsMap's source module
vi.mock('../modules/wordValidator', () => ({
  makePositionsMap: vi.fn(() => new Map()),
}));

// Partial mock: keep the REAL per-player board functions (getOrInitPlayerBoard,
// cascadeBlastWord) so we actually exercise the per-player cascade, but stub the
// scoring helpers we want to control. processTilesForWord/computeGravityResult
// are mocked above (cascadeBlastWord imports them from the same @/components path).
vi.mock('../modules/blastModeManager', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../modules/blastModeManager')>()),
  calculateBlastTileBonus: vi.fn().mockReturnValue(10),
  getTilesOnPath: vi.fn().mockReturnValue(['gold', 'standard']),
  recordBlastMove: vi.fn().mockReturnValue({ movesUsed: 1, bonusMove: false }),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId, addPlayerWord, getFirstFinder } from '../modules/gameStateManager';
import { isWordOnBoardAsync } from '../modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../modules/communityWordManager';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { computeGravityResult } from '@/components/blast/legacy/utils/blastGravity';
import { registerWordHandlers } from '../handlers/wordHandler';

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
      grid: [['A', 'B'], ['C', 'D']],
      tileStates: [[{},{}],[{},{}]],
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 0 },
      playerBonusMoves: { testUser: 0 },
      playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 } },
      seed: 12345,
      totalMoves: 0,
      wave: 1,
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

describe('wordHandler - Blast board sync', () => {
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

  it("advances the SUBMITTING player's own board to the cascaded grid (per-player)", async () => {
    const game = makeBlastGame();
    (getGame as Mock).mockReturnValue(game);

    await handlers['submitWord']({ word: 'test', comboType: null });

    // Per-player boards: the submitter's board advances to the cascaded grid.
    // The shared template (game.letterGrid) is NOT mutated — boards are isolated.
    expect(game.blastModeState.playerBoards.testUser.grid).toBe(SENTINEL_GRID);
  });

  it('runs gravity WITHOUT refill so the board shrinks until cleared (no per-word tile generation)', async () => {
    const game = makeBlastGame();
    (getGame as Mock).mockReturnValue(game);

    await handlers['submitWord']({ word: 'test', comboType: null });

    expect(computeGravityResult as Mock).toHaveBeenCalled();
    // 9th positional arg (index 8) is `refill`. MP blast must pass false:
    // tiles only repopulate when the whole board is cleared, never per-word.
    const refillArg = (computeGravityResult as Mock).mock.calls[0][8];
    expect(refillArg).toBe(false);
  });

  it('applies vortex/magnet letter swaps to the grid BEFORE gravity so the board the next word validates against matches what the player sees', async () => {
    const game = makeBlastGame();
    game.blastModeState.grid = [['A', 'B'], ['C', 'D']];
    (getGame as Mock).mockReturnValue(game);

    // A vortex pull swaps A (0,0) with D (1,1).
    (processTilesForWord as Mock).mockReturnValueOnce({
      next: [[{}, {}], [{}, {}]],
      newlyClearedCount: 1,
      vortexLetterSwaps: [{ fromR: 0, fromC: 0, toR: 1, toC: 1 }],
    });

    await handlers['submitWord']({ word: 'test', comboType: null });

    // Gravity must run on the SWAPPED grid (A and D exchanged), not the stale one.
    expect(computeGravityResult as Mock).toHaveBeenCalled();
    const gridPassedToGravity = (computeGravityResult as Mock).mock.calls[0][0];
    expect(gridPassedToGravity).toEqual([['D', 'B'], ['C', 'A']]);
  });
});
