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
  tryBeginWaveAdvance: vi.fn(() => true),
  endWaveAdvance: vi.fn(),
}));

vi.mock('../../../backend/services/gameLifecycle/gameEnd', () => ({
  endGame: vi.fn(),
}));

vi.mock('@/components/blast/utils/clearTilesProcessor', () => ({
  processTilesForWord: vi.fn().mockReturnValue({
    next: [[{ letter: 'A', type: 'standard', isCleared: true }]],
    newlyClearedCount: 1,
  }),
}));

vi.mock('@/components/blast/utils/blastGravity', () => ({
  computeGravityResult: vi.fn().mockReturnValue({
    newGrid: [['A']],
    newTileStates: [[{ letter: 'A', type: 'standard', isCleared: true }]],
  }),
}));

vi.mock('@/components/blast/utils/blastLetterGenerator', () => ({
  createSeededRandom: vi.fn(() => () => 0.5),
}));

// Import mocks
import { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { isDictionaryWord, isValidWordCached } from '../../../backend/dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../../../backend/modules/communityWordManager';
import { broadcastToRoom } from '../../../backend/utils/socketHelpers';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove, isBlastBoardCleared, advanceBlastWave } from '../../../backend/modules/blastModeManager';
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

      const calls = (broadcastToRoom as Mock).mock.calls;
      const foundWordCall = calls.find((call: any[]) => call[2] === 'playerFoundWord');
      expect(foundWordCall).toBeDefined();
      const payload = foundWordCall[3];
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

    it('should include comboSync in playerFoundWord with correct room', async () => {
      await handlers['submitWord']({ word: 'test', comboType: 'lightning_prism' });

      const calls = (broadcastToRoom as Mock).mock.calls;
      const foundWordCall = calls.find((call: any[]) => call[2] === 'playerFoundWord');
      expect(foundWordCall).toBeDefined();
      expect(foundWordCall[1]).toBe('game:BLAST1');
      expect(foundWordCall[3].comboSync).toEqual({
        comboType: 'lightning_prism',
        username: 'testUser',
      });
    });
  });

  describe('win condition — board cleared (fix #6)', () => {
    // Final wave so a board clear triggers endGame (not wave-advance).
    const blastStateWithBoard = {
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 3 },
      playerBonusMoves: { testUser: 0 },
      playerStats: { testUser: { maxCombo: 0, gemsCollected: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0 } },
      seed: 12345,
      wave: 3,
      totalMoves: 0,
      grid: [['A']],
      tileStates: [[{ letter: 'A', type: 'standard', isCleared: false }]],
    };

    it('should schedule a delayed endGame via timerManager when board is cleared', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: blastStateWithBoard }));

      await handlers['submitWord']({ word: 'test' });

      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((call: any[]) => call[0] === 'blastEnd:BLAST1');
      expect(scheduled).toBeDefined();
      expect(typeof scheduled[1]).toBe('function');
      expect(scheduled[2]).toBe(1500);
    });

    it('should NOT schedule endGame when board is not cleared', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(false);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: blastStateWithBoard }));

      await handlers['submitWord']({ word: 'test' });

      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((call: any[]) => call[0] === 'blastEnd:BLAST1');
      expect(scheduled).toBeUndefined();
      expect(endGame as Mock).not.toHaveBeenCalled();
    });

    it('should call endGame inside the timer callback when game is still in-progress', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: blastStateWithBoard }));

      await handlers['submitWord']({ word: 'test' });

      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((call: any[]) => call[0] === 'blastEnd:BLAST1');
      expect(scheduled).toBeDefined();

      // Invoke the scheduled callback — getGame still returns in-progress
      scheduled[1]();
      expect(endGame as Mock).toHaveBeenCalledWith(mockIo, 'BLAST1');
    });

    it('should NOT call endGame inside the timer callback when game already ended', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: blastStateWithBoard }));

      await handlers['submitWord']({ word: 'test' });

      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((call: any[]) => call[0] === 'blastEnd:BLAST1');

      // Simulate game having ended between schedule and fire
      (getGame as Mock).mockReturnValue(makeBlastGame({ gameState: 'ended', blastModeState: blastStateWithBoard }));
      scheduled[1]();
      expect(endGame as Mock).not.toHaveBeenCalled();
    });
  });

  describe('wave advancement (MP blast multi-wave)', () => {
    const makeCleared = (wave: number) => ({
      overlay: [],
      overlayMap: new Map(),
      playerMoves: { testUser: 3 },
      playerBonusMoves: { testUser: 0 },
      playerStats: { testUser: { maxCombo: 2, gemsCollected: 4, wordsFound: ['hi'], bestWord: 'hi', tilesCleared: 6, totalTileBonus: 10 } },
      seed: 12345,
      wave,
      totalMoves: 0,
      grid: [['A']],
      tileStates: [[{ letter: 'A', type: 'standard', isCleared: true }]],
    });

    it('advances wave and emits blastWaveAdvance when wave < max on clear', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeCleared(1) }));

      await handlers['submitWord']({ word: 'test' });

      expect(advanceBlastWave as Mock).toHaveBeenCalled();
      const calls = (broadcastToRoom as Mock).mock.calls;
      const waveCall = calls.find((c: any[]) => c[2] === 'blastWaveAdvance');
      expect(waveCall).toBeDefined();
      expect(waveCall[3].wave).toBe(2);
      expect(waveCall[3].grid).toBeDefined();
      expect(waveCall[3].tileStates).toBeDefined();
      expect(waveCall[3].seed).toBeDefined();
    });

    it('does NOT schedule endGame when advancing mid-run', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeCleared(1) }));

      await handlers['submitWord']({ word: 'test' });

      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((c: any[]) => c[0] === 'blastEnd:BLAST1');
      expect(scheduled).toBeUndefined();
    });

    it('schedules endGame (not advance) when final wave cleared', async () => {
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeCleared(3) }));

      await handlers['submitWord']({ word: 'test' });

      expect(advanceBlastWave as Mock).not.toHaveBeenCalled();
      const setTimeoutMock = timerManager.setTimeout as unknown as Mock;
      const scheduled = setTimeoutMock.mock.calls.find((c: any[]) => c[0] === 'blastEnd:BLAST1');
      expect(scheduled).toBeDefined();
    });

    it('final wave clear stops all bots immediately (H3)', async () => {
      const botManager = await import('../../../backend/modules/botManager');
      (isBlastBoardCleared as Mock).mockReturnValue(true);
      (getGame as Mock).mockReturnValue(makeBlastGame({ blastModeState: makeCleared(3) }));

      await handlers['submitWord']({ word: 'test' });

      expect(botManager.stopAllBots as Mock).toHaveBeenCalledWith('BLAST1');
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
