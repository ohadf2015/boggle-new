/**
 * Bot engine — the one play path every mode's bots go through.
 *
 * Ports the behavioural guarantees that used to live on the classic-only
 * `submitBotWord` (botManager.test "Word Submission") and the classic-only
 * teacher-pause callback test, now enforced once for every mode.
 */
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';

const mocks = vi.hoisted(() => ({
  game: null as Record<string, any> | null,
  incrementBotWordUsage: vi.fn(async () => {}),
}));

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: vi.fn(() => mocks.game),
  getLeaderboard: vi.fn(() => []),
  getLeaderboardThrottled: vi.fn(),
  addPlayerWord: vi.fn((_c: string, u: string, w: string) => { mocks.game!.playerWords[u] = [...(mocks.game!.playerWords[u] || []), w]; }),
  addPlayerEventBonus: vi.fn(),
  updatePlayerScore: vi.fn((_c: string, u: string, delta: number) => {
    mocks.game!.playerScores[u] = (mocks.game!.playerScores[u] || 0) + delta;
  }),
  playerHasWord: vi.fn((_c: string, u: string, w: string) => (mocks.game?.playerWords[u] || []).includes(w)),
  recordFirstFinder: vi.fn(() => true),
  trackBotWord: vi.fn(),
}));
vi.mock('../../../modules/supabaseServer', () => ({ incrementBotWordUsage: mocks.incrementBotWordUsage }));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));
vi.mock('../../../utils/playerFoundWordBatcher', () => ({ queuePlayerFoundWord: vi.fn() }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { addPlayerWord, addPlayerEventBonus, updatePlayerScore, getLeaderboard } from '../../../modules/gameStateManager';
import { volatileBroadcastToRoom } from '../../../utils/socketHelpers';
import { clearBotRoundState } from '../../../modules/botRoundState';
import { playBotWord, runBotLoop, creditBotBonus, type BotPlayRules, type BotRoundContext } from '../botEngine';
import { boardWordSource } from '../botClassic';
import type { Bot } from '../../../modules/botBehavior';

const GAME = 'ENGINE1';
const ctx: BotRoundContext = { io: {} as any, gameCode: GAME, language: 'en', gameEndTime: Date.now() + 120_000 };

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-test', gameCode: GAME, username: 'TestBot', avatar: {}, difficulty: 'medium', personality: 'steady',
    isBot: true, wordsToFind: ['hello', 'world', 'testing'], wordsFound: [], currentWordIndex: 0, score: 0,
    comboLevel: 0, inBurstMode: false, burstWordsRemaining: 0, nextWordTime: null, activeTimers: new Set(),
    isActive: true, avgThinkingTime: 3000, typingSpeed: 250, burstChance: 0, pauseChance: 0, comboFocus: false,
    ...overrides,
  };
}

const flat = (wordScore: number, extra: Partial<ReturnType<BotPlayRules['quote']> & object> = {}): BotPlayRules => ({
  quote: () => ({ wordScore, ...extra }),
});
const rejectAll: BotPlayRules = { quote: () => null };

describe('playBotWord (engine play path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBotRoundState(GAME);
    mocks.game = { gameState: 'in-progress', isPaused: false, playerScores: {}, playerWords: {}, playerCombos: {} };
  });

  it('credits an accepted word: live score, stored word, found list, combo, bot-usage corpus', () => {
    const bot = makeBot({ comboLevel: 2 });
    expect(playBotWord(ctx, bot, flat(7), 'hello')).toBe(7);
    expect(updatePlayerScore).toHaveBeenCalledWith(GAME, 'TestBot', 7, true);
    expect(addPlayerWord).toHaveBeenCalledWith(GAME, 'TestBot', 'hello', expect.objectContaining({ score: 7, comboLevel: 2, isBot: true }));
    expect(bot.wordsFound).toContain('hello');
    expect(bot.score).toBe(7);
    expect(bot.comboLevel).toBe(3);
    expect(mocks.game!.playerCombos.TestBot).toBe(3);
    expect(mocks.incrementBotWordUsage).toHaveBeenCalledWith('hello', 'en');
    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(ctx.io, `room:${GAME}`, 'botWordFound', expect.objectContaining({ word: 'hello', score: 7 }));
  });

  it('event bonus is credited live and mirrored into the event-bonus accumulator, not the stored word', () => {
    const bot = makeBot();
    expect(playBotWord(ctx, bot, flat(4, { eventBonus: 5 }), 'hello')).toBe(9);
    expect(addPlayerWord).toHaveBeenCalledWith(GAME, 'TestBot', 'hello', expect.objectContaining({ score: 4 }));
    expect(updatePlayerScore).toHaveBeenCalledWith(GAME, 'TestBot', 9, true);
    expect(addPlayerEventBonus).toHaveBeenCalledWith(GAME, 'TestBot', 5);
  });

  it('a commit() that returns a number is the authoritative word score', () => {
    const bot = makeBot();
    expect(playBotWord(ctx, bot, flat(4, { commit: () => 6 }), 'hello')).toBe(6);
    expect(addPlayerWord).toHaveBeenCalledWith(GAME, 'TestBot', 'hello', expect.objectContaining({ score: 6 }));
  });

  it('a rejected word leaves no trace: no score, combo reset, not found, no corpus credit', () => {
    const bot = makeBot({ comboLevel: 4 });
    expect(playBotWord(ctx, bot, rejectAll, 'hello')).toBe(false);
    expect(updatePlayerScore).not.toHaveBeenCalled();
    expect(addPlayerWord).not.toHaveBeenCalled();
    expect(bot.score).toBe(0);
    expect(bot.comboLevel).toBe(0);
    expect(bot.wordsFound).not.toContain('hello');
    expect(mocks.incrementBotWordUsage).not.toHaveBeenCalled();
  });

  it('an unplayable word goes to the rules\' onMiss hook (a gate rejection does not)', () => {
    const onMiss = vi.fn();
    expect(playBotWord(ctx, makeBot(), { quote: () => null, onMiss }, 'hipe')).toBe(false);
    expect(onMiss).toHaveBeenCalledWith(ctx, expect.objectContaining({ username: 'TestBot' }), 'hipe');

    (getLeaderboard as Mock).mockReturnValue([{ username: 'Human', score: 100, isBot: false }]);
    const gatedMiss = vi.fn();
    expect(playBotWord(ctx, makeBot(), { quote: () => ({ wordScore: 10_000 }), onMiss: gatedMiss }, 'hello')).toBe(false);
    expect(gatedMiss).not.toHaveBeenCalled();
    (getLeaderboard as Mock).mockReturnValue([]);
  });

  it('never commits side effects for a word over the score gate', () => {
    const commit = vi.fn();
    // A human scored 100 → medium cap max(95±10%, floor 150) < 10_000.
    mocks.game!.playerScores = { Human: 100 };
    (getLeaderboard as Mock).mockReturnValue([{ username: 'Human', score: 100, isBot: false }]);
    expect(playBotWord(ctx, makeBot(), flat(10_000, { commit }), 'hello')).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    (getLeaderboard as Mock).mockReturnValue([]);
  });

  it('gates on the LIVE room score, not a stale bot counter', () => {
    // A stale mirror (e.g. a counter surviving a round boundary) must not freeze the bot.
    (getLeaderboard as Mock).mockReturnValue([{ username: 'Human', score: 100, isBot: false }]);
    const bot = makeBot({ score: 99_999 });
    expect(playBotWord(ctx, bot, flat(10), 'hello')).toBe(10);
    (getLeaderboard as Mock).mockReturnValue([]);
  });

  it('does nothing for an inactive bot', () => {
    expect(playBotWord(ctx, makeBot({ isActive: false }), flat(5), 'hello')).toBe(false);
    expect(updatePlayerScore).not.toHaveBeenCalled();
  });

  it('never credits the same word twice (already banked this round)', () => {
    const bot = makeBot();
    mocks.game!.playerWords = { TestBot: ['hello'] };
    expect(playBotWord(ctx, bot, flat(5), 'hello')).toBe(false);
    expect(updatePlayerScore).not.toHaveBeenCalled();
  });

  it('teacher pause: a bot word that arrives while paused is dropped (every mode shares this path)', () => {
    mocks.game!.isPaused = true;
    expect(playBotWord(ctx, makeBot(), flat(8), 'apple')).toBe(false);
    expect(updatePlayerScore).not.toHaveBeenCalled();
    expect(addPlayerWord).not.toHaveBeenCalled();
    expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('creditBotBonus credits live + event-bonus accumulator (results keep it)', () => {
    const bot = makeBot();
    expect(creditBotBonus(ctx, bot, 20)).toBe(true);
    expect(updatePlayerScore).toHaveBeenCalledWith(GAME, 'TestBot', 20, true);
    expect(addPlayerEventBonus).toHaveBeenCalledWith(GAME, 'TestBot', 20);
  });
});

describe('runBotLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.game = { gameState: 'in-progress', isPaused: false, playerScores: {}, playerWords: {}, playerCombos: {} };
  });
  afterEach(() => vi.useRealTimers());

  it('skips turns while paused and resumes after', () => {
    const bot = makeBot();
    const step = vi.fn(() => true);
    runBotLoop({ ...ctx, gameEndTime: Date.now() + 60_000 }, bot, { firstDelay: () => 1000, nextDelay: () => 1000, step });
    mocks.game!.isPaused = true;
    vi.advanceTimersByTime(3500);
    expect(step).not.toHaveBeenCalled();
    mocks.game!.isPaused = false;
    vi.advanceTimersByTime(1000);
    expect(step).toHaveBeenCalledTimes(1);
  });

  it('stops when step returns false, and near the end of the round', () => {
    const bot = makeBot();
    const step = vi.fn(() => false);
    runBotLoop({ ...ctx, gameEndTime: Date.now() + 60_000 }, bot, { firstDelay: () => 1000, nextDelay: () => 1000, step });
    vi.advanceTimersByTime(10_000);
    expect(step).toHaveBeenCalledTimes(1);

    const late = vi.fn(() => true);
    runBotLoop({ ...ctx, gameEndTime: Date.now() + 1200 }, makeBot(), { firstDelay: () => 1000, nextDelay: () => 1000, step: late });
    vi.advanceTimersByTime(5000);
    expect(late).not.toHaveBeenCalled(); // inside the end margin
  });

  it('a throwing turn does not kill the bot', () => {
    const bot = makeBot();
    let n = 0;
    const step = vi.fn(() => { n++; if (n === 1) throw new Error('boom'); return true; });
    runBotLoop({ ...ctx, gameEndTime: Date.now() + 60_000 }, bot, { firstDelay: () => 1000, nextDelay: () => 1000, step });
    vi.advanceTimersByTime(2500);
    expect(step).toHaveBeenCalledTimes(2);
  });
});

describe('boardWordSource (classic word pick)', () => {
  it('walks the pool in order, advancing the index', () => {
    const bot = makeBot();
    const src = boardWordSource(bot);
    expect(src.pick()).toBe('hello');
    expect(bot.currentWordIndex).toBe(1);
  });

  it('skips words already found', () => {
    const bot = makeBot({ wordsFound: ['hello'] });
    expect(boardWordSource(bot).pick()).toBe('world');
    expect(bot.currentWordIndex).toBe(2);
  });

  it('reports exhaustion (undefined) when every word was tried', () => {
    const bot = makeBot({ currentWordIndex: 3 });
    expect(boardWordSource(bot).pick()).toBeUndefined();
  });
});
