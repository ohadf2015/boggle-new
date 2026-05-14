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
