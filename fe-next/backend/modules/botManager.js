/**
 * Bot Manager
 * Manages AI bot players for Boggle games
 * Bots simulate human-like behavior with realistic timing and word finding
 */

const { findWordsForBots } = require('./boggleSolver');
const { calculateWordScore } = require('./scoringEngine');
const { getPopularPlayerWords, getSupabase } = require('./supabaseServer');
const logger = require('../utils/logger');

// Cache for player words per language (refreshed periodically)
const playerWordsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_PLAYER_WORDS_CACHE_SIZE = 10; // Limit languages cached to prevent memory bloat

// Cache for blacklisted words (words bots should not use)
const blacklistCache = new Map();
const BLACKLIST_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Bot configuration constants
const BOT_CONFIG = {
  // Timing ranges in milliseconds (simulates human thinking/typing)
  // Medium and hard bots are intentionally slower to feel more realistic
  TIMING: {
    easy: {
      minDelay: 4000,    // Minimum time between words
      maxDelay: 12000,   // Maximum time between words
      startDelay: 3000,  // Initial delay before first word
      typingSpeed: 300,  // Base ms per character "typing"
    },
    medium: {
      minDelay: 3500,    // Increased from 2500 - more realistic thinking time
      maxDelay: 10000,   // Increased from 8000 - occasional longer pauses
      startDelay: 2500,  // Increased from 2000 - takes time to scan the board
      typingSpeed: 250,  // Increased from 200 - more realistic typing
    },
    hard: {
      minDelay: 3000,    // Increased from 2500 - still thinks before acting
      maxDelay: 9000,    // Increased from 7000 - occasional pondering
      startDelay: 2000,  // Increased from 1500 - scans board first
      typingSpeed: 200,  // Increased from 150 - more human-like typing
    }
  },
  // Word selection configuration
  // Medium and hard bots find fewer words per minute for more realistic gameplay
  WORDS: {
    easy: {
      maxWordLength: 5,       // Only find shorter words
      wordsPerMinute: 3,      // Average words found per minute
      focusOnShort: true,     // Prefer 3-4 letter words
      missChance: 0.15,       // 15% chance to "miss" a word (realistic errors)
      wrongWordChance: 0.12,  // 12% chance to submit a wrong word (like humans do)
    },
    medium: {
      maxWordLength: 7,
      wordsPerMinute: 4,      // Reduced from 5 - more realistic pace
      focusOnShort: false,
      missChance: 0.10,       // Increased from 0.08 - more realistic mistakes
      wrongWordChance: 0.08,  // 8% wrong word chance
    },
    hard: {
      maxWordLength: 8,
      wordsPerMinute: 4,      // Reduced from 5 - even experts take time
      focusOnShort: false,
      missChance: 0.10,       // Increased from 0.08 - more realistic
      wrongWordChance: 0.05,  // 5% wrong word chance (experts make fewer mistakes)
    }
  },
  // Bot appearance - More variety and personality
  AVATARS: [
    { emoji: '🤖', color: '#60a5fa' },
    { emoji: '🦾', color: '#34d399' },
    { emoji: '🎯', color: '#f472b6' },
    { emoji: '⚡', color: '#fbbf24' },
    { emoji: '🎮', color: '#a78bfa' },
    { emoji: '🧠', color: '#f87171' },
    { emoji: '🔮', color: '#c084fc' },
    { emoji: '🌟', color: '#facc15' },
    { emoji: '🚀', color: '#38bdf8' },
    { emoji: '🎲', color: '#4ade80' },
    // More personality-driven avatars
    { emoji: '🦊', color: '#fb923c' },
    { emoji: '🐺', color: '#6b7280' },
    { emoji: '🦁', color: '#f59e0b' },
    { emoji: '🐙', color: '#ec4899' },
    { emoji: '🦉', color: '#8b5cf6' },
    { emoji: '🐲', color: '#22c55e' },
    { emoji: '🦄', color: '#f472b6' },
    { emoji: '🐬', color: '#06b6d4' },
    { emoji: '🦅', color: '#78716c' },
    { emoji: '🐝', color: '#eab308' },
    { emoji: '🦋', color: '#14b8a6' },
    { emoji: '🌸', color: '#f9a8d4' },
    { emoji: '🔥', color: '#ef4444' },
    { emoji: '💎', color: '#67e8f9' },
    { emoji: '🎭', color: '#a855f7' },
  ],
  // Bot names (with difficulty modifier) - More personality and variety
  NAMES: {
    easy: [
      'Rookie', 'Newbie', 'Learner', 'Novice', 'Beginner', 'Starter', 'Junior', 'Trainee',
      'Padawan', 'Grasshopper', 'Apprentice', 'Cub', 'Fledgling', 'Seedling', 'Sprout',
      'Curious Cat', 'Word Pup', 'Letter Bug', 'Tiny Thinker', 'Baby Steps'
    ],
    medium: [
      'Player', 'Gamer', 'Challenger', 'Competitor', 'Contender', 'Rival', 'Fighter',
      'Wordsmith', 'Letter Hunter', 'Puzzle Pro', 'Grid Gazer', 'Word Warrior',
      'Scrabbler', 'Speller', 'Vocab Vulture', 'Syllable Seeker', 'Alpha Hunter',
      'Word Wrangler', 'Letter Lasso', 'Boggle Buddy', 'Grid Guru'
    ],
    hard: [
      'Expert', 'Master', 'Pro', 'Champion', 'Elite', 'Ace', 'Legend', 'Titan', 'Wizard',
      'Word Wizard', 'Lexicon Lord', 'Grammar Guru', 'Vocab Victor', 'Alpha King',
      'Dictionary Demon', 'Spelling Sage', 'Letter Legend', 'Word Whiz', 'Boggle Boss',
      'Grid Genius', 'Puzzle Phantom', 'Cerebral Storm', 'Mind Master', 'Brain Blitz'
    ],
  },
  // Bot personality traits (affects behavior patterns)
  PERSONALITIES: {
    // Aggressive bots submit words faster with smaller gaps
    aggressive: {
      delayMultiplier: 0.75,
      burstChance: 0.3,      // Chance to submit multiple words quickly
      comboFocus: true,      // Tries to maintain combo
    },
    // Methodical bots take their time but are more consistent
    methodical: {
      delayMultiplier: 1.25,
      burstChance: 0.1,
      comboFocus: false,
    },
    // Streaky bots have periods of intense activity followed by pauses
    streaky: {
      delayMultiplier: 1.0,
      burstChance: 0.5,      // Higher burst chance
      pauseChance: 0.2,      // Sometimes takes long pauses
      comboFocus: true,
    },
    // Steady bots maintain consistent pacing
    steady: {
      delayMultiplier: 1.0,
      burstChance: 0.15,
      comboFocus: false,
    }
  }
};

// Active bots per game
const gameBots = new Map();

// Bot ID counter per game
const botIdCounters = new Map();

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
 * Create a bot player
 * @param {string} gameCode - Game code
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @param {object} existingUsers - Object with existing usernames
 * @returns {object} - Bot player object
 */
/**
 * Get a random personality type for a bot
 * Different personalities create varied playing styles
 */
function getRandomPersonality() {
  const personalities = Object.keys(BOT_CONFIG.PERSONALITIES);
  return personalities[Math.floor(Math.random() * personalities.length)];
}

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
    gameCode,           // Game this bot belongs to
    username: botName,
    avatar,
    difficulty,
    personality,        // Bot's playing style personality
    isBot: true,
    // Game state
    wordsToFind: [],       // Queue of words the bot will submit
    wordsFound: [],        // Words already submitted
    currentWordIndex: 0,
    score: 0,
    comboLevel: 0,
    // Personality-adjusted state
    inBurstMode: false,    // Currently in a burst of quick submissions
    burstWordsRemaining: 0,
    // Timing state
    nextWordTime: null,
    activeTimers: new Set(), // FIXED: Use Set instead of array for O(1) add/delete
    isActive: false,
    // Statistics (for human-like variation) - adjusted by personality
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

/**
 * Create a self-cleaning timeout for a bot
 * The timer removes itself from the Set when it fires or is cleared
 * @param {object} bot - Bot object
 * @param {function} callback - Function to execute
 * @param {number} delay - Delay in ms
 * @returns {number} - Timer ID
 */
function setBotTimeout(bot, callback, delay) {
  const timerId = setTimeout(() => {
    // Remove self from active timers when fired
    bot.activeTimers.delete(timerId);
    // Only execute if bot is still active
    if (bot.isActive) {
      callback();
    }
  }, delay);

  bot.activeTimers.add(timerId);
  return timerId;
}

/**
 * Clear a specific bot timer
 * @param {object} bot - Bot object
 * @param {number} timerId - Timer ID to clear
 */
function clearBotTimeout(bot, timerId) {
  if (bot.activeTimers.has(timerId)) {
    clearTimeout(timerId);
    bot.activeTimers.delete(timerId);
  }
}

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

  // Clear all timers
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
 * Get a bot by ID (searches across all games)
 * @param {string} botId - Bot ID
 * @returns {object|null} - Bot object or null
 */
function getBot(botId) {
  for (const bots of gameBots.values()) {
    if (bots.has(botId)) {
      return bots.get(botId);
    }
  }
  return null;
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
 * Clean up expired entries from playerWordsCache
 * Called periodically to prevent memory bloat
 */
function cleanupPlayerWordsCache() {
  const now = Date.now();
  let deleted = 0;

  for (const [language, entry] of playerWordsCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL * 2) { // Keep for 2x TTL before deleting
      playerWordsCache.delete(language);
      deleted++;
    }
  }

  // If still too many entries, remove oldest
  if (playerWordsCache.size > MAX_PLAYER_WORDS_CACHE_SIZE) {
    const entries = Array.from(playerWordsCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, playerWordsCache.size - MAX_PLAYER_WORDS_CACHE_SIZE);
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

  if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_TTL) {
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

  if (cacheEntry && (now - cacheEntry.timestamp) < BLACKLIST_CACHE_TTL) {
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
      const wordPoolSet = new Set(wordPool);
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
      for (let i = prioritizedWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [prioritizedWords[i], prioritizedWords[j]] = [prioritizedWords[j], prioritizedWords[i]];
      }

      // Shuffle remaining words
      for (let i = otherWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherWords[i], otherWords[j]] = [otherWords[j], otherWords[i]];
      }

      // Combine: prioritized words first, then others
      wordPool = [...prioritizedWords, ...otherWords];

      if (prioritizedWords.length > 0) {
        logger.debug('BOT', `Bot "${bot.username}" prioritizing ${prioritizedWords.length} player-submitted words`);
      }
    }
  } catch (err) {
    // If prioritization fails, just continue with shuffled pool
    logger.debug('BOT', `Player word prioritization failed: ${err.message}`);

    // Shuffle to add variety (humans don't find words in order)
    for (let i = wordPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wordPool[i], wordPool[j]] = [wordPool[j], wordPool[i]];
    }
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
 * Calculate delay until next word submission (human-like timing)
 * Now uses bot personality traits for more varied behavior
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

/**
 * Start a bot playing the game
 * @param {object} bot - Bot object
 * @param {string[][]} grid - Letter grid
 * @param {string} language - Game language
 * @param {function} onWordSubmit - Callback when bot submits a word
 * @param {number} gameDuration - Game duration in seconds
 */
async function startBot(bot, grid, language, onWordSubmit, gameDuration) {
  // Always prepare fresh words for the new grid (fixes bots not finding words after first game)
  await prepareBotWords(bot, grid, language);

  bot.isActive = true;
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  // Calculate how many words to attempt based on game duration
  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;
  const targetWords = Math.floor((gameDuration / 60) * config.wordsPerMinute);

  // Limit words to target (don't use all words)
  bot.wordsToFind = bot.wordsToFind.slice(0, Math.min(bot.wordsToFind.length, targetWords * 2));

  // Schedule first word after initial delay
  const firstWordDelay = timing.startDelay + Math.random() * 2000;

  // Use self-cleaning timeout to prevent memory leak
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

/**
 * Stop a bot from playing
 * @param {object} bot - Bot object
 */
function stopBot(bot) {
  bot.isActive = false;

  // Clear all scheduled timers (activeTimers is a Set for O(1) operations)
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
  let gameCount = gameBots.size;

  for (const [gameCode, bots] of gameBots.entries()) {
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
    playerWordsCacheSize: playerWordsCache.size,
    playerWordsCacheLanguages: Array.from(playerWordsCache.keys())
  };
}

/**
 * Clear all bot manager caches (useful for testing or memory cleanup)
 */
function clearBotManagerCaches() {
  const playerWordsCount = playerWordsCache.size;
  playerWordsCache.clear();

  logger.info('BOT', `Cleared bot manager caches: ${playerWordsCount} player words cache entries`);
}

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
  // Bot management
  addBot,
  removeBot,
  getBot,
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

  // Configuration
  BOT_CONFIG,
};
