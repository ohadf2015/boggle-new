/**
 * Teacher pause — word submissions are rejected server-side while paused.
 * The overlay makes the board non-interactive, but a queued drag / keyboard
 * submit can still arrive; the server is the source of truth.
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
  validateBlastWordPath: vi.fn().mockReturnValue(null),
  getTilesOnResolvedPath: vi.fn().mockReturnValue([]),
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnPath: vi.fn().mockReturnValue([]),
  recordBlastMove: vi.fn().mockReturnValue(null),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { emitError } from '../../../backend/utils/errorHandler';
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

function pausedGame() {
  return {
    gameCode: 'TEST123',
    gameState: 'in-progress',
    isPaused: true,
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
}

describe('wordHandler submitWord — teacher pause', () => {
  let socket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ socket, handlers } = createMockSocket());
    registerWordHandlers(mockIo, socket as any);
    (getGameBySocketId as Mock).mockReturnValue('TEST123');
    (getUsernameBySocketId as Mock).mockReturnValue('testUser');
    (getFirstFinder as Mock).mockReturnValue(null);
  });

  it('rejects a word with reason "paused" and never validates it', async () => {
    // GIVEN a classroom round the teacher has paused
    (getGame as Mock).mockReturnValue(pausedGame());

    // WHEN a student submits a word anyway
    await handlers['submitWord']({ word: 'test' });

    // THEN it is bounced with a small wordRejected (not a generic error) and no validation ran
    expect(socket.emit).toHaveBeenCalledWith('wordRejected', { word: 'test', reason: 'paused' });
    expect(isWordOnBoardAsync).not.toHaveBeenCalled();
    expect(emitError).not.toHaveBeenCalled();
  });

  it('validates normally once the pause is lifted', async () => {
    (getGame as Mock).mockReturnValue({ ...pausedGame(), isPaused: false });
    (isWordOnBoardAsync as Mock).mockResolvedValue(false);

    await handlers['submitWord']({ word: 'test' });

    expect(isWordOnBoardAsync).toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('wordRejected', expect.objectContaining({ reason: 'paused' }));
  });
});
