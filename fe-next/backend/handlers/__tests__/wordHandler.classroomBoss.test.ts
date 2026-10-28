/** Boss Battle v2: a validated word reduces boss HP and broadcasts state; frozen tiles refuse words. */

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
  clearGameTimer: vi.fn(),
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

import { getGame, getGameBySocketId, getUsernameBySocketId, getFirstFinder } from '../../../backend/modules/gameStateManager';
import { isWordOnBoardAsync } from '../../../backend/modules/wordValidatorPool';
import { calculateWordScore } from '../../../backend/modules/scoringEngine';
import { broadcastToRoom, volatileBroadcastToRoom, getSocketById, safeEmit } from '../../../backend/utils/socketHelpers';
import { clearGameTimer } from '../../../backend/utils/timerManager';
import { registerWordHandlers } from '../wordHandler';
import { handleWordBecameValid } from '../wordValidationHandler';
import { armRoomBoss, startRoomBossClock, tickRoomBoss, roomBossView, hasRoomBoss, endRoomBoss, roomBossWon } from '../../services/classroomBoss/roomBoss';
import { BOSS_RULES } from '../../services/classroomBoss/rules';
import { CLASSROOM_BOSS_EVENTS, BOSS_FROZEN_REASON } from '../../../shared/types/classroomBoss';
import type { GameState } from '../../modules/gameState/types';

function bossGame(overrides: Record<string, unknown> = {}): GameState {
  return {
    gameCode: 'BOSS1', gameState: 'in-progress', gameMode: 'classic', language: 'en', minWordLength: 2,
    isClassroom: true, gameSessionId: 7, modeHistory: ['classic'],
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['X', 'Y', 'Z']],
    letterPositions: new Map(), playerWords: {}, playerScores: {}, users: {},
    ...overrides,
  } as unknown as GameState;
}

function createMockSocket() {
  const handlers: Record<string, Function> = {};
  const socket = { id: 'sock', emit: vi.fn(), on: vi.fn((e: string, h: Function) => { handlers[e] = h; }), join: vi.fn(), rooms: new Set(['sock']) };
  return { socket, handlers };
}

const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as any;

function lastBossState() {
  const calls = [...(broadcastToRoom as Mock).mock.calls, ...(volatileBroadcastToRoom as Mock).mock.calls]
    .filter((c) => c[2] === CLASSROOM_BOSS_EVENTS.state);
  return calls[calls.length - 1]?.[3];
}

describe('Boss Battle v2 — word hooks', () => {
  let socket: ReturnType<typeof createMockSocket>['socket'];
  let handlers: Record<string, Function>;
  let game: GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ socket, handlers } = createMockSocket());
    registerWordHandlers(io, socket as any);
    (getGameBySocketId as Mock).mockReturnValue('BOSS1');
    (getUsernameBySocketId as Mock).mockReturnValue('alice');
    (isWordOnBoardAsync as Mock).mockResolvedValue(true);
    (getFirstFinder as Mock).mockReturnValue(null);
    (calculateWordScore as Mock).mockReturnValue(4);
    game = bossGame();
    (getGame as Mock).mockReturnValue(game);
    armRoomBoss(io, 'BOSS1', game, { bossId: 'lexiconDragon', students: 2, roundSeconds: 120, now: 1000 });
    startRoomBossClock(game, 1000);
  });

  it('given a boss round, when a student finds a word, then the boss loses HP, the room sees it and the finder gets a private hit', async () => {
    const maxHp = roomBossView(game)!.maxHp;
    await handlers['submitWord']({ word: 'cat' });
    const view = lastBossState();
    expect(view.hp).toBe(maxHp - 4);
    expect(view.lastHits[0]).toEqual({ id: 1, username: 'alice', word: 'cat', dmg: 4, crit: false });
    const accepted = (socket.emit as Mock).mock.calls.find((c) => c[0] === 'wordAccepted')![1];
    expect(accepted.boss).toEqual({ dmg: 4, crit: false, multiplier: 1, totalDmg: 4 });
  });

  it('given a word someone else found first, then the second finder still lands a half-strength hit', async () => {
    (getFirstFinder as Mock).mockReturnValue({ username: 'bob' });
    const maxHp = roomBossView(game)!.maxHp;
    await handlers['submitWord']({ word: 'cat' });
    expect(roomBossView(game)!.hp).toBe(maxHp - 2);
    const dup = (socket.emit as Mock).mock.calls.find((c) => c[0] === 'wordAlreadyFoundByOther')![1];
    expect(dup.boss.dmg).toBe(2);
  });

  it('given a frozen tile every path needs, then the word is refused with the boss reason and scores nothing', async () => {
    const view = roomBossView(game)!;
    let t = 1000 + BOSS_RULES.introMs + BOSS_RULES.openingMs;
    tickRoomBoss(io, 'BOSS1', game, 1000 + BOSS_RULES.introMs);
    tickRoomBoss(io, 'BOSS1', game, t);
    let guard = 0;
    while (roomBossView(game, t)!.effect?.kind !== 'freeze' && guard++ < 600) {
      t += 1000;
      tickRoomBoss(io, 'BOSS1', game, t);
    }
    const effect = roomBossView(game, t)!.effect;
    expect(effect?.kind).toBe('freeze');
    expect(broadcastToRoom).toHaveBeenCalledWith(io, 'game:BOSS1', 'roundEventStart', expect.objectContaining({
      eventType: 'blizzard',
      data: { blizzard: { frozenTiles: effect!.tiles } },
    }));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(t + 1);
    (isWordOnBoardAsync as Mock).mockImplementation(async (_w: string, grid: string[][]) => !grid.flat().includes('#'));
    await handlers['submitWord']({ word: 'cat' });
    expect(socket.emit).toHaveBeenCalledWith('wordRejected', { word: 'cat', reason: BOSS_FROZEN_REASON });
    expect(roomBossView(game, t)!.hp).toBe(view.maxHp);
    vi.useRealTimers();
  });

  it('given the class lands the killing blow, then the round clock stops at once', async () => {
    (calculateWordScore as Mock).mockReturnValue(10_000);
    // Boss armor caps each hit, so it takes a volley of words, never one.
    await handlers['submitWord']({ word: 'cat' });
    expect(lastBossState().status).not.toBe('defeated');
    for (let i = 0; i < 12; i++) await handlers['submitWord']({ word: 'cat' });
    expect(lastBossState().status).toBe('defeated');
    expect(clearGameTimer).toHaveBeenCalledWith('BOSS1');
    endRoomBoss(io, 'BOSS1', game);
    expect(roomBossWon('BOSS1', '7')).toBe(true);
  });

  it('given the next classroom round has no boss, when armed, then the old boss is gone and clients are told to clear', () => {
    armRoomBoss(io, 'BOSS1', game, { bossId: undefined, students: 2, roundSeconds: 120 });
    expect(hasRoomBoss(game)).toBe(false);
    expect(broadcastToRoom).toHaveBeenLastCalledWith(io, 'game:BOSS1', CLASSROOM_BOSS_EVENTS.state, null);
  });

  it('given the timer ran out with HP left, then the round is recorded as an escape (no win chest)', () => {
    endRoomBoss(io, 'BOSS1', game);
    expect(lastBossState().status).toBe('escaped');
    expect(roomBossWon('BOSS1', '7')).toBe(false);
  });

  it('given a plain classic round, then words never carry a boss hit', async () => {
    armRoomBoss(io, 'BOSS1', game, { bossId: undefined, students: 2, roundSeconds: 120 });
    await handlers['submitWord']({ word: 'cat' });
    const accepted = (socket.emit as Mock).mock.calls.find((c) => c[0] === 'wordAccepted')![1];
    expect(accepted.boss).toBeUndefined();
  });

  it('given a word the class voted valid, then it hits the boss and only the submitter is told their damage', () => {
    const submitterSocket = { id: 'sub' };
    (getSocketById as Mock).mockReturnValue(submitterSocket);
    game = bossGame({
      users: { bob: { socketId: 'sub' } },
      playerWordDetails: { bob: [{ word: 'zyx', score: 3, validated: false }] },
    });
    armRoomBoss(io, 'BOSS1', game, { bossId: 'lexiconDragon', students: 2, roundSeconds: 120, now: 1000 });
    startRoomBossClock(game, 1000);
    const maxHp = roomBossView(game)!.maxHp;
    handleWordBecameValid(io, socket as any, game, 'BOSS1', 'zyx', 'bob');
    expect(roomBossView(game)!.hp).toBe(maxHp - 3);
    const sent = (safeEmit as Mock).mock.calls.find((c) => c[1] === 'wordValidatedByVotes')!;
    expect(sent[0]).toBe(submitterSocket);
    expect(sent[2].boss.dmg).toBe(3);
  });
});
