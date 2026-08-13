/**
 * Word Handler - Blast Combo Sync Tests (52-02)
 * Tests for blastComboSync broadcast when a player submits a word with a combo
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

vi.mock('../../../backend/modules/botManager', () => ({ isBot: vi.fn(() => false), stopAllBots: vi.fn(), cleanupGameBots: vi.fn(), getGameBots: vi.fn(() => []), getBotByUsername: vi.fn(), addBot: vi.fn(), removeBot: vi.fn(), resetBotCombo: vi.fn(), addWordToBlacklist: vi.fn(), resyncBotsForNewGrid: vi.fn() }));

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
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
  getWordPath: vi.fn().mockReturnValue([]),
  isBlastBoardCleared: vi.fn().mockReturnValue(false),
  advanceBlastWave: vi.fn((state: any, _code: string, grid: string[][]) => ({
    overlay: [],
    overlayMap: new Map(),
    playerMoves: Object.fromEntries(Object.keys(state.playerMoves).map((u) => [u, 0])),
    playerBonusMoves: Object.fromEntries(Object.keys(state.playerMoves).map((u) => [u, 0])),
    playerStats: state.playerStats,
    seed: 99999,
    wave: state.wave + 1,
    totalMoves: 0,
    grid,
    tileStates: grid.map((row) => row.map((letter) => ({ letter, type: 'standard', isCleared: false }))),
  })),
  regenerateBlastBoard: vi.fn((state: any, _code: string, grid: string[][]) => ({
    overlay: [],
    overlayMap: new Map(),
    playerMoves: state.playerMoves,
    playerBonusMoves: state.playerBonusMoves,
    playerStats: state.playerStats,
    seed: 88888,
    wave: state.wave,
    refillCount: (state.refillCount ?? 0) + 1,
    totalMoves: state.totalMoves,
    grid,
    tileStates: grid.map((row) => row.map((letter) => ({ letter, type: 'standard', isCleared: false }))),
  })),
  recordBlastBoardClear: vi.fn(),
  tryBeginWaveAdvance: vi.fn(() => true),
  endWaveAdvance: vi.fn(),
  // Per-player board model.
  getOrInitPlayerBoard: vi.fn(() => ({
    grid: [['A']],
    tileStates: [[{ letter: 'A', type: 'standard', isCleared: false }]],
    overlay: [], overlayMap: new Map(), seed: 1, totalMoves: 0, refillCount: 0,
  })),
  cascadeBlastWord: vi.fn((board: any) => {
    board.totalMoves = (board.totalMoves ?? 0) + 1;
    return { clearedCount: 1, totalMoves: board.totalMoves };
  }),
  safeCascadeBlastWord: vi.fn((board: any) => {
    const updatedBoard = { ...board, totalMoves: (board.totalMoves ?? 0) + 1 };
    return { ok: true, board: updatedBoard, clearedCount: 1, totalMoves: updatedBoard.totalMoves };
  }),
  regeneratePlayerBoard: vi.fn(),
}));

vi.mock('../../../backend/services/gameLifecycle/gameEnd', () => ({
  endGame: vi.fn(),
}));

vi.mock('@/components/blast/legacy/utils/clearTilesProcessor', () => ({
  processTilesForWord: vi.fn().mockReturnValue({
    next: [[{ letter: 'A', type: 'standard', isCleared: true }]],
    newlyClearedCount: 1,
  }),
}));

vi.mock('@/components/blast/legacy/utils/blastGravity', () => ({
  computeGravityResult: vi.fn().mockReturnValue({
    newGrid: [['A']],
    newTileStates: [[{ letter: 'A', type: 'standard', isCleared: true }]],
  }),
}));

vi.mock('@/components/blast/legacy/utils/blastLetterGenerator', () => ({
  createSeededRandom: vi.fn(() => () => 0.5),
}));

// Import mocks
import { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder, recordFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { broadcastToRoom, safeEmit } from '../../../backend/utils/socketHelpers';
import { queuePlayerFoundWord } from '../../../backend/utils/playerFoundWordBatcher';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove, isBlastBoardCleared, advanceBlastWave, regenerateBlastBoard, recordBlastBoardClear } from '../../../backend/modules/blastModeManager';
import { endGame } from '../../../backend/services/gameLifecycle/gameEnd';
import timerManager from '../../../backend/utils/timerManager';
import { registerWordHandlers } from '../wordHandler';

/** Helper to build a blast-mode game state */
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
    users: { testUser: { isHost: false, socketId: 'socket-test-user' } },
    blastModeState: null, // No blast state — prevents tile bonus branch
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

describe('wordHandler - blastComboSync broadcast (52-02)', () => {
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

  describe('submitWord payload schema', () => {
    it('should accept submitWord payload that includes optional comboType field', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'bomb_bomb' });
      // No assertion needed — just verify it doesn't throw
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should accept submitWord payload without comboType field (backward compat)', async () => {
      await handlers['submitWord']({ word: 'test' });
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  describe('blastComboSync broadcast', () => {
    it('should include comboSync in playerFoundWord when comboType is provided', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'bomb_bomb' });

      // playerFoundWord is coalesced via the batcher: queuePlayerFoundWord(io, gameCode, payload)
      const calls = (queuePlayerFoundWord as Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const payload = calls[0][2];
      expect(payload.comboSync).toBeDefined();
      expect(payload.comboSync.comboType).toBe('bomb_bomb');
      expect(payload.comboSync.username).toBe('testUser');
    });

    it('should NOT broadcast blastComboSync when comboType is absent', async () => {
      await handlers['submitWord']({ word: 'test' });

      const calls = (broadcastToRoom as Mock).mock.calls;
      const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
      expect(comboSyncCall).toBeUndefined();
    });

    it('should NOT broadcast blastComboSync when comboType is null', async () => {
      await handlers['submitWord']({ word: 'test', comboType: null });

      const calls = (broadcastToRoom as Mock).mock.calls;
      const comboSyncCall = calls.find((call: any[]) => call[2] === 'blastComboSync');
      expect(comboSyncCall).toBeUndefined();
    });

    it('should include comboSync in playerFoundWord with correct gameCode', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'lightning_prism' });

      // queuePlayerFoundWord(io, gameCode, payload) — call[1] is the raw gameCode
      const calls = (queuePlayerFoundWord as Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const foundWordCall = calls[0];
      expect(foundWordCall[1]).toBe('BLAST1');
      expect(foundWordCall[2].comboSync).toEqual({
        comboType: 'lightning_prism',
        username: 'testUser',
      });
    });
  });

  describe('Blast board clear — timer era', () => {
    // Build a near-clear scenario: all tiles except the word path are already cleared.
    // When we submit the word, the remaining tile clears, board becomes fully clear,
    // triggers regeneration instead of wave advance.
    const makeBlastStateNearClear = () => ({
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 3 },
      playerBonusMoves: { testUser: 0 },
      playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 } },
      seed: 12345,
      wave: 1,
      refillCount: 0,
      totalMoves: 5,
      grid: [['A', 'B', 'C']],
      // A=cleared, B=cleared, C=uncleared (word will hit C)
      tileStates: [
        [{ letter: 'A', type: 'standard', isCleared: true }, { letter: 'B', type: 'standard', isCleared: true }, { letter: 'C', type: 'standard', isCleared: false }],
      ],
    });

    it('regenerates the board in place on full clear, game stays in-progress', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeBlastStateNearClear() }));

      await handlers['submitWord']({ word: 'test' });

      const game = (getGame as Mock).mock.results[0].value;
      expect(game.gameState).toBe('in-progress');
    });

    it('clears player gets boardClears credit', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      const state = makeBlastStateNearClear();
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: state }));

      await handlers['submitWord']({ word: 'test' });

      expect(recordBlastBoardClear as Mock).toHaveBeenCalled();
      const [passedState, username] = (recordBlastBoardClear as Mock).mock.calls[0];
      expect(username).toBe('testUser');
    });

    it('UNICASTS blastBoardUpdate to the player (per-player boards) on timer-era clear', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeBlastStateNearClear() }));

      await handlers['submitWord']({ word: 'test' });

      // Per-player boards: the regenerated board is unicast to the submitting
      // socket via safeEmit, NOT broadcastToRoom (which would re-sync everyone).
      const emitCall = (safeEmit as Mock).mock.calls.find((c: any[]) => c[1] === 'blastBoardUpdate');
      expect(emitCall).toBeDefined();
      const broadcastBoard = (broadcastToRoom as Mock).mock.calls.find((c: any[]) => c[2] === 'blastBoardUpdate');
      expect(broadcastBoard).toBeUndefined();
    });

    it('never schedules endGame on timer-era board clear', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeBlastStateNearClear() }));

      await handlers['submitWord']({ word: 'test' });

      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((c: any[]) => c[0] === 'blastEnd:BLAST1');
      expect(scheduled).toBeUndefined();
      expect(endGame as Mock).not.toHaveBeenCalled();
    });
  });

  describe('first-finder flag on broadcasts (L2)', () => {
    it('sets isFirstFinder: true on wordAccepted + playerFoundWord when recordFirstFinder returns true', async () => {
      (recordFirstFinder as Mock).mockReturnValue(true);

      await handlers['submitWord']({ word: 'test' });

      const wordAcceptedCall = (mockSocket.emit as Mock).mock.calls.find(
        (c: any[]) => c[0] === 'wordAccepted'
      );
      expect(wordAcceptedCall).toBeDefined();
      expect(wordAcceptedCall[1].isFirstFinder).toBe(true);

      const foundWordCall = (queuePlayerFoundWord as Mock).mock.calls[0];
      expect(foundWordCall).toBeDefined();
      expect(foundWordCall[2].isFirstFinder).toBe(true);
    });

    it('sets isFirstFinder: false on both broadcasts when recordFirstFinder returns false', async () => {
      (recordFirstFinder as Mock).mockReturnValue(false);

      await handlers['submitWord']({ word: 'test' });

      const wordAcceptedCall = (mockSocket.emit as Mock).mock.calls.find(
        (c: any[]) => c[0] === 'wordAccepted'
      );
      expect(wordAcceptedCall[1].isFirstFinder).toBe(false);

      const foundWordCall = (queuePlayerFoundWord as Mock).mock.calls[0];
      expect(foundWordCall[2].isFirstFinder).toBe(false);
    });
  });

  describe('wordAccepted blast field includes comboType (merged Fix 2)', () => {
    it('should include blast field with comboType in wordAccepted when blast mode is active', async () => {
      (recordBlastMove as Mock).mockReturnValue({ movesUsed: 4, bonusMove: true });
      (calculateBlastTileBonus as Mock).mockReturnValue(10);
      (getTilesOnPath as Mock).mockReturnValue(['bomb']);

      (getGame as Mock).mockReturnValue(makeBlastGame({
        blastModeState: {
          overlay: [],
          overlayMap: new Map(),
          playerMoves: { testUser: 3 },
          playerBonusMoves: { testUser: 0 },
          playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 } },
          seed: 12345,
        },
      }));

      await handlers['submitWord']({ word: 'test', comboType: 'bomb_lightning' });

      const wordAcceptedCall = (mockSocket.emit as Mock).mock.calls.find(
        (call: any[]) => call[0] === 'wordAccepted'
      );
      expect(wordAcceptedCall).toBeDefined();
      const data = wordAcceptedCall[1];
      expect(data.blast).toBeDefined();
      expect(data.blast.comboType).toBe('bomb_lightning');
      expect(typeof data.blast.movesUsed).toBe('number');
      expect(typeof data.blast.bonusMove).toBe('boolean');
    });
  });
});
