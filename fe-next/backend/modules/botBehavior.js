/**
 * Bot Behavior Module
 * Handles bot word preparation, timing calculations, and submission logic
 *
 * Extracted from botManager.js for better separation of concerns
 */

const { findWordsForBots } = require('./boggleSolver');
const { calculateWordScore } = require('./scoringEngine');
const { getPopularPlayerWords, getSupabase } = require('./supabaseServer');
const { BOT_CONFIG, CACHE_CONFIG } = require('./botConfig');
const logger = require('../utils/logger');

// Cache for player words per language (refreshed periodically)
const playerWordsCache = new Map();

// Cache for blacklisted words (words bots should not use)
const blacklistCache = new Map();

// ==========================================
// Cache Management
// ==========================================

/**
 * Clean up expired entries from playerWordsCache
 * Called periodically to prevent memory bloat
 */
function cleanupPlayerWordsCache() {
  const now = Date.now();
  let deleted = 0;

  for (const [language, entry] of playerWordsCache.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.PLAYER_WORDS_TTL * 2) {
      playerWordsCache.delete(language);
      deleted++;
    }
  }

  // If still too many entries, remove oldest
  if (playerWordsCache.size > CACHE_CONFIG.MAX_PLAYER_WORDS_CACHE_SIZE) {
    const entries = Array.from(playerWordsCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, playerWordsCache.size - CACHE_CONFIG.MAX_PLAYER_WORDS_CACHE_SIZE);
    for (const [language] of toRemove) {
      playerWordsCache.delete(language);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.debug('BOT', `Cleaned up ${deleted} expired player words cache entries`);
  }

  return deleted;
}

/**
 * Get cached player words for a language, refreshing if needed
 * @param {string} language - Language code
 * @returns {Promise<string[]>} - Array of popular player words
 */
async function getCachedPlayerWords(language) {
  const cacheEntry = playerWordsCache.get(language);
  const now = Date.now();

  if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_CONFIG.PLAYER_WORDS_TTL) {
    return cacheEntry.words;
  }

  // Periodically cleanup (10% chance per call)
  if (Math.random() < 0.1) {
    cleanupPlayerWordsCache();
  }

  // Fetch fresh data
  try {
    const { data: words } = await getPopularPlayerWords(language, 500);
    playerWordsCache.set(language, { words, timestamp: now });
    logger.debug('BOT', `Refreshed player words cache for ${language}: ${words.length} words`);
    return words;
  } catch (err) {
    logger.debug('BOT', `Failed to fetch player words: ${err.message}`);
    return cacheEntry?.words || [];
  }
}

/**
 * Get cached blacklist for a language, refreshing if needed
 * @param {string} language - Language code
 * @returns {Promise<Set<string>>} - Set of blacklisted words
 */
async function getCachedBlacklist(language) {
  const cacheEntry = blacklistCache.get(language);
  const now = Date.now();

  if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_CONFIG.BLACKLIST_TTL) {
    return cacheEntry.words;
  }

  // Fetch fresh data from database
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return new Set();
    }

    const { data, error } = await supabase
      .from('bot_word_blacklist')
      .select('word')
      .eq('language', language);

    if (error) {
      // Table might not exist yet
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return new Set();
      }
      throw error;
    }

    const words = new Set((data || []).map(row => row.word.toLowerCase()));
    blacklistCache.set(language, { words, timestamp: now });
    logger.debug('BOT', `Refreshed blacklist cache for ${language}: ${words.size} words`);
    return words;
  } catch (err) {
    logger.debug('BOT', `Failed to fetch blacklist: ${err.message}`);
    return cacheEntry?.words || new Set();
  }
}

/**
 * Clear all bot behavior caches
 */
function clearBehaviorCaches() {
  const playerWordsCount = playerWordsCache.size;
  const blacklistCount = blacklistCache.size;
  playerWordsCache.clear();
  blacklistCache.clear();
  logger.info('BOT', `Cleared behavior caches: ${playerWordsCount} player words, ${blacklistCount} blacklist entries`);
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    playerWordsCacheSize: playerWordsCache.size,
    playerWordsCacheLanguages: Array.from(playerWordsCache.keys()),
    blacklistCacheSize: blacklistCache.size,
    blacklistCacheLanguages: Array.from(blacklistCache.keys()),
  };
}

// ==========================================
// Word Generation
// ==========================================

/**
 * Generate fake/wrong words from the grid that look real but aren't in dictionary
 * This simulates human behavior of trying words that "look correct"
 * @param {string[][]} grid - Letter grid
 * @param {number} count - Number of wrong words to generate
 * @returns {string[]} - Array of fake words
 */
function generateWrongWords(grid, count) {
  if (!grid || !grid.length || !grid[0] || count <= 0) return [];

  const rows = grid.length;
  const cols = grid[0].length;
  const wrongWords = [];
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  // Generate random paths on the grid to create fake words
  for (let attempt = 0; attempt < count * 3 && wrongWords.length < count; attempt++) {
    const wordLength = 3 + Math.floor(Math.random() * 4); // 3-6 letters
    let word = '';
    const visited = new Set();

    // Start from random position
    let row = Math.floor(Math.random() * rows);
    let col = Math.floor(Math.random() * cols);

    for (let i = 0; i < wordLength; i++) {
      const key = `${row},${col}`;
      if (visited.has(key) || row < 0 || row >= rows || col < 0 || col >= cols) break;

      visited.add(key);
      word += grid[row][col].toLowerCase();

      // Move to random adjacent cell
      const validMoves = directions.filter(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(`${nr},${nc}`);
      });

      if (validMoves.length === 0) break;
      const [dr, dc] = validMoves[Math.floor(Math.random() * validMoves.length)];
      row += dr;
      col += dc;
    }

    // Only add if word is long enough and not already in list
    if (word.length >= 3 && !wrongWords.includes(word)) {
      wrongWords.push(word);
    }
  }

  return wrongWords;
}

/**
 * Prepare bot for a game - find words and set up submission queue
 * @param {object} bot - Bot object
 * @param {string[][]} grid - Letter grid
 * @param {string} language - Game language
 */
async function prepareBotWords(bot, grid, language) {
  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;

  // Find words using the solver
  const categorizedWords = findWordsForBots(grid, language, {
    minLength: 3,
    maxLength: config.maxWordLength
  });

  // Build word queue based on difficulty
  let wordPool = [];

  if (config.focusOnShort) {
    // Easy bots focus on short words
    wordPool = [
      ...categorizedWords.easy,
      ...categorizedWords.medium.slice(0, Math.floor(categorizedWords.medium.length * 0.3))
    ];
  } else if (bot.difficulty === 'hard') {
    // Hard bots find all words, prioritizing longer ones
    wordPool = [
      ...categorizedWords.hard,
      ...categorizedWords.medium,
      ...categorizedWords.easy
    ];
  } else {
    // Medium bots find a balanced mix
    wordPool = [
      ...categorizedWords.medium,
      ...categorizedWords.easy.slice(0, Math.floor(categorizedWords.easy.length * 0.7)),
      ...categorizedWords.hard.slice(0, Math.floor(categorizedWords.hard.length * 0.3))
    ];
  }

  // Apply miss chance (simulate human errors - sometimes don't find obvious words)
  wordPool = wordPool.filter(() => Math.random() > config.missChance);

  // Filter out blacklisted words (words that admins have marked as invalid for bots)
  try {
    const blacklist = await getCachedBlacklist(language);
    if (blacklist.size > 0) {
      const beforeCount = wordPool.length;
      wordPool = wordPool.filter(word => !blacklist.has(word.toLowerCase()));
      const filtered = beforeCount - wordPool.length;
      if (filtered > 0) {
        logger.debug('BOT', `Bot "${bot.username}" filtered out ${filtered} blacklisted words`);
      }
    }
  } catch (err) {
    logger.debug('BOT', `Failed to apply blacklist filter: ${err.message}`);
  }

  // Prioritize player-submitted words (words that real players have found before)
  // This makes bots feel more human-like by selecting words humans actually use
  try {
    const playerWords = await getCachedPlayerWords(language);
    if (playerWords.length > 0) {
      const prioritizedWords = [];
      const otherWords = [];

      for (const word of wordPool) {
        if (playerWords.includes(word)) {
          prioritizedWords.push(word);
        } else {
          otherWords.push(word);
        }
      }

      // Shuffle prioritized words among themselves, then put them first
      shuffleArray(prioritizedWords);
      shuffleArray(otherWords);

      // Combine: prioritized words first, then others
      wordPool = [...prioritizedWords, ...otherWords];

      if (prioritizedWords.length > 0) {
        logger.debug('BOT', `Bot "${bot.username}" prioritizing ${prioritizedWords.length} player-submitted words`);
      }
    }
  } catch (err) {
    // If prioritization fails, just continue with shuffled pool
    logger.debug('BOT', `Player word prioritization failed: ${err.message}`);
    shuffleArray(wordPool);
  }

  // Generate and insert wrong words (like humans trying words that "look right")
  const wrongWordChance = config.wrongWordChance || 0;
  if (wrongWordChance > 0) {
    const wrongWordCount = Math.ceil(wordPool.length * wrongWordChance);
    const wrongWords = generateWrongWords(grid, wrongWordCount);

    // Mark wrong words and insert them at random positions
    for (const wrongWord of wrongWords) {
      // Don't add if it's accidentally a real word in our pool
      if (!wordPool.includes(wrongWord)) {
        const insertPos = Math.floor(Math.random() * wordPool.length);
        wordPool.splice(insertPos, 0, wrongWord);
      }
    }

    logger.debug('BOT', `Bot "${bot.username}" will try ${wrongWords.length} wrong words`);
  }

  bot.wordsToFind = wordPool;
  bot.wordsFound = [];
  bot.currentWordIndex = 0;
  bot.score = 0;
  bot.comboLevel = 0;

  logger.debug('BOT', `Bot "${bot.username}" prepared ${wordPool.length} words to find`);
}

/**
 * Fisher-Yates shuffle algorithm
 * @param {Array} array - Array to shuffle in place
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ==========================================
// Timing Calculations
// ==========================================

/**
 * Calculate delay until next word submission (human-like timing)
 * Uses bot personality traits for more varied behavior
 * @param {object} bot - Bot object
 * @returns {number} - Delay in milliseconds
 */
function calculateNextDelay(bot) {
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  // Check if bot should enter burst mode (rapid word submissions)
  if (!bot.inBurstMode && Math.random() < (bot.burstChance || 0.15)) {
    bot.inBurstMode = true;
    bot.burstWordsRemaining = 2 + Math.floor(Math.random() * 3); // 2-4 words in burst
    logger.debug('BOT', `Bot "${bot.username}" entering burst mode (${bot.burstWordsRemaining} words)`);
  }

  // Handle burst mode - much faster submissions
  if (bot.inBurstMode && bot.burstWordsRemaining > 0) {
    bot.burstWordsRemaining--;
    if (bot.burstWordsRemaining === 0) {
      bot.inBurstMode = false;
      logger.debug('BOT', `Bot "${bot.username}" exiting burst mode`);
    }
    // Very short delay during burst (like a player who spotted multiple words)
    return Math.round(500 + Math.random() * 1500);
  }

  // Check for pause (streaky personality trait)
  if (bot.pauseChance && Math.random() < bot.pauseChance) {
    logger.debug('BOT', `Bot "${bot.username}" taking a thinking pause`);
    return Math.round(8000 + Math.random() * 7000); // 8-15 second pause
  }

  // Base delay with randomization
  let delay = timing.minDelay + Math.random() * (timing.maxDelay - timing.minDelay);

  // Add "typing time" based on word length
  const nextWord = bot.wordsToFind[bot.currentWordIndex];
  if (nextWord) {
    delay += nextWord.length * bot.typingSpeed;
  }

  // Add occasional "thinking" pauses (humans sometimes pause)
  if (Math.random() < 0.12) {
    delay += 1000 + Math.random() * 3000;
  }

  // Slight speed up as combo builds (humans get into rhythm)
  // Combo-focused bots get more speed boost
  if (bot.comboLevel > 0) {
    const comboSpeedBoost = bot.comboFocus ? 0.07 : 0.05;
    delay *= Math.max(0.5, 1 - (bot.comboLevel * comboSpeedBoost));
  }

  // Add small random variation to prevent patterns
  delay *= 0.9 + Math.random() * 0.2;

  return Math.round(delay);
}

// ==========================================
// Word Submission
// ==========================================

/**
 * Submit a word from the bot
 * @param {object} bot - Bot object
 * @param {function} onWordSubmit - Callback
 */
function submitBotWord(bot, onWordSubmit) {
  if (!bot.isActive || bot.currentWordIndex >= bot.wordsToFind.length) {
    return;
  }

  const word = bot.wordsToFind[bot.currentWordIndex];
  bot.currentWordIndex++;

  // Skip if already found (duplicate in queue)
  if (bot.wordsFound.includes(word)) {
    return;
  }

  bot.wordsFound.push(word);

  // Calculate score with combo
  const score = calculateWordScore(word, bot.comboLevel);
  bot.score += score;
  bot.comboLevel++;

  // Call the submission callback
  if (onWordSubmit && typeof onWordSubmit === 'function') {
    onWordSubmit({
      botId: bot.id,
      username: bot.username,
      word,
      score,
      comboLevel: bot.comboLevel - 1, // Combo level when submitted
    });
  }

  logger.debug('BOT', `Bot "${bot.username}" submitted "${word}" (score: ${score}, combo: ${bot.comboLevel})`);
}

// ==========================================
// Blacklist Management
// ==========================================

/**
 * Add a word to the bot blacklist - called when players reject a bot word
 * Words in the blacklist will not be used by bots in future games
 * @param {string} word - Word to blacklist
 * @param {string} language - Game language
 * @returns {Promise<boolean>} Success status
 */
async function addWordToBlacklist(word, language) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.warn('BOT', `Cannot add "${word}" to blacklist - Supabase not configured`);
      return false;
    }

    const normalizedWord = word.toLowerCase().trim();

    // Insert into bot_word_blacklist table
    const { error } = await supabase
      .from('bot_word_blacklist')
      .insert({
        word: normalizedWord,
        language: language || 'en',
        created_at: new Date().toISOString()
      });

    if (error) {
      // Ignore duplicate errors (word already blacklisted)
      if (error.code === '23505') {
        logger.debug('BOT', `Word "${normalizedWord}" already in blacklist for ${language}`);
        return true;
      }
      throw error;
    }

    // Clear the blacklist cache for this language so it's refreshed
    blacklistCache.delete(language || 'en');

    logger.info('BOT', `Added "${normalizedWord}" to bot blacklist for ${language}`);
    return true;
  } catch (error) {
    logger.error('BOT', `Failed to add "${word}" to blacklist: ${error.message}`);
    return false;
  }
}

module.exports = {
  // Word preparation
  prepareBotWords,
  generateWrongWords,

  // Timing
  calculateNextDelay,

  // Word submission
  submitBotWord,

  // Cache management
  getCachedPlayerWords,
  getCachedBlacklist,
  cleanupPlayerWordsCache,
  clearBehaviorCaches,
  getCacheStats,

  // Blacklist
  addWordToBlacklist,
};
