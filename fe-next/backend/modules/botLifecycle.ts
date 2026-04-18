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
  onWordSubmit: ((data: WordSubmissionData) => boolean | void | Promise<boolean | void>) | null,
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
  onWordSubmit: ((data: WordSubmissionData) => boolean | void | Promise<boolean | void>) | null,
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
