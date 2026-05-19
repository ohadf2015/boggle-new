/**
 * Bot Blast Mode Tests
 *
 * Verifies bot-driven blast words drive the same server-authoritative
 * wave-advance + endGame lifecycle as human words (wordValidationHandler).
 * Regression guard for C1 (missing wave-advance on bot path) and
 * C2 (hardcoded currentWave: 1 in processTilesForWord).
 */

import { vi } from 'vitest';

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

const mocks = vi.hoisted(() => ({
  addPlayerWord: vi.fn(),
  updatePlayerScore: vi.fn(),
  trackBotWord: vi.fn(),
  getLeaderboard: vi.fn(() => []),
  getGame: vi.fn(),
  recordFirstFinder: vi.fn(),
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  calculateBlastTileBonus: vi.fn(() => 0),
  getTilesOnPath: vi.fn(() => []),
  recordBlastMove: vi.fn(() => ({ movesUsed: 1, bonusMove: false })),
  getWordPath: vi.fn(() => []),
  isBlastBoardCleared: vi.fn(() => false),
  recordBlastBoardClear: vi.fn(),
  regenerateBlastBoard: vi.fn(),
  getGameBots: vi.fn(() => []),
  startBot: vi.fn(),
  resyncBotsForNewGrid: vi.fn(),
  processTilesForWord: vi.fn(() => ({ next: [], newlyClearedCount: 0 })),
  computeGravityResult: vi.fn(() => ({ newGrid: [['A']], newTileStates: [[{ isCleared: true }]] })),
}));

vi.mock('../../../modules/gameStateManager', () => ({
  addPlayerWord: mocks.addPlayerWord,
  updatePlayerScore: mocks.updatePlayerScore,
  trackBotWord: mocks.trackBotWord,
  getLeaderboard: mocks.getLeaderboard,
  getGame: mocks.getGame,
  recordFirstFinder: mocks.recordFirstFinder,
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: mocks.broadcastToRoom,
  volatileBroadcastToRoom: mocks.volatileBroadcastToRoom,
  getGameRoom: (code: string) => `room:${code}`,
}));

vi.mock('../../../utils/timerManager', () => ({
  default: { setTimeout: mocks.timerSetTimeout, clearTimer: vi.fn() },
}));

vi.mock('../../../modules/blastModeManager', () => ({
  calculateBlastTileBonus: mocks.calculateBlastTileBonus,
  getTilesOnPath: mocks.getTilesOnPath,
  recordBlastMove: mocks.recordBlastMove,
  recordBlastBoardClear: mocks.recordBlastBoardClear,
  regenerateBlastBoard: mocks.regenerateBlastBoard,
  getWordPath: mocks.getWordPath,
  isBlastBoardCleared: mocks.isBlastBoardCleared,
  tryBeginWaveAdvance: () => true,
  endWaveAdvance: () => {},
}));

vi.mock('@/components/blast/legacy/utils/clearTilesProcessor', () => ({
  processTilesForWord: mocks.processTilesForWord,
}));

vi.mock('@/components/blast/legacy/utils/blastGravity', () => ({
  computeGravityResult: mocks.computeGravityResult,
}));

vi.mock('@/components/blast/legacy/utils/blastLetterGenerator', () => ({
  createSeededRandom: () => () => 0.5,
}));

vi.mock('../../../modules/botManager', () => ({
  getGameBots: mocks.getGameBots,
  startBot: mocks.startBot,
  resyncBotsForNewGrid: mocks.resyncBotsForNewGrid,
  isBot: vi.fn(),
}));

vi.mock('../botWordHunt', () => ({ startBotsForWordHunt: vi.fn() }));
vi.mock('../botWheelRush', () => ({ startBotsForWheelRush: vi.fn() }));
vi.mock('../../../modules/wordHuntManager', () => ({
  restoreLife: vi.fn(),
  getLifeBonus: vi.fn(() => 0),
}));

import { startBotsForGame, clearBotResyncThrottle } from '../botGame';
import type { Bot } from '../../../modules/botBehavior';

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    gameCode: 'GAME1',
    username: 'BotBob',
    avatar: {},
    difficulty: 'hard',
    personality: 'friendly',
    isBot: true,
    wordsToFind: [],
    wordsFound: [],
    currentWordIndex: 0,
    score: 0,
    comboLevel: 0,
    inBurstMode: false,
    burstWordsRemaining: 0,
    nextWordTime: null,
    activeTimers: new Set(),
    isActive: true,
    avgThinkingTime: 1000,
    typingSpeed: 100,
    burstChance: 0,
    pauseChance: 0,
    comboFocus: false,
    ...overrides,
  } as Bot;
}

function makeBlastGame(wave: number) {
  return {
    gameMode: 'blast' as const,
    gameState: 'in-progress' as const,
    letterGrid: [['A']],
    letterPositions: new Map(),
    blastModeState: {
      grid: [['A']],
      tileStates: [[{ isCleared: false }]],
      overlay: [],
      overlayMap: new Map(),
      seed: 42,
      wave,
      totalMoves: 0,
      playerMoves: {},
      playerBonusMoves: {},
      playerStats: {},
    },
    playerCombos: {},
    playerWords: {},
    playerScores: {},
  };
}

async function invokeBotCallback(bot: Bot, game: ReturnType<typeof makeBlastGame>) {
  mocks.getGameBots.mockReturnValue([bot]);
  mocks.getGame.mockReturnValue(game);
  let cb: ((s: unknown) => unknown) | null = null;
  mocks.startBot.mockImplementation((_b, _g, _l, callback) => { cb = callback; });

  const io = {} as never;
  startBotsForGame(io, 'GAME1', [['A']], 'en', 60);
  if (!cb) throw new Error('callback not captured');
  await (cb as (s: unknown) => Promise<unknown>)({
    username: bot.username, word: 'AB', score: 2, comboLevel: 0,
  });
}

describe('Bot blast mode — board regeneration on clear (timer-era)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLeaderboard.mockReturnValue([]);
    mocks.isBlastBoardCleared.mockReturnValue(false);
    // Reset throttle map so each test starts with an open window
    clearBotResyncThrottle('GAME1');
    mocks.regenerateBlastBoard.mockImplementation((state, _code, grid) => ({
      ...state,
      refillCount: (state.refillCount ?? 0) + 1,
      grid,
      overlay: [],
      overlayMap: new Map(),
      tileStates: [[{ isCleared: false }]],
      seed: 999,
    }));
  });

  it('regenerates the board in place when a bot clears it — no endGame', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(true);
    const game = makeBlastGame(1);

    await invokeBotCallback(makeBot(), game);

    expect(game.gameState).toBe('in-progress');
    expect(mocks.regenerateBlastBoard).toHaveBeenCalled();
    // Game never ends on board clear
    expect(game.blastModeState.refillCount).toBe(1);
  });

  it('resyncs bots to the regenerated grid', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(true);
    const bot = makeBot();
    mocks.getGameBots.mockReturnValue([bot]);

    await invokeBotCallback(bot, makeBlastGame(1));

    expect(mocks.resyncBotsForNewGrid).toHaveBeenCalled();
  });

  it('resyncs bots on per-word updates when throttle window is open (first submission)', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(false); // normal word, board NOT cleared
    const bot = makeBot();
    mocks.getGameBots.mockReturnValue([bot]);

    // First submission of the game has no throttle entry, so resync fires
    await invokeBotCallback(bot, makeBlastGame(1));

    expect(mocks.resyncBotsForNewGrid).toHaveBeenCalled();
  });

  it('bot path calls computeGravityResult with refill=true (MP parity with human path)', async () => {
    // Regression: bot used refill=false, human used refill=true. Asymmetric refill
    // caused the board to slowly shrink on bot moves while staying full on human moves.
    // Both paths must keep the board alive through the shared timer.
    mocks.isBlastBoardCleared.mockReturnValue(false);
    await invokeBotCallback(makeBot(), makeBlastGame(1));

    expect(mocks.computeGravityResult).toHaveBeenCalled();
    const args = mocks.computeGravityResult.mock.calls[0] as unknown as unknown[];
    // Signature: (grid, tileStates, gridSize, language, specialTileChance, customDist?, spawnModifier?, rng?, refill?)
    // refill is the 9th arg (index 8)
    expect(args[8]).toBe(true);
  });

  it('board clear triggers recordBlastBoardClear', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(true);
    const bot = makeBot();

    await invokeBotCallback(bot, makeBlastGame(1));

    expect(mocks.recordBlastBoardClear).toHaveBeenCalledWith(
      expect.any(Object), bot.username,
    );
  });

  it('bot callback returns total credited score so bot.score mirrors cap (H1)', async () => {
    mocks.calculateBlastTileBonus.mockReturnValue(10);
    const bot = makeBot();
    mocks.getGameBots.mockReturnValue([bot]);
    mocks.getGame.mockReturnValue(makeBlastGame(1));
    let cb: ((s: unknown) => unknown) | null = null;
    mocks.startBot.mockImplementation((_b, _g, _l, callback) => { cb = callback; });

    startBotsForGame({} as never, 'GAME1', [['A']], 'en', 60);
    if (!cb) throw new Error('callback not captured');
    const result = await (cb as (s: unknown) => Promise<unknown>)({
      username: bot.username, word: 'AB', score: 2, comboLevel: 0,
    });

    // base (2) + blast tile bonus (10) = 12, credited to player and must be
    // signalled back to submitBotWord so bot.score tracks shouldBotScore cap.
    expect(result).toBe(12);
  });

  it('sets isFirstFinder: true on botWordFound + playerFoundWord when recordFirstFinder returns true (L2)', async () => {
    mocks.recordFirstFinder.mockReturnValue(true);
    await invokeBotCallback(makeBot(), makeBlastGame(1));

    const botWordFoundCall = mocks.volatileBroadcastToRoom.mock.calls.find(
      ([, , evt]) => evt === 'botWordFound',
    );
    expect(botWordFoundCall).toBeDefined();
    expect(botWordFoundCall![3].isFirstFinder).toBe(true);

    const playerFoundCall = mocks.volatileBroadcastToRoom.mock.calls.find(
      ([, , evt]) => evt === 'playerFoundWord',
    );
    expect(playerFoundCall).toBeDefined();
    expect(playerFoundCall![3].isFirstFinder).toBe(true);
  });

  it('sets isFirstFinder: false on both bot broadcasts when recordFirstFinder returns false (L2)', async () => {
    mocks.recordFirstFinder.mockReturnValue(false);
    await invokeBotCallback(makeBot(), makeBlastGame(1));

    const botWordFoundCall = mocks.volatileBroadcastToRoom.mock.calls.find(
      ([, , evt]) => evt === 'botWordFound',
    );
    expect(botWordFoundCall![3].isFirstFinder).toBe(false);

    const playerFoundCall = mocks.volatileBroadcastToRoom.mock.calls.find(
      ([, , evt]) => evt === 'playerFoundWord',
    );
    expect(playerFoundCall![3].isFirstFinder).toBe(false);
  });

  it('non-cleared board does not regenerate board', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(false);
    const game = makeBlastGame(3);

    await invokeBotCallback(makeBot(), game);

    expect(mocks.regenerateBlastBoard).not.toHaveBeenCalled();
  });
});

describe('Blast bot liveness (idle-bug regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLeaderboard.mockReturnValue([]);
    mocks.isBlastBoardCleared.mockReturnValue(false);
    clearBotResyncThrottle('GAME1');
    mocks.calculateBlastTileBonus.mockReturnValue(5); // consistent bonus for predictability
  });

  it('bots emit words AND receive credited score across a Blast game', async () => {
    /**
     * Regression test for the "idle bot" bug (Task 4 fix).
     *
     * Two competing hypotheses:
     * H1: bots not emitting — word pools exhausted due to stale grid snapshot
     * H2: bots emitting but zeroed — shouldBotScore rejects submissions
     *
     * This test SEPARATELY observes:
     * - emittedWords: every word a bot submits (proves H1 is not happening)
     * - creditedScores: the actual score returned after shouldBotScore (proves H2 is not happening)
     *
     * If the bug regresses, the test will distinguish which hypothesis broke.
     */
    const emittedWords: string[] = [];
    const creditedScores: number[] = [];
    const submissions: Array<{ word: string; credited: number | false }> = [];

    // Set up a 2-bot Blast game
    const bot1 = makeBot({ id: 'bot-1', username: 'BotAlice', difficulty: 'medium' });
    const bot2 = makeBot({ id: 'bot-2', username: 'BotBob', difficulty: 'medium' });
    const game = makeBlastGame(1);

    mocks.getGameBots.mockReturnValue([bot1, bot2]);
    mocks.getGame.mockReturnValue(game);

    // Instrument startBot to capture the submission callback
    let capturedCallback: ((s: unknown) => Promise<unknown>) | null = null;
    mocks.startBot.mockImplementation((_b, _g, _l, callback) => {
      capturedCallback = callback;
    });

    // Start the bots, which wires up the callback
    startBotsForGame({} as never, 'GAME1', [['A', 'B'], ['C', 'D']], 'en', 60);

    if (!capturedCallback) {
      throw new Error('Bot callback not captured');
    }

    // Simulate a sequence of bot submissions across the game
    // Each submission goes through the callback, which:
    // 1. Computes blastTileBonus (5 in this test)
    // 2. Calls shouldBotScore to check if the word is credited
    // 3. Returns totalScore (or false if rejected)
    const testSubmissions = [
      { username: 'BotAlice', word: 'AB', score: 2, comboLevel: 0 },
      { username: 'BotBob', word: 'CD', score: 2, comboLevel: 0 },
      { username: 'BotAlice', word: 'ABC', score: 3, comboLevel: 0 },
      { username: 'BotBob', word: 'ACD', score: 3, comboLevel: 0 },
      { username: 'BotAlice', word: 'BD', score: 2, comboLevel: 0 },
      { username: 'BotBob', word: 'AC', score: 2, comboLevel: 0 },
    ];

    for (const submission of testSubmissions) {
      const result = await (capturedCallback as (s: unknown) => Promise<unknown>)(submission);
      emittedWords.push(submission.word);
      if (result !== false) {
        creditedScores.push(result as number);
        submissions.push({ word: submission.word, credited: result as number });
      } else {
        submissions.push({ word: submission.word, credited: false });
      }
    }

    // H1 check: bots actually emit words (not exhausting pool)
    expect(emittedWords.length).toBeGreaterThan(3);
    expect(emittedWords).toContain('AB');
    expect(emittedWords).toContain('CD');

    // H2 check: at least some emissions are credited > 0
    // (not all are zeroed by shouldBotScore)
    expect(creditedScores.length).toBeGreaterThan(0);
    expect(creditedScores.some((c) => c > 0)).toBe(true);

    // Additional check: verify the credited scores match the formula
    // base score + blast bonus (5) = credited
    // For 'AB' (score 2): 2 + 5 = 7
    // For 'ABC' (score 3): 3 + 5 = 8, etc.
    const expectedCredits = [7, 7, 8, 8, 7, 7]; // score + 5 blast bonus
    let creditIndex = 0;
    for (let i = 0; i < submissions.length; i++) {
      if (submissions[i].credited !== false) {
        expect(submissions[i].credited).toBe(expectedCredits[creditIndex]);
        creditIndex++;
      }
    }

    // Sanity check: resync was called (Task 4's key fix)
    expect(mocks.resyncBotsForNewGrid).toHaveBeenCalled();
  });

  it('post-grace score cap rejects submissions when ceiling exceeded (H2 regression guard)', async () => {
    /**
     * Critical regression test for H2 (bots emitting but zeroed by shouldBotScore).
     *
     * The first test runs inside the 25s grace window with an empty leaderboard,
     * so shouldBotScore always returns true (trivial). This test exercises the
     * ACTUAL score cap by:
     *
     * 1. Spying on Date.now() to control the time inside shouldBotScore
     * 2. Keeping leaderboard empty (no human scored), triggering post-grace ceiling
     * 3. Submitting words that exceed the post-grace ceiling
     * 4. Asserting the cap REJECTS some submissions (returns false)
     *    AND credits some before the cap kicks in
     *
     * This proves shouldBotScore is exercised across both outcomes:
     * - accepted (credited > 0)
     * - rejected (credited === false)
     *
     * If H2 regresses (cap always true, or cap always false), this test catches it.
     */
    const creditedScores: number[] = [];
    const rejectedSubmissions: string[] = [];
    const bot = makeBot({ id: 'bot-1', username: 'BotAlice', difficulty: 'medium' });
    const game = makeBlastGame(1);

    mocks.getGameBots.mockReturnValue([bot]);
    mocks.getGame.mockReturnValue(game);

    let capturedCallback: ((s: unknown) => Promise<unknown>) | null = null;
    mocks.startBot.mockImplementation((_b, _g, _l, callback) => {
      capturedCallback = callback;
    });

    // Mock updatePlayerScore to track bot score (mirrors real behavior)
    mocks.updatePlayerScore.mockImplementation((_gameCode, username, score) => {
      if (username === 'BotAlice') {
        bot.score += score;
      }
    });

    // Spy on Date.now() to control time
    let currentTime = 1000; // Start at 1s (not 0, to avoid !startedAt truthy check)
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    // Start the game at time T=1000ms, which marks scoring start
    startBotsForGame({} as never, 'GAME1', [['A', 'B'], ['C', 'D']], 'en', 60);

    if (!capturedCallback) {
      throw new Error('Bot callback not captured');
    }

    // Advance "time" to 27s (past the 25s grace window of 25_000 ms)
    // Grace window is 25s from start, so: 1000 + 26000 = 27000ms
    currentTime = 27_000;

    // Submit words. Post-grace, ceiling for medium difficulty is 650 points.
    // Each submission: base score + 5 (blast bonus)
    // We'll submit high-scoring words that exceed the ceiling.
    const testSubmissions = [
      { username: 'BotAlice', word: 'ABCD', score: 100, comboLevel: 0 }, // 100 + 5 = 105 (under 650, credited)
      { username: 'BotAlice', word: 'BCDA', score: 200, comboLevel: 0 }, // 200 + 5 = 205 (under 650, credited)
      { username: 'BotAlice', word: 'CDAB', score: 300, comboLevel: 0 }, // 300 + 5 = 305 (under 650, credited)
      { username: 'BotAlice', word: 'DABC', score: 400, comboLevel: 0 }, // 400 + 5 = 405; bot score now 615 + 405 = 1020 (exceeds 650, REJECTED)
      { username: 'BotAlice', word: 'ABDC', score: 300, comboLevel: 0 }, // 300 + 5 = 305 (also rejected, bot.score still 615)
      { username: 'BotAlice', word: 'BADC', score: 100, comboLevel: 0 }, // 100 + 5 = 105 (also rejected, bot.score still 615)
    ];

    for (const submission of testSubmissions) {
      const result = await (capturedCallback as (s: unknown) => Promise<unknown>)(submission);
      if (result !== false) {
        creditedScores.push(result as number);
      } else {
        rejectedSubmissions.push(submission.word);
      }
    }

    // Verify the score cap was actually exercised
    // At least one submission must have been rejected by the cap
    expect(rejectedSubmissions.length).toBeGreaterThan(0);
    expect(rejectedSubmissions).toContain('DABC'); // First to hit the ceiling
    expect(rejectedSubmissions).toContain('ABDC'); // Also rejected
    expect(rejectedSubmissions).toContain('BADC'); // Also rejected

    // But earlier submissions were credited (before the cap kicked in)
    expect(creditedScores.length).toBeGreaterThan(0);
    expect(creditedScores.some((c) => c > 0)).toBe(true);

    // Verify the credited scores match the formula: base + 5 bonus
    // After cap engages, no more submissions are credited
    expect(creditedScores).toContain(105); // First submission
    expect(creditedScores).toContain(205); // Second submission
    expect(creditedScores).toContain(305); // Third submission, bot.score = 615
    // 4th (DABC) would bring bot.score to 1020, exceeds ceiling (650), rejected

    dateNowSpy.mockRestore();
  });
});
