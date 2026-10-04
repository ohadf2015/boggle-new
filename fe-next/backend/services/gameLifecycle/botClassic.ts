/**
 * Board-word bots (classic, and the board-word half of Word Hunt; also the
 * fallback for any grid mode without its own bot rules).
 *
 * What is specific here: the word pool comes from the personality-driven
 * `prepareBotWords` solve of the round's grid, pacing is the personality timing
 * (`calculateNextDelay`: bursts, pauses, typing speed), and a word is priced
 * with the same per-word scorer as a human. Everything else is the engine.
 */

import type { LetterGrid, Language } from '@/shared/types';
import { prepareBotWords, calculateNextDelay, type Bot } from '../../modules/botBehavior';
import { BOT_CONFIG } from '../../modules/botConfig';
import { addPlayerWord, getGame, trackBotWord } from '../../modules/gameStateManager';
import { isDictionaryWord } from '../../dictionary';
import { isWordShapeWeird } from '@/shared/utils/wordShapeFilter';
import { classicMinWordLength } from '@/shared/utils/classicWordRules';
import { isWordCommunityValid, isWordValidForScoring } from '../../modules/communityWordManager';
import { scoreAcceptedWord } from '../../modules/wordScore';
import logger from '../../utils/logger';
import {
  activateBot,
  runWordBot,
  type BotPlayRules,
  type BotQuote,
  type BotRoundContext,
  type BotWordSource,
} from './botEngine';

/**
 * Would the results page accept this word? Same predicate as the end-of-round
 * validation (gameScores): a bot's deliberate "wrong word" is a miss that
 * never scores, instead of scoring live and silently vanishing at results.
 */
export function isScoringWord(word: string, language: Language, gameMode?: string | null): boolean {
  if (isWordShapeWeird(word, language).weird) return false;
  if (gameMode === 'classic' && word.length < classicMinWordLength(language)) return false;
  return !!isDictionaryWord(word, language)
    || isWordCommunityValid(word, language)
    || isWordValidForScoring(word, language);
}

/** Price a board word exactly like a human's auto-validated word. */
export function quoteBoardWord(ctx: BotRoundContext, bot: Bot, word: string): BotQuote | null {
  const gameMode = getGame(ctx.gameCode)?.gameMode;
  if (!isScoringWord(word, ctx.language, gameMode)) return null;
  return { wordScore: scoreAcceptedWord({ word, comboLevel: bot.comboLevel }).total };
}

/**
 * A bot's deliberate wrong word (prepareBotWords mixes real player mistakes in)
 * is recorded at 0 points: it still shows as a rejected word in the bot's
 * results and still reaches the peer-validation pool (trackBotWord, where a
 * rejection blacklists it), but it is never credited — the live total and the
 * results total stay equal.
 */
export function recordMissedBoardWord(ctx: BotRoundContext, bot: Bot, word: string): void {
  addPlayerWord(ctx.gameCode, bot.username, word, { score: 0, comboBonus: 0, comboLevel: bot.comboLevel, isBot: true });
  trackBotWord(ctx.gameCode, word, bot.username, 0);
}

export const classicBotRules: BotPlayRules = { quote: quoteBoardWord, onMiss: recordMissedBoardWord };

/**
 * Build the bot's word pool for this grid. Words the bot already banked this
 * round are dropped, so a mid-round relaunch (orphan-timer / restart recovery)
 * never replays them. Returns false when the bot has nothing to play.
 */
export async function prepareBoardWords(bot: Bot, grid: LetterGrid, ctx: BotRoundContext, durationSec: number): Promise<boolean> {
  await prepareBotWords(bot, grid, ctx.language);
  const banked = new Set(getGame(ctx.gameCode)?.playerWords?.[bot.username] ?? []);
  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;
  // 3x the expected pace so the bot has ammo for the full round.
  const maxWords = Math.max(10, Math.floor((durationSec / 60) * config.wordsPerMinute) * 3);
  bot.wordsToFind = (bot.wordsToFind || []).filter((w) => !banked.has(w.toLowerCase())).slice(0, maxWords);
  bot.wordsFound = [...banked];
  if (bot.wordsToFind.length === 0) {
    logger.warn('BOT', `Bot "${bot.username}" found no words on the grid, skipping`);
    return false;
  }
  return true;
}

/** Personality pacing over the prepared pool. */
export function boardWordSource(bot: Bot): BotWordSource {
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;
  return {
    firstDelay: () => (bot.dynamicStartDelay ?? timing.startDelay) + Math.random() * 2000,
    nextDelay: () => calculateNextDelay(bot),
    pick: () => {
      while (bot.currentWordIndex < bot.wordsToFind.length) {
        const word = bot.wordsToFind[bot.currentWordIndex++];
        if (!bot.wordsFound.includes(word)) return word;
      }
      return undefined;
    },
  };
}

/** Start board-word bots with the given play rules (classic by default). */
export async function startBoardWordBots(
  ctx: BotRoundContext,
  bots: Bot[],
  grid: LetterGrid | null | undefined,
  durationSec: number,
  rules: BotPlayRules = classicBotRules,
): Promise<void> {
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    logger.error('BOT', `Cannot start bots for game ${ctx.gameCode}: letterGrid is invalid`);
    return;
  }
  logger.info('BOT', `Starting ${bots.length} board-word bots for game ${ctx.gameCode}`);
  await Promise.all(bots.map(async (bot) => {
    activateBot(bot);
    if (!(await prepareBoardWords(bot, grid, ctx, durationSec))) return;
    if (!bot.isActive) return; // stopped while the pool was being built
    runWordBot(ctx, bot, rules, boardWordSource(bot));
    logger.info('BOT', `Bot "${bot.username}" started playing (${bot.wordsToFind.length} words queued)`);
  }));
}
