/**
 * TDD RED: a word from the teacher's lesson vocabulary must be worth MORE.
 *
 * `fromLesson` has been computed, stored on the WordDetail and shipped to the
 * client for months — and it drove nothing but a 📚 badge. A class playing on
 * their teacher's vocabulary scored exactly the same as a class playing a
 * random board, which means the one mechanic that connects the game to the
 * lesson taught nothing.
 *
 * The rule under test is a FLAT bonus (`LESSON_WORD_BONUS`), not a percentage,
 * and the two properties below are the reason — both are asserted as tests, not
 * just asserted in a comment:
 *
 *  - speed-neutral: `calculateWordScore` already folds in combo level, and combo
 *    is a streak/speed axis. A percentage bonus would multiply the combo-inflated
 *    score, handing the biggest lesson-word reward to the fastest tapper. The
 *    research brief is explicit that a countdown must not be the primary scoring
 *    axis; a flat bonus is worth the same on your first word and your tenth.
 *  - length-neutral: a percentage makes long lesson words pay more, steering
 *    students to hunt `photosynthesis` and skip `cell`. The teacher put both on
 *    the list because both are being taught, so both pay the same.
 *
 * It rides the same rails as the golden/lightning bonuses in this function: into
 * `updatePlayerScore` for the live leaderboard AND into `addPlayerEventBonus` for
 * the end-of-game recompute. Only one of the two is the classic split-score bug
 * (live total disagrees with the results page), so both are pinned here.
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

import { getGame, getGameBySocketId, getUsernameBySocketId, updatePlayerScore, addPlayerEventBonus, addPlayerWord } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { calculateWordScore } from '../../../backend/modules/scoringEngine';
import { LESSON_WORD_BONUS } from '../../../shared/constants/lessonScoring';
import { buildLessonVocabulary } from '../../../backend/utils/lessonVocabulary';
import { registerWordHandlers } from '../wordHandler';

/**
 * Build `lessonVocabulary` through the SERVER's own builder, not a hand-rolled
 * Set that happens to match the implementation. The round-start side and the
 * per-word read side normalize through `backend/utils/lessonVocabulary`, so
 * spelling the Set by hand here would let the two drift apart again while this
 * file stayed green — which is the whole reason that helper exists.
 */
function lessonSet(words: string[]): Set<string> {
  return buildLessonVocabulary(words, 'en');
}

function makeClassroomGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'LSN01',
    gameState: 'in-progress',
    gameMode: 'classic',
    language: 'en',
    minWordLength: 2,
    isClassroom: true,
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['X', 'Y', 'Z']],
    letterPositions: new Map(),
    playerWords: {},
    playerScores: {},
    users: {},
    lessonVocabulary: lessonSet(['cat', 'photosynthesis']),
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

function lastScoreDelta(): number {
  const calls = (updatePlayerScore as Mock).mock.calls;
  return calls[calls.length - 1][2];
}

function acceptedPayload(socket: { emit: Mock }): Record<string, unknown> {
  const call = (socket.emit as Mock).mock.calls.find(c => c[0] === 'wordAccepted');
  expect(call).toBeDefined();
  return call![1];
}

describe('wordValidationHandler - lesson vocabulary bonus', () => {
  let mockSocket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: ReturnType<typeof createMockSocket>['handlers'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSocket();
    mockSocket = mock.socket;
    handlers = mock.handlers;
    registerWordHandlers(mockIo, mockSocket as any);
    (getGameBySocketId as Mock).mockReturnValue('LSN01');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
  });

  it('awards the flat lesson bonus on top of the word score for a teacher word', async () => {
    // GIVEN a classroom board carrying the teacher's word "cat"
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(4);

    // WHEN the student finds it
    await handlers['submitWord']({ word: 'cat' });

    // THEN the credited delta is the word score plus the flat lesson bonus
    expect(lastScoreDelta()).toBe(4 + LESSON_WORD_BONUS);
  });

  it('emits lessonBonus on wordAccepted so the student can SEE the word paid more', async () => {
    // A bonus the student cannot see teaches nothing — the 📚 badge already
    // existed and carried no number, which is exactly why this was invisible.
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'cat' });

    const accepted = acceptedPayload(mockSocket);
    expect(accepted.fromLesson).toBe(true);
    expect(accepted.lessonBonus).toBe(LESSON_WORD_BONUS);
  });

  it('credits playerEventBonuses so the results page matches the live leaderboard', async () => {
    // The stored per-word score does NOT carry this bonus (same as golden/
    // lightning), so the end-of-game recompute reads it back out of the
    // per-player accumulator. Miss this and the live score and the results
    // page disagree — the split-score bug this repo already tracks.
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'cat' });

    const bonusCalls = (addPlayerEventBonus as Mock).mock.calls;
    expect(bonusCalls.length).toBeGreaterThanOrEqual(1);
    const credited = bonusCalls.reduce((sum, c) => sum + (c[2] as number), 0);
    expect(credited).toBe(LESSON_WORD_BONUS);
  });

  it('does NOT award the bonus for an ordinary word on the same classroom board', async () => {
    // "dog" is on the board but is not one of the teacher's words.
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'dog' });

    expect(lastScoreDelta()).toBe(4);
    expect(acceptedPayload(mockSocket).lessonBonus).toBeUndefined();
  });

  it('does NOT award the bonus in a non-classroom game', async () => {
    // No lessonVocabulary at all — an arcade room must score exactly as before.
    (getGame as Mock).mockReturnValue(makeClassroomGame({ lessonVocabulary: undefined, isClassroom: false }));
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'cat' });

    expect(lastScoreDelta()).toBe(4);
    expect(acceptedPayload(mockSocket).lessonBonus).toBeUndefined();
  });

  it('is length-neutral: a short teacher word pays the same bonus as a long one', async () => {
    // A percentage bonus would pay far more for "photosynthesis" than for "cat"
    // and steer students away from the short words the teacher also chose.
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(2);
    await handlers['submitWord']({ word: 'cat' });
    const shortWordBonus = lastScoreDelta() - 2;

    vi.clearAllMocks();
    (getGameBySocketId as Mock).mockReturnValue('LSN01');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(13);
    await handlers['submitWord']({ word: 'photosynthesis' });
    const longWordBonus = lastScoreDelta() - 13;

    expect(shortWordBonus).toBe(longWordBonus);
    expect(shortWordBonus).toBe(LESSON_WORD_BONUS);
  });

  it('is speed-neutral: a long combo streak does not inflate the lesson bonus', async () => {
    // calculateWordScore already folds combo in. If the lesson bonus were a
    // percentage it would multiply that, handing the fastest tapper the biggest
    // vocabulary reward — the exact scoring axis the research rules out.
    (getGame as Mock).mockReturnValue(makeClassroomGame({ playerCombos: { alice: 9 } }));
    (calculateWordScore as Mock).mockReturnValue(40); // heavily combo-inflated

    await handlers['submitWord']({ word: 'cat' });

    expect(lastScoreDelta() - 40).toBe(LESSON_WORD_BONUS);
  });

  it('still records fromLesson on the stored word detail', async () => {
    // The badge and the per-word history must keep working — the bonus is
    // added alongside the existing flag, not in place of it.
    (getGame as Mock).mockReturnValue(makeClassroomGame());
    (calculateWordScore as Mock).mockReturnValue(4);

    await handlers['submitWord']({ word: 'cat' });

    const addCall = (addPlayerWord as Mock).mock.calls.find(c => c[2] === 'cat');
    expect(addCall).toBeDefined();
    expect(addCall![3].fromLesson).toBe(true);
  });
});
