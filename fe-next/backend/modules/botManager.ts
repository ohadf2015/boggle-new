/**
 * Bot Manager
 * Manages AI bot players for Boggle games
 *
 * REFACTORED: Core functionality has been extracted into focused modules:
 * - botConfig.ts - Configuration constants (TIMING, WORDS, AVATARS, NAMES, PERSONALITIES)
 * - botBehavior.ts - Word preparation, timing calculations, submission logic
 *
 * This file now acts as a facade for bot lifecycle management and re-exports
 * all functionality for backwards compatibility.
 */

import type { LetterGrid, Language } from '@/shared/types/game';
import type { Bot, WordSubmissionData } from './botBehavior';

 
const botConfig = require('./botConfig');
export const BOT_CONFIG = botConfig.BOT_CONFIG;

const {
  prepareBotWords,
  calculateNextDelay,
  submitBotWord,
  cleanupPlayerWordsCache,
  clearBehaviorCaches,
  getCacheStats,
  addWordToBlacklist,
} = require('./botBehavior');
const { getRandomAvatar } = require('./avatarConfig');
const logger = require('../utils/logger');

// Re-export Bot type
export type { Bot, WordSubmissionData };

// ESM re-export for addWordToBlacklist
export { addWordToBlacklist };

// Avatar interface
export interface BotAvatar {
  avatarImage: string;
  emoji?: string;
  color?: string;
}

// Bot name result interface
export interface BotNameResult {
  name: string;
  avatar: BotAvatar;
}

// Bot stats interface
export interface BotStats {
  username: string;
  difficulty: string;
  wordsFound: number;
  score: number;
  comboLevel: number;
  isActive: boolean;
}

// Bot manager stats interface
export interface BotManagerStats {
  activeGames: number;
  activeBots: number;
  activeTimers: number;
  playerWordsCacheSize: number;
  playerWordsCacheLanguages: string[];
  blacklistCacheSize: number;
  blacklistCacheLanguages: string[];
}

// User object interface
export interface GameUser {
  socketId?: string;
  avatar?: BotAvatar | null;
  isHost?: boolean;
  isBot?: boolean;
  [key: string]: unknown;
}

// ==========================================
// State Management
// ==========================================

// Active bots per game
const gameBots = new Map<string, Map<string, Bot>>();

// Bot ID counter per game
const botIdCounters = new Map<string, number>();

// ==========================================
// Bot Creation Utilities
// ==========================================

/**
 * Generate a unique bot ID for a game
 */
function generateBotId(gameCode: string): string {
  const counter = (botIdCounters.get(gameCode) || 0) + 1;
  botIdCounters.set(gameCode, counter);
  return `bot-${counter}`;
}

/**
 * Generate a bot name and avatar based on difficulty and language
 * Each bot gets a random avatar image
 * @param difficulty - Bot difficulty level
 * @param existingNames - Names already in use
 * @param language - Game/board language (en, he, sv, ja)
 * @returns Bot name and avatar
 */
function generateBotName(difficulty: string, existingNames: string[] = [], language: string = 'en'): BotNameResult {
  // Get language-specific names, fallback to English if language not found
  const langNames = BOT_CONFIG.NAMES[language] || BOT_CONFIG.NAMES.en;
  const namePool = langNames[difficulty] || langNames.medium;
  const botSuffix = langNames.botSuffix || 'Bot';

  // Filter out names already in use (compare by name property)
  const availableEntries = namePool.filter((entry: { name: string }) =>
    !existingNames.some((existing: string) =>
      existing.toLowerCase().includes(entry.name.toLowerCase())
    )
  );

  // Pick a random entry (or fallback to any if all used)
  const entry = availableEntries.length > 0
    ? availableEntries[Math.floor(Math.random() * availableEntries.length)]
    : namePool[Math.floor(Math.random() * namePool.length)];

  // Add localized "Bot" suffix and maybe a number
  const suffix = Math.random() > 0.5 ? ` ${Math.floor(Math.random() * 99) + 1}` : '';

  // Get random avatar image
  const avatarImage = getRandomAvatar();

  return {
    name: `${entry.name} ${botSuffix}${suffix}`.trim(),
    avatar: {
      avatarImage: avatarImage.id,
      // Keep emoji/color for backward compatibility
      emoji: entry.emoji,
      color: entry.color,
    },
  };
}

/**
 * Generate a random player name with suited avatar
 * For players who don't set their own name
 * @param existingNames - Names already in use
 * @param language - Language for names (en, he, sv, ja)
 * @returns Player name and avatar
 */
export function generateRandomPlayerName(existingNames: string[] = [], language: string = 'en'): BotNameResult {
  const namePool = BOT_CONFIG.PLAYER_NAMES[language] || BOT_CONFIG.PLAYER_NAMES.en;

  // Filter out names already in use
  const availableEntries = namePool.filter((entry: { name: string }) =>
    !existingNames.includes(entry.name)
  );

  // Pick a random entry (or fallback to any if all used)
  const entry = availableEntries.length > 0
    ? availableEntries[Math.floor(Math.random() * availableEntries.length)]
    : namePool[Math.floor(Math.random() * namePool.length)];

  // Get random avatar image
  const avatarImage = getRandomAvatar();

  return {
    name: entry.name,
    avatar: {
      avatarImage: avatarImage.id,
      // Keep emoji/color for backward compatibility
      emoji: entry.emoji,
      color: entry.color,
    },
  };
}

/**
 * Get a random generic avatar for OAuth users
 * These avatars are neutral and work with any name
 * @returns Generic avatar
 */
export function getRandomGenericAvatar(): BotAvatar {
  const avatars = BOT_CONFIG.GENERIC_AVATARS;
  const legacyAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  // Get random avatar image
  const avatarImage = getRandomAvatar();

  return {
    avatarImage: avatarImage.id,
    // Keep emoji/color for backward compatibility
    emoji: legacyAvatar.emoji,
    color: legacyAvatar.color,
  };
}

/**
 * Get a random personality type for a bot
 */
function getRandomPersonality(): string {
  const personalities = Object.keys(BOT_CONFIG.PERSONALITIES);
  return personalities[Math.floor(Math.random() * personalities.length)];
}

/**
 * Create a bot player
 * @param gameCode - Game code
 * @param difficulty - 'easy', 'medium', or 'hard'
 * @param existingUsers - Object with existing usernames
 * @param language - Game/board language (en, he, sv, ja)
 * @returns Bot player object
 */
function createBot(gameCode: string, difficulty: string = 'medium', existingUsers: Record<string, GameUser> = {}, language: string = 'en'): Bot {
  const existingNames = Object.keys(existingUsers);

  const botId = generateBotId(gameCode);
  // generateBotName now returns both name and suited avatar
  const { name: botName, avatar } = generateBotName(difficulty, existingNames, language);
  const personality = getRandomPersonality();
  const personalityTraits = BOT_CONFIG.PERSONALITIES[personality];

  const bot: Bot = {
    id: botId,
    gameCode,
    username: botName,
    avatar,
    difficulty: difficulty as 'easy' | 'medium' | 'hard',
    personality,
    isBot: true,
    // Game state
    wordsToFind: [],
    wordsFound: [],
    currentWordIndex: 0,
    score: 0,
    comboLevel: 0,
    // Personality-adjusted state
    inBurstMode: false,
    burstWordsRemaining: 0,
    // Timing state
    nextWordTime: null,
    activeTimers: new Set(),
    isActive: false,
    // Statistics (adjusted by personality)
    avgThinkingTime: (BOT_CONFIG.TIMING[difficulty].minDelay +
      Math.random() * (BOT_CONFIG.TIMING[difficulty].maxDelay - BOT_CONFIG.TIMING[difficulty].minDelay)) *
      personalityTraits.delayMultiplier,
    typingSpeed: BOT_CONFIG.TIMING[difficulty].typingSpeed * (0.8 + Math.random() * 0.4),
    // Personality traits
    burstChance: personalityTraits.burstChance,
    pauseChance: personalityTraits.pauseChance || 0,
    comboFocus: personalityTraits.comboFocus,
  };

  logger.debug('BOT', `Created ${difficulty} bot "${botName}" with ${personality} personality`);
  return bot;
}

// ==========================================
// Timer Management
// ==========================================

/**
 * Create a self-cleaning timeout for a bot
 * @param bot - Bot object
 * @param callback - Function to execute
 * @param delay - Delay in ms
 * @returns Timer ID
 */
function setBotTimeout(bot: Bot, callback: () => void, delay: number): ReturnType<typeof setTimeout> {
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
function clearBotTimeout(bot: Bot, timerId: ReturnType<typeof setTimeout>): void {
  if (bot.activeTimers.has(timerId)) {
    clearTimeout(timerId);
    bot.activeTimers.delete(timerId);
  }
}

// ==========================================
// Bot Management
// ==========================================

/**
 * Initialize bots for a game
 * @param gameCode - Game code
 * @returns Map of bot IDs to bot objects
 */
function initializeGameBots(gameCode: string): Map<string, Bot> {
  if (!gameBots.has(gameCode)) {
    gameBots.set(gameCode, new Map());
  }
  return gameBots.get(gameCode)!;
}

/**
 * Add a bot to a game
 * @param gameCode - Game code
 * @param difficulty - Bot difficulty
 * @param existingUsers - Existing users in the game
 * @param language - Game/board language (en, he, sv, ja)
 * @returns The created bot
 */
export function addBot(gameCode: string, difficulty: string = 'medium', existingUsers: Record<string, GameUser> = {}, language: string = 'en'): Bot {
  const bots = initializeGameBots(gameCode);
  const bot = createBot(gameCode, difficulty, existingUsers, language);

  bots.set(bot.id, bot);
  logger.info('BOT', `Added ${difficulty} bot "${bot.username}" (${language}) to game ${gameCode}`);

  return bot;
}

/**
 * Remove a bot from a game
 * @param gameCode - Game code
 * @param botIdOrUsername - Bot ID or username
 * @returns Whether removal was successful
 */
export function removeBot(gameCode: string, botIdOrUsername: string): boolean {
  const bots = gameBots.get(gameCode);
  if (!bots) return false;

  // Find bot by ID or username
  let botToRemove: Bot | null = null;
  for (const [id, bot] of bots) {
    if (id === botIdOrUsername || bot.username === botIdOrUsername) {
      botToRemove = bot;
      break;
    }
  }

  if (!botToRemove) return false;

  stopBot(botToRemove);
  bots.delete(botToRemove.id);
  logger.info('BOT', `Removed bot "${botToRemove.username}" from game ${gameCode}`);

  return true;
}

/**
 * Get all bots in a game
 * @param gameCode - Game code
 * @returns Array of bot objects
 */
export function getGameBots(gameCode: string): Bot[] {
  const bots = gameBots.get(gameCode);
  if (!bots) return [];
  return Array.from(bots.values());
}

/**
 * Get a specific bot by username
 * @param gameCode - Game code
 * @param username - Bot username
 * @returns Bot object or null
 */
export function getBotByUsername(gameCode: string, username: string): Bot | null {
  const bots = gameBots.get(gameCode);
  if (!bots) return null;

  for (const bot of bots.values()) {
    if (bot.username === username) return bot;
  }
  return null;
}

/**
 * Check if a username belongs to a bot
 * @param gameCode - Game code
 * @param username - Username to check
 * @returns boolean
 */
export function isBot(gameCode: string, username: string): boolean {
  return getBotByUsername(gameCode, username) !== null;
}

// ==========================================
// Bot Lifecycle
// ==========================================

/**
 * Start a bot playing the game
 * @param bot - Bot object
 * @param grid - Letter grid
 * @param language - Game language
 * @param onWordSubmit - Callback when bot submits a word
 * @param gameDuration - Game duration in seconds
 * @param gameStartTime - Timestamp when the game started (for accurate timing)
 */
export async function startBot(
  bot: Bot,
  grid: LetterGrid,
  language: Language,
  onWordSubmit: ((data: WordSubmissionData) => void) | null,
  gameDuration: number,
  gameStartTime?: number
): Promise<void> {
  // Ensure bot is stopped and all timers are cleared before starting new round
  // This fixes bots not submitting after the first game
  logger.debug('BOT', `Starting bot "${bot.username}" for new round (was active: ${bot.isActive}, words found: ${bot.wordsFound.length}, index: ${bot.currentWordIndex})`);
  stopBot(bot);

  // CRITICAL: Reset ALL bot state BEFORE any async operations
  // This ensures a clean slate even if prepareBotWords fails or returns early
  bot.wordsToFind = [];
  bot.wordsFound = [];
  bot.currentWordIndex = 0;
  bot.score = 0;
  bot.comboLevel = 0;
  bot.inBurstMode = false;
  bot.burstWordsRemaining = 0;

  // Safety check for grid before attempting to find words
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    logger.error('BOT', `Bot "${bot.username}" cannot start: invalid grid`);
    return;
  }

  // Prepare fresh words for the new grid
  await prepareBotWords(bot, grid, language);

  // Safety check for words - log with more detail for debugging
  if (!bot.wordsToFind || !Array.isArray(bot.wordsToFind)) {
    logger.warn('BOT', `Bot "${bot.username}" has invalid wordsToFind, setting to empty array`);
    bot.wordsToFind = [];
    return;
  }

  // If no words were found, log a warning and skip this bot
  if (bot.wordsToFind.length === 0) {
    logger.warn('BOT', `Bot "${bot.username}" found no words on the grid, skipping`);
    return;
  }

  bot.isActive = true;
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  // Calculate how many words to attempt based on game duration
  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;
  const targetWords = Math.floor((gameDuration / 60) * config.wordsPerMinute);

  // Limit words to target (but keep at least some words for short games)
  const maxWords = Math.max(3, targetWords * 2);
  bot.wordsToFind = bot.wordsToFind.slice(0, Math.min(bot.wordsToFind.length, maxWords));

  // Calculate ACTUAL remaining time based on when the game started
  // This accounts for any delay in bot initialization (async prepareBotWords)
  const actualStartTime = gameStartTime || Date.now();
  const gameEndTime = actualStartTime + (gameDuration * 1000);

  // Schedule first word after initial delay
  const firstWordDelay = timing.startDelay + Math.random() * 2000;

  setBotTimeout(bot, () => {
    // Calculate actual remaining time when this callback fires
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
 * Schedule the next word submission
 * @param bot - Bot object
 * @param onWordSubmit - Callback when bot submits a word
 * @param remainingTime - Remaining game time in ms
 * @param gameEndTime - Absolute timestamp when game ends (for accurate timing)
 */
function scheduleNextWord(
  bot: Bot,
  onWordSubmit: ((data: WordSubmissionData) => void) | null,
  remainingTime: number,
  gameEndTime?: number
): void {
  if (!bot.isActive || bot.currentWordIndex >= bot.wordsToFind.length || remainingTime <= 0) {
    return;
  }

  const delay = calculateNextDelay(bot);

  // Don't schedule if not enough time left
  if (delay > remainingTime - 1000) {
    // Try to submit one last quick word if possible
    if (remainingTime > 2000 && bot.currentWordIndex < bot.wordsToFind.length) {
      setBotTimeout(bot, () => {
        submitBotWord(bot, onWordSubmit);
      }, Math.min(remainingTime - 1500, 1000));
    }
    return;
  }

  setBotTimeout(bot, () => {
    submitBotWord(bot, onWordSubmit);
    // Use gameEndTime if available for accurate remaining time calculation
    const actualRemainingTime = gameEndTime
      ? gameEndTime - Date.now()
      : remainingTime - delay;
    scheduleNextWord(bot, onWordSubmit, actualRemainingTime, gameEndTime);
  }, delay);

  bot.nextWordTime = Date.now() + delay;
}

/**
 * Stop a bot from playing
 * @param bot - Bot object
 */
export function stopBot(bot: Bot): void {
  bot.isActive = false;

  // Clear all scheduled timers
  for (const timerId of bot.activeTimers) {
    clearTimeout(timerId);
  }
  bot.activeTimers.clear();

  logger.debug('BOT', `Stopped bot "${bot.username}"`);
}

/**
 * Stop all bots in a game
 * @param gameCode - Game code
 */
export function stopAllBots(gameCode: string): void {
  const bots = gameBots.get(gameCode);
  if (!bots) return;

  for (const bot of bots.values()) {
    stopBot(bot);
  }

  logger.info('BOT', `Stopped all bots in game ${gameCode}`);
}

/**
 * Clean up all bots for a game
 * @param gameCode - Game code
 */
export function cleanupGameBots(gameCode: string): void {
  stopAllBots(gameCode);
  gameBots.delete(gameCode);
  botIdCounters.delete(gameCode);
  logger.info('BOT', `Cleaned up bots for game ${gameCode}`);
}

// ==========================================
// Bot State Management
// ==========================================

/**
 * Reset bot combo (when combo timer expires)
 * @param gameCode - Game code
 * @param username - Bot username
 */
export function resetBotCombo(gameCode: string, username: string): void {
  const bot = getBotByUsername(gameCode, username);
  if (bot) {
    bot.comboLevel = 0;
  }
}

/**
 * Get bot statistics for display
 * @param gameCode - Game code
 * @param username - Bot username
 * @returns Bot stats
 */
export function getBotStats(gameCode: string, username: string): BotStats | null {
  const bot = getBotByUsername(gameCode, username);
  if (!bot) return null;

  return {
    username: bot.username,
    difficulty: bot.difficulty,
    wordsFound: bot.wordsFound.length,
    score: bot.score,
    comboLevel: bot.comboLevel,
    isActive: bot.isActive,
  };
}

/**
 * Get bot manager statistics for monitoring
 * @returns Cache and active bot statistics
 */
export function getBotManagerStats(): BotManagerStats {
  let totalActiveBots = 0;
  let totalActiveTimers = 0;
  const gameCount = gameBots.size;

  for (const bots of gameBots.values()) {
    for (const bot of bots.values()) {
      if (bot.isActive) {
        totalActiveBots++;
        totalActiveTimers += bot.activeTimers.size;
      }
    }
  }

  return {
    activeGames: gameCount,
    activeBots: totalActiveBots,
    activeTimers: totalActiveTimers,
    ...getCacheStats(),
  };
}

/**
 * Clear all bot manager caches
 */
export function clearBotManagerCaches(): void {
  clearBehaviorCaches();
}

// ==========================================
// Exports
// ==========================================

// CommonJS exports for backward compatibility
module.exports = {
  // Bot management
  addBot,
  removeBot,
  getGameBots,
  getBotByUsername,
  isBot,

  // Game lifecycle
  initializeGameBots,
  prepareBotWords,
  startBot,
  stopBot,
  stopAllBots,
  cleanupGameBots,

  // Bot state
  resetBotCombo,
  getBotStats,

  // Cache management and monitoring
  getBotManagerStats,
  clearBotManagerCaches,
  cleanupPlayerWordsCache,

  // Blacklist management
  addWordToBlacklist,

  // Player name generation (for players without custom names)
  generateRandomPlayerName,

  // Generic avatar for OAuth users (neutral avatars that work with any name)
  getRandomGenericAvatar,

  // Configuration (re-exported for backwards compatibility)
  BOT_CONFIG,
};
