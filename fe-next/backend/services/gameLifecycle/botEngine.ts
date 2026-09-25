/**
 * Bot engine — the ONE place a bot plays a word, for every MP mode.
 *
 * Per-mode files (botClassic / botBlast / botWheelRush / botWordHunt) only say
 * what genuinely differs: where the next word comes from, how long the bot
 * "thinks", and how a word is priced + applied (board cascade, wheel claim,
 * life restore). Scheduling, the teacher-pause freeze, the score gate, the
 * credit (live total + stored word detail + event bonus), the bot's own
 * bookkeeping and the broadcasts all live here, so no mode can drift.
 */

import type { Server } from 'socket.io';
import type { Language } from '@/shared/types';
import type { Bot } from '../../modules/botBehavior';
import {
  addPlayerWord,
  addPlayerEventBonus,
  getGame,
  getLeaderboardThrottled,
  playerHasWord,
  recordFirstFinder,
  trackBotWord,
  updatePlayerScore,
} from '../../modules/gameStateManager';
import { setBotTimeout, stopBot } from '../../modules/botLifecycle';
import { incrementBotWordUsage } from '../../modules/supabaseServer';
import { volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { queuePlayerFoundWord } from '../../utils/playerFoundWordBatcher';
import { shouldBotScore, type BotScoreTuning } from './botScoreGate';
import logger from '../../utils/logger';

export interface BotRoundContext {
  io: Server;
  gameCode: string;
  language: Language;
  /** Absolute ms timestamp the round ends at (bots stop just before it). */
  gameEndTime: number;
}

/**
 * A priced move. Nothing is mutated until the score gate passes and the engine
 * calls `commit()`; a rejected quote leaves no trace.
 */
export interface BotQuote {
  /** Stored on the word detail — the number the results page sums. */
  wordScore: number;
  /** Credited live but kept out of the word detail (mirrors the human path). */
  eventBonus?: number;
  /** Apply mode side effects; may return the final word score if it moved. */
  commit?: () => number | void;
  /** Mode-specific activity feed; default is the board-mode feed. */
  announce?: (credited: number) => void;
}

export interface BotPlayRules {
  /** Score-gate tuning for the mode (default calibration when omitted). */
  tuning?: BotScoreTuning;
  /** Price a word for this bot, or null if it cannot be played right now. */
  quote(ctx: BotRoundContext, bot: Bot, word: string): BotQuote | null;
}

/** One bot loop: when to act, and what to do. `step` returns false to stop. */
export interface BotLoop {
  firstDelay(): number;
  nextDelay(): number;
  step(): boolean;
}

/** Stop margin before the round end: no bot acts in the last half second. */
const END_MARGIN_MS = 500;

/**
 * Throttled leaderboard broadcast shared by humans and bots (~2/s per room,
 * leading + trailing edge), so a room full of bots never floods clients.
 */
export function emitBotLeaderboard(io: Server, gameCode: string): void {
  getLeaderboardThrottled(gameCode, (leaderboard) => {
    volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
  });
}

/** Stop any previous run of this bot (a relaunch never doubles its loops) and arm it. */
export function activateBot(bot: Bot): void {
  stopBot(bot);
  bot.isActive = true;
}

/**
 * Run a bot loop until the round ends, the bot is stopped, or `step` says stop.
 * A teacher pause skips turns (the clock is frozen, the schedule is not).
 */
export function runBotLoop(ctx: BotRoundContext, bot: Bot, loop: BotLoop): void {
  const tick = (): void => {
    const remaining = ctx.gameEndTime - Date.now();
    if (!bot.isActive || remaining <= END_MARGIN_MS) return;
    const game = getGame(ctx.gameCode);
    if (!game) return;
    try {
      if (!game.isPaused && !loop.step()) return;
    } catch (err) {
      // One bad turn must never kill the bot (or crash the process from a timer).
      logger.error('BOT', `Bot "${bot.username}" turn failed in ${ctx.gameCode}: ${(err as Error).message}`);
    }
    const delay = loop.nextDelay();
    if (delay < remaining - END_MARGIN_MS) setBotTimeout(bot, tick, delay);
  };
  setBotTimeout(bot, tick, loop.firstDelay());
}

function announceBoardWord(ctx: BotRoundContext, bot: Bot, word: string, credited: number, comboLevel: number): void {
  const { io, gameCode } = ctx;
  trackBotWord(gameCode, word, bot.username, credited);
  const isFirstFinder = recordFirstFinder(gameCode, word, bot.username, bot.avatar);
  volatileBroadcastToRoom(io, getGameRoom(gameCode), 'botWordFound', {
    username: bot.username,
    word,
    score: credited,
    isFirstFinder,
  });
  const game = getGame(gameCode);
  queuePlayerFoundWord(io, gameCode, {
    username: bot.username,
    word,
    wordCount: game?.playerWords?.[bot.username]?.length || 0,
    score: game?.playerScores?.[bot.username] || 0,
    comboLevel,
    isFirstFinder,
  });
}

/**
 * Play one word for a bot. Returns the points credited, or false if the word
 * was rejected (unplayable, already found, paused, or over the score gate).
 */
export function playBotWord(ctx: BotRoundContext, bot: Bot, rules: BotPlayRules, word: string): number | false {
  const { gameCode } = ctx;
  const game = getGame(gameCode);
  if (!game || !bot.isActive || game.isPaused) return false;
  if (bot.wordsFound.includes(word) || playerHasWord(gameCode, bot.username, word)) return false;

  const quote = rules.quote(ctx, bot, word);
  const liveScore = game.playerScores?.[bot.username] ?? 0;
  const eventBonus = quote?.eventBonus ?? 0;
  if (!quote || !shouldBotScore(gameCode, bot.username, liveScore, quote.wordScore + eventBonus, bot.difficulty, rules.tuning)) {
    bot.comboLevel = 0;
    return false;
  }

  const committed = quote.commit?.();
  const wordScore = typeof committed === 'number' ? committed : quote.wordScore;
  const credited = wordScore + eventBonus;
  const comboLevel = bot.comboLevel;
  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[bot.username] = comboLevel + 1;

  addPlayerWord(gameCode, bot.username, word, {
    autoValidated: true,
    score: wordScore,
    comboBonus: 0,
    comboLevel,
    isBot: true,
  });
  updatePlayerScore(gameCode, bot.username, credited, true);
  if (eventBonus !== 0) addPlayerEventBonus(gameCode, bot.username, eventBonus);

  bot.wordsFound.push(word);
  bot.score = game.playerScores?.[bot.username] ?? bot.score + credited;
  bot.comboLevel = comboLevel + 1;
  void incrementBotWordUsage(word, ctx.language);

  if (quote.announce) quote.announce(credited);
  else announceBoardWord(ctx, bot, word, credited, comboLevel);
  emitBotLeaderboard(ctx.io, gameCode);
  return credited;
}

/**
 * Credit a non-word bonus (e.g. Word Hunt target found) through the same gate.
 * Mirrors the human path: live total + event-bonus accumulator, so the results
 * page keeps it. Returns whether it was credited.
 */
export function creditBotBonus(ctx: BotRoundContext, bot: Bot, amount: number, tuning?: BotScoreTuning): boolean {
  const game = getGame(ctx.gameCode);
  if (!game || amount <= 0) return false;
  const liveScore = game.playerScores?.[bot.username] ?? 0;
  if (!shouldBotScore(ctx.gameCode, bot.username, liveScore, amount, bot.difficulty, tuning)) return false;
  updatePlayerScore(ctx.gameCode, bot.username, amount, true);
  addPlayerEventBonus(ctx.gameCode, bot.username, amount);
  bot.score = game.playerScores?.[bot.username] ?? bot.score + amount;
  emitBotLeaderboard(ctx.io, ctx.gameCode);
  return true;
}

/** Word-picking loop shape shared by every mode. */
export interface BotWordSource {
  firstDelay(): number;
  nextDelay(): number;
  /** Next word to try; null = skip this turn; undefined = nothing left (stop). */
  pick(): string | null | undefined;
}

/** Drive a bot through a word source with the shared play path. */
export function runWordBot(ctx: BotRoundContext, bot: Bot, rules: BotPlayRules, source: BotWordSource): void {
  runBotLoop(ctx, bot, {
    firstDelay: () => source.firstDelay(),
    nextDelay: () => source.nextDelay(),
    step: () => {
      const word = source.pick();
      if (word === undefined) return false;
      if (word) playBotWord(ctx, bot, rules, word);
      return true;
    },
  });
}
