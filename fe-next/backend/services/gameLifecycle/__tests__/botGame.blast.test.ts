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
  timerSetTimeout: vi.fn(),
  calculateBlastTileBonus: vi.fn(() => 0),
  getTilesOnPath: vi.fn(() => []),
  recordBlastMove: vi.fn(() => ({ movesUsed: 1, bonusMove: false })),
  getWordPath: vi.fn(() => []),
  isBlastBoardCleared: vi.fn(() => false),
  advanceBlastWave: vi.fn(),
  getWaveConfig: vi.fn(() => ({ archetype: 'classic' })),
  endGame: vi.fn(),
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
  getWordPath: mocks.getWordPath,
  isBlastBoardCleared: mocks.isBlastBoardCleared,
  advanceBlastWave: mocks.advanceBlastWave,
  getWaveConfig: mocks.getWaveConfig,
  tryBeginWaveAdvance: () => true,
  endWaveAdvance: () => {},
}));

vi.mock('@/components/blast/utils/clearTilesProcessor', () => ({
  processTilesForWord: mocks.processTilesForWord,
}));

vi.mock('@/components/blast/utils/blastGravity', () => ({
  computeGravityResult: mocks.computeGravityResult,
}));

vi.mock('@/components/blast/utils/blastLetterGenerator', () => ({
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
vi.mock('../gameTimer', () => ({ endGame: mocks.endGame }));

import { startBotsForGame } from '../botGame';
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

describe('Bot blast mode — wave advance + endGame parity with human path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLeaderboard.mockReturnValue([]);
    mocks.isBlastBoardCleared.mockReturnValue(false);
    mocks.advanceBlastWave.mockImplementation((state, _code, grid) => ({
      wave: (state.wave ?? 1) + 1,
      overlay: [],
      overlayMap: new Map(),
      tileStates: [[{ isCleared: false }]],
      seed: 999,
      grid,
      playerMoves: {},
      playerBonusMoves: {},
      totalMoves: 0,
      playerStats: state.playerStats,
    }));
  });

  it('bot word that clears a mid-run wave advances wave and broadcasts blastWaveAdvance', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(true);
    const game = makeBlastGame(1);

    await invokeBotCallback(makeBot(), game);

    expect(mocks.advanceBlastWave).toHaveBeenCalledWith(
      game.blastModeState, 'GAME1', expect.any(Array),
    );
    const waveAdvanceCall = mocks.broadcastToRoom.mock.calls.find(
      ([, , evt]) => evt === 'blastWaveAdvance',
    );
    expect(waveAdvanceCall).toBeDefined();
    expect(mocks.timerSetTimeout).not.toHaveBeenCalled();
    expect(mocks.endGame).not.toHaveBeenCalled();
  });

  it('wave advance regenerates bot word pool against the new grid (C3)', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(true);
    const newGrid = [['X', 'Y'], ['Z', 'W']];
    mocks.advanceBlastWave.mockImplementation((state) => ({
      wave: (state.wave ?? 1) + 1,
      overlay: [], overlayMap: new Map(),
      tileStates: [[{ isCleared: false }]],
      seed: 999, grid: newGrid,
      playerMoves: {}, playerBonusMoves: {}, totalMoves: 0,
      playerStats: state.playerStats,
    }));
    const bot = makeBot();
    mocks.getGameBots.mockReturnValue([bot]);
    await invokeBotCallback(bot, makeBlastGame(1));
    expect(mocks.resyncBotsForNewGrid).toHaveBeenCalledWith(
      expect.arrayContaining([bot]), newGrid, 'en',
    );
  });

  it('bot word that clears the FINAL wave schedules delayed endGame', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(true);
    const game = makeBlastGame(3); // BLAST_MP_DEFAULT_MAX_WAVES = 3

    await invokeBotCallback(makeBot(), game);

    expect(mocks.timerSetTimeout).toHaveBeenCalledWith(
      'blastEnd:GAME1', expect.any(Function), 1500,
    );
    expect(mocks.advanceBlastWave).not.toHaveBeenCalled();
  });

  it('bot word passes correct currentWave to processTilesForWord (not hardcoded 1)', async () => {
    const game = makeBlastGame(4); // any wave != 1 exposes C2
    await invokeBotCallback(makeBot(), game);

    const call = mocks.processTilesForWord.mock.calls[0] as unknown as [{ currentWave: number }];
    expect(call[0].currentWave).toBe(4);
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

  it('non-cleared board does not advance wave or schedule endGame', async () => {
    mocks.isBlastBoardCleared.mockReturnValue(false);
    const game = makeBlastGame(3);

    await invokeBotCallback(makeBot(), game);

    expect(mocks.advanceBlastWave).not.toHaveBeenCalled();
    expect(mocks.timerSetTimeout).not.toHaveBeenCalled();
    const waveAdvanceCall = mocks.broadcastToRoom.mock.calls.find(
      ([, , evt]) => evt === 'blastWaveAdvance',
    );
    expect(waveAdvanceCall).toBeUndefined();
  });
});
