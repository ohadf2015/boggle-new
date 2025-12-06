/**
 * Bot Manager
 * Manages AI bot players for Boggle games
 *
 * REFACTORED: Core functionality has been extracted into focused modules:
 * - botConfig.js - Configuration constants (TIMING, WORDS, AVATARS, NAMES, PERSONALITIES)
 * - botBehavior.js - Word preparation, timing calculations, submission logic
 *
 * This file now acts as a facade for bot lifecycle management and re-exports
 * all functionality for backwards compatibility.
 */

const { BOT_CONFIG } = require('./botConfig');
const {
  prepareBotWords,
  calculateNextDelay,
  submitBotWord,
  cleanupPlayerWordsCache,
  clearBehaviorCaches,
  getCacheStats,
  addWordToBlacklist,
} = require('./botBehavior');
const logger = require('../utils/logger');

// ==========================================
// State Management
// ==========================================

// Active bots per game
const gameBots = new Map();

// Bot ID counter per game
const botIdCounters = new Map();

// ==========================================
// Bot Creation Utilities
// ==========================================

/**
 * Generate a unique bot ID for a game
 */
function generateBotId(gameCode) {
  const counter = (botIdCounters.get(gameCode) || 0) + 1;
  botIdCounters.set(gameCode, counter);
  return `bot-${counter}`;
}

/**
 * Generate a bot name based on difficulty
 */
function generateBotName(difficulty, existingNames = []) {
  const namePool = BOT_CONFIG.NAMES[difficulty] || BOT_CONFIG.NAMES.medium;
  const availableNames = namePool.filter(n => !existingNames.some(existing =>
    existing.toLowerCase().includes(n.toLowerCase())
  ));

  const baseName = availableNames.length > 0
    ? availableNames[Math.floor(Math.random() * availableNames.length)]
    : namePool[Math.floor(Math.random() * namePool.length)];

  // Add "Bot" suffix and maybe a number
  const suffix = Math.random() > 0.5 ? ` ${Math.floor(Math.random() * 99) + 1}` : '';
  return `${baseName} Bot${suffix}`.trim();
}

/**
 * Get a random avatar for the bot
 */
function getRandomAvatar(existingAvatars = []) {
  const availableAvatars = BOT_CONFIG.AVATARS.filter(a =>
    !existingAvatars.some(existing => existing?.emoji === a.emoji)
  );

  return availableAvatars.length > 0
    ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
    : BOT_CONFIG.AVATARS[Math.floor(Math.random() * BOT_CONFIG.AVATARS.length)];
}

/**
 * Get a random personality type for a bot
 */
function getRandomPersonality() {
  const personalities = Object.keys(BOT_CONFIG.PERSONALITIES);
  return personalities[Math.floor(Math.random() * personalities.length)];
}

/**
 * Create a bot player
 * @param {string} gameCode - Game code
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {object} existingUsers - Object with existing usernames
 * @returns {object} - Bot player object
 */
function createBot(gameCode, difficulty = 'medium', existingUsers = {}) {
  const existingNames = Object.keys(existingUsers);
  const existingAvatars = Object.values(existingUsers).map(u => u.avatar);

  const botId = generateBotId(gameCode);
  const botName = generateBotName(difficulty, existingNames);
  const avatar = getRandomAvatar(existingAvatars);
  const personality = getRandomPersonality();
  const personalityTraits = BOT_CONFIG.PERSONALITIES[personality];

  const bot = {
    id: botId,
    username: botName,
    avatar,
    difficulty,
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
 * @param {object} bot - Bot object
 * @param {function} callback - Function to execute
 * @param {number} delay - Delay in ms
 * @returns {number} - Timer ID
 */
function setBotTimeout(bot, callback, delay) {
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
function clearBotTimeout(bot, timerId) {
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
 * @param {string} gameCode - Game code
 * @returns {Map} - Map of bot IDs to bot objects
 */
function initializeGameBots(gameCode) {
  if (!gameBots.has(gameCode)) {
    gameBots.set(gameCode, new Map());
  }
  return gameBots.get(gameCode);
}

/**
 * Add a bot to a game
 * @param {string} gameCode - Game code
 * @param {string} difficulty - Bot difficulty
 * @param {object} existingUsers - Existing users in the game
 * @returns {object} - The created bot
 */
function addBot(gameCode, difficulty = 'medium', existingUsers = {}) {
  const bots = initializeGameBots(gameCode);
  const bot = createBot(gameCode, difficulty, existingUsers);

  bots.set(bot.id, bot);
  logger.info('BOT', `Added ${difficulty} bot "${bot.username}" to game ${gameCode}`);

  return bot;
}

/**
 * Remove a bot from a game
 * @param {string} gameCode - Game code
 * @param {string} botIdOrUsername - Bot ID or username
 * @returns {boolean} - Whether removal was successful
 */
function removeBot(gameCode, botIdOrUsername) {
  const bots = gameBots.get(gameCode);
  if (!bots) return false;

  // Find bot by ID or username
  let botToRemove = null;
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
 * @param {string} gameCode - Game code
 * @returns {object[]} - Array of bot objects
 */
function getGameBots(gameCode) {
  const bots = gameBots.get(gameCode);
  if (!bots) return [];
  return Array.from(bots.values());
}

/**
 * Get a specific bot by username
 * @param {string} gameCode - Game code
 * @param {string} username - Bot username
 * @returns {object|null} - Bot object or null
 */
function getBotByUsername(gameCode, username) {
  const bots = gameBots.get(gameCode);
  if (!bots) return null;

  for (const bot of bots.values()) {
    if (bot.username === username) return bot;
  }
  return null;
}

/**
 * Check if a username belongs to a bot
 * @param {string} gameCode - Game code
 * @param {string} username - Username to check
 * @returns {boolean}
 */
function isBot(gameCode, username) {
  return getBotByUsername(gameCode, username) !== null;
}

// ==========================================
// Bot Lifecycle
// ==========================================

/**
 * Start a bot playing the game
 * @param {object} bot - Bot object
 * @param {string[][]} grid - Letter grid
 * @param {string} language - Game language
 * @param {function} onWordSubmit - Callback when bot submits a word
 * @param {number} gameDuration - Game duration in seconds
 */
async function startBot(bot, grid, language, onWordSubmit, gameDuration) {
  // Prepare fresh words for the new grid
  await prepareBotWords(bot, grid, language);

  // Safety check
  if (!bot.wordsToFind || !Array.isArray(bot.wordsToFind)) {
    logger.warn('BOT', `Bot "${bot.username}" has no words to find, skipping`);
    bot.wordsToFind = [];
    return;
  }

  bot.isActive = true;
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  // Calculate how many words to attempt based on game duration
  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;
  const targetWords = Math.floor((gameDuration / 60) * config.wordsPerMinute);

  // Limit words to target
  bot.wordsToFind = bot.wordsToFind.slice(0, Math.min(bot.wordsToFind.length, targetWords * 2));

  // Schedule first word after initial delay
  const firstWordDelay = timing.startDelay + Math.random() * 2000;

  setBotTimeout(bot, () => {
    scheduleNextWord(bot, onWordSubmit, gameDuration * 1000 - firstWordDelay);
  }, firstWordDelay);

  logger.info('BOT', `Bot "${bot.username}" started playing (${bot.wordsToFind.length} words queued)`);
}

/**
 * Schedule the next word submission
 * @param {object} bot - Bot object
 * @param {function} onWordSubmit - Callback when bot submits a word
 * @param {number} remainingTime - Remaining game time in ms
 */
function scheduleNextWord(bot, onWordSubmit, remainingTime) {
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
    scheduleNextWord(bot, onWordSubmit, remainingTime - delay);
  }, delay);

  bot.nextWordTime = Date.now() + delay;
}

/**
 * Stop a bot from playing
 * @param {object} bot - Bot object
 */
function stopBot(bot) {
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
 * @param {string} gameCode - Game code
 */
function stopAllBots(gameCode) {
  const bots = gameBots.get(gameCode);
  if (!bots) return;

  for (const bot of bots.values()) {
    stopBot(bot);
  }

  logger.info('BOT', `Stopped all bots in game ${gameCode}`);
}

/**
 * Clean up all bots for a game
 * @param {string} gameCode - Game code
 */
function cleanupGameBots(gameCode) {
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
 * @param {string} gameCode - Game code
 * @param {string} username - Bot username
 */
function resetBotCombo(gameCode, username) {
  const bot = getBotByUsername(gameCode, username);
  if (bot) {
    bot.comboLevel = 0;
  }
}

/**
 * Get bot statistics for display
 * @param {string} gameCode - Game code
 * @param {string} username - Bot username
 * @returns {object|null} - Bot stats
 */
function getBotStats(gameCode, username) {
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
 * @returns {object} - Cache and active bot statistics
 */
function getBotManagerStats() {
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
function clearBotManagerCaches() {
  clearBehaviorCaches();
}

// ==========================================
// Exports
// ==========================================

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

  // Configuration (re-exported for backwards compatibility)
  BOT_CONFIG,
};
