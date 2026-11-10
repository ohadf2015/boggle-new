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
  calculateBlastTileBonus: vi.fn().mockReturnValue(0),
  getTilesOnBoardPath: vi.fn().mockReturnValue([]),
  recordBlastCollection: vi.fn(() => 0),
  recordBlastMove: vi.fn().mockReturnValue(null),
}));

import { getGame, getGameBySocketId, getUsernameBySocketId, updatePlayerScore } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { calculateWordScore } from '../../../backend/modules/scoringEngine';
import { broadcastToRoom } from '../../../backend/utils/socketHelpers';
import { LESSON_CLAIM_BONUS, LESSON_WORD_BONUS } from '../../../shared/constants/lessonScoring';
import { LESSON_WORD_CLAIMED_EVENT } from '../../../shared/types/lessonClaims';
import { buildLessonVocabulary } from '../../../backend/utils/lessonVocabulary';
import { startLessonClaims } from '../../../backend/modules/lessonClaims';
import { registerWordHandlers } from '../wordHandler';

function raceGame() {
  return {
    gameCode: 'LSN01',
    gameState: 'in-progress',
    gameMode: 'classic',
    gameSessionId: 7,
    language: 'en',
    minWordLength: 2,
    isClassroom: true,
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['X', 'Y', 'Z']],
    letterPositions: new Map(),
    playerWords: {},
    playerScores: {},
    users: {
      teacher: { isHost: true, socketId: 'teacher-socket' },
      alice: { isHost: false, socketId: 'student-socket', authUserId: 'auth-alice', avatar: { emoji: '🦊', color: '#fff' } },
      bob: { isHost: false, socketId: 'bob-socket' },
    },
    lessonVocabulary: buildLessonVocabulary(['cat', 'dog'], 'en'),
    lessonClaims: startLessonClaims({ placedWords: ['cat', 'dog'], language: 'en', gameMode: 'classic', playingHumans: 2, roundId: 7, teams: null }),
  };
}

function studentSocket() {
  const handlers: Record<string, Function> = {};
  const socket = {
    id: 'student-socket',
    data: { verifiedUserId: 'auth-alice', authUnverified: false },
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    join: vi.fn(),
    rooms: new Set(['student-socket']),
  };
  return { socket, handlers };
}

const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

function claimBroadcasts() {
  return (broadcastToRoom as Mock).mock.calls.filter((c) => c[2] === LESSON_WORD_CLAIMED_EVENT);
}

describe('Lesson Word Race through the real word handler', () => {
  let handlers: Record<string, Function>;
  let socket: ReturnType<typeof studentSocket>['socket'];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ socket, handlers } = studentSocket());
    registerWordHandlers(io, socket as any);
    (getGameBySocketId as Mock).mockReturnValue('LSN01');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (calculateWordScore as Mock).mockReturnValue(4);
  });

  it('Given a verified student finds an unclaimed lesson word, When accepted, Then the room hears the claim and the claimer gets +3 on top', async () => {
    (getGame as Mock).mockReturnValue(raceGame());

    await handlers['submitWord']({ word: 'cat' });

    const claims = claimBroadcasts();
    expect(claims).toHaveLength(1);
    expect(claims[0][1]).toBe('game:LSN01');
    expect(claims[0][3]).toMatchObject({ word: 'cat', username: 'alice', claimedCount: 1, total: 2, bonus: LESSON_CLAIM_BONUS, roundId: 7 });
    const deltas = (updatePlayerScore as Mock).mock.calls.map((c) => c[2] as number);
    expect(deltas.reduce((a, b) => a + b, 0)).toBe(4 + LESSON_WORD_BONUS + LESSON_CLAIM_BONUS);
    const accepted = (socket.emit as Mock).mock.calls.find((c) => c[0] === 'wordAccepted')![1];
    expect(accepted.lessonClaimBonus).toBe(LESSON_CLAIM_BONUS);
  });

  it('Given the word is already claimed, When a second student finds it, Then no claim is broadcast and only the lesson bonus pays', async () => {
    const game = raceGame();
    game.lessonClaims!.slots[0].claim = { word: 'cat', username: 'bob', avatar: null, teamId: null };
    (getGame as Mock).mockReturnValue(game);

    await handlers['submitWord']({ word: 'cat' });

    expect(claimBroadcasts()).toHaveLength(0);
    const deltas = (updatePlayerScore as Mock).mock.calls.map((c) => c[2] as number);
    expect(deltas.reduce((a, b) => a + b, 0)).toBe(4 + LESSON_WORD_BONUS);
  });
});
