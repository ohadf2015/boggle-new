/**
 * Bot Lifecycle Management
 * Handles bot timer management, game start/stop, and scheduling.
 */

import type { LetterGrid, Language } from '@/shared/types/game';
import type { Bot, WordSubmissionData } from './botBehavior';

const botConfig = require('./botConfig');
const BOT_CONFIG = botConfig.BOT_CONFIG;
const { prepareBotWords, calculateNextDelay, submitBotWord } = require('./botBehavior');
import logger from '../utils/logger';

// ==========================================
// Timer Management
// ==========================================

/**
 * Create a self-cleaning timeout for a bot
 */
export function setBotTimeout(bot: Bot, callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timerId = setTimeout(() => {
    bot.activeTimers.delete(timerId);
    if (bot.isActive) {
      callback();
    }
  }, delay);

  bot.activeTimers.add(timerId);
  return timerId;
}

/**
 * Clear a specific bot timer
 */
export function clearBotTimeout(bot: Bot, timerId: ReturnType<typeof setTimeout>): void {
  if (bot.activeTimers.has(timerId)) {
    clearTimeout(timerId);
    bot.activeTimers.delete(timerId);
  }
}

// ==========================================
// Word Scheduling
// ==========================================

/**
 * Schedule the next word submission
 */
export function scheduleNextWord(
  bot: Bot,
  onWordSubmit: ((data: WordSubmissionData) => number | boolean | void | Promise<number | boolean | void>) | null,
  remainingTime: number,
  gameEndTime?: number
): void {
  if (!bot.isActive || bot.currentWordIndex >= bot.wordsToFind.length || remainingTime <= 0) {
    return;
  }

  const delay = calculateNextDelay(bot);

  if (delay > remainingTime - 1000) {
    if (remainingTime > 2000 && bot.currentWordIndex < bot.wordsToFind.length) {
      setBotTimeout(bot, () => {
        submitBotWord(bot, onWordSubmit);
      }, Math.min(remainingTime - 1500, 1000));
    }
    return;
  }

  setBotTimeout(bot, () => {
    submitBotWord(bot, onWordSubmit);
    const actualRemainingTime = gameEndTime
      ? gameEndTime - Date.now()
      : remainingTime - delay;
    scheduleNextWord(bot, onWordSubmit, actualRemainingTime, gameEndTime);
  }, delay);

  bot.nextWordTime = Date.now() + delay;
}

// ==========================================
// Bot Start / Stop
// ==========================================

/**
 * Start a bot playing the game
 */
export async function startBot(
  bot: Bot,
  grid: LetterGrid,
  language: Language,
  onWordSubmit: ((data: WordSubmissionData) => number | boolean | void | Promise<number | boolean | void>) | null,
  gameDuration: number,
  gameStartTime?: number
): Promise<void> {
  logger.debug('BOT', `Starting bot "${bot.username}" for new round (was active: ${bot.isActive}, words found: ${bot.wordsFound.length}, index: ${bot.currentWordIndex})`);
  stopBot(bot);

  bot.wordsToFind = [];
  bot.wordsFound = [];
  bot.currentWordIndex = 0;
  bot.score = 0;
  bot.comboLevel = 0;
  bot.inBurstMode = false;
  bot.burstWordsRemaining = 0;

  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    logger.error('BOT', `Bot "${bot.username}" cannot start: invalid grid`);
    return;
  }

  await prepareBotWords(bot, grid, language);

  if (!bot.wordsToFind || !Array.isArray(bot.wordsToFind)) {
    logger.warn('BOT', `Bot "${bot.username}" has invalid wordsToFind, setting to empty array`);
    bot.wordsToFind = [];
    return;
  }

  if (bot.wordsToFind.length === 0) {
    logger.warn('BOT', `Bot "${bot.username}" found no words on the grid, skipping`);
    return;
  }

  bot.isActive = true;
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;
  const targetWords = Math.floor((gameDuration / 60) * config.wordsPerMinute);

  // Allow 3x target words to ensure bots have enough ammo for the full game
  const maxWords = Math.max(10, targetWords * 3);
  bot.wordsToFind = bot.wordsToFind.slice(0, Math.min(bot.wordsToFind.length, maxWords));

  const actualStartTime = gameStartTime || Date.now();
  const gameEndTime = actualStartTime + (gameDuration * 1000);

  const firstWordDelay = timing.startDelay + Math.random() * 2000;

  setBotTimeout(bot, () => {
    const actualRemainingTime = gameEndTime - Date.now();
    if (actualRemainingTime <= 0) {
      logger.debug('BOT', `Bot "${bot.username}" game already ended, not scheduling words`);
      return;
    }
    scheduleNextWord(bot, onWordSubmit, actualRemainingTime, gameEndTime);
  }, firstWordDelay);

  logger.info('BOT', `Bot "${bot.username}" started playing (${bot.wordsToFind.length} words queued)`);
}

/**
 * Regenerate each bot's word pool against a new grid — used when the MP
 * blast board advances to a new wave. Bots retain active scheduling and
 * their combo/score; only the candidate list is rebuilt so subsequent
 * submissions target words that actually exist on the new grid.
 *
 * No-op on inactive bots. Errors per-bot are logged but do not abort the
 * batch (one bot's solver failure shouldn't silence the rest).
 */
export async function resyncBotsForNewGrid(
  bots: Bot[],
  grid: LetterGrid,
  language: Language,
): Promise<void> {
  if (!bots || bots.length === 0) return;
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    logger.warn('BOT', 'resyncBotsForNewGrid called with invalid grid');
    return;
  }
  await Promise.all(bots.map(async (bot) => {
    if (!bot.isActive) return;
    try {
      // Stall scheduled submissions against the old grid: a tick firing
      // during the await window below would otherwise pull a stale word.
      bot.currentWordIndex = bot.wordsToFind.length;
      await prepareBotWords(bot, grid, language);
      bot.currentWordIndex = 0;
      logger.debug('BOT', `Bot "${bot.username}" resynced for new grid (${bot.wordsToFind.length} words)`);
    } catch (err) {
      logger.warn('BOT', `Bot "${bot.username}" resync failed: ${(err as Error).message}`);
    }
  }));
}

/**
 * Stop a bot from playing
 */
export function stopBot(bot: Bot): void {
  bot.isActive = false;

  for (const timerId of bot.activeTimers) {
    clearTimeout(timerId);
  }
  bot.activeTimers.clear();

  logger.debug('BOT', `Stopped bot "${bot.username}"`);
}
