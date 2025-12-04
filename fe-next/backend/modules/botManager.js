/**
 * Bot Manager
 * Manages AI bot players for Boggle games
 * Bots simulate human-like behavior with realistic timing and word finding
 */

const { findWordsForBots } = require('./boggleSolver');
const { calculateWordScore } = require('./scoringEngine');
const logger = require('../utils/logger');

// Bot configuration constants
const BOT_CONFIG = {
  // Timing ranges in milliseconds (simulates human thinking/typing)
  TIMING: {
    easy: {
      minDelay: 4000,    // Minimum time between words
      maxDelay: 12000,   // Maximum time between words
      startDelay: 3000,  // Initial delay before first word
      typingSpeed: 300,  // Base ms per character "typing"
    },
    medium: {
      minDelay: 2500,
      maxDelay: 8000,
      startDelay: 2000,
      typingSpeed: 200,
    },
    hard: {
      minDelay: 1500,
      maxDelay: 5000,
      startDelay: 1000,
      typingSpeed: 100,
    }
  },
  // Word selection configuration
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
      wordsPerMinute: 5,
      focusOnShort: false,
      missChance: 0.08,
      wrongWordChance: 0.08,  // 8% wrong word chance
    },
    hard: {
      maxWordLength: 12,
      wordsPerMinute: 8,
      focusOnShort: false,
      missChance: 0.02,
      wrongWordChance: 0.03,  // 3% wrong word chance (experts make fewer mistakes)
    }
  },
  // Bot appearance
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
  ],
  // Bot names (with difficulty modifier)
  NAMES: {
    easy: ['Rookie', 'Newbie', 'Learner', 'Novice', 'Beginner', 'Starter', 'Junior', 'Trainee'],
    medium: ['Player', 'Gamer', 'Challenger', 'Competitor', 'Contender', 'Rival', 'Fighter'],
    hard: ['Expert', 'Master', 'Pro', 'Champion', 'Elite', 'Ace', 'Legend', 'Titan', 'Wizard'],
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
function createBot(gameCode, difficulty = 'medium', existingUsers = {}) {
  const existingNames = Object.keys(existingUsers);
  const existingAvatars = Object.values(existingUsers).map(u => u.avatar);

  const botId = generateBotId(gameCode);
  const botName = generateBotName(difficulty, existingNames);
  const avatar = getRandomAvatar(existingAvatars);

  const bot = {
    id: botId,
    username: botName,
    avatar,
    difficulty,
    isBot: true,
    // Game state
    wordsToFind: [],       // Queue of words the bot will submit
    wordsFound: [],        // Words already submitted
    currentWordIndex: 0,
    score: 0,
    comboLevel: 0,
    // Timing state
    nextWordTime: null,
    timers: [],            // Active setTimeout IDs for cleanup
    isActive: false,
    // Statistics (for human-like variation)
    avgThinkingTime: BOT_CONFIG.TIMING[difficulty].minDelay +
      Math.random() * (BOT_CONFIG.TIMING[difficulty].maxDelay - BOT_CONFIG.TIMING[difficulty].minDelay),
    typingSpeed: BOT_CONFIG.TIMING[difficulty].typingSpeed * (0.8 + Math.random() * 0.4),
  };

  return bot;
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
 * Prepare bot for a game - find words and set up submission queue
 * @param {object} bot - Bot object
 * @param {string[][]} grid - Letter grid
 * @param {string} language - Game language
 */
function prepareBotWords(bot, grid, language) {
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

  // Shuffle to add variety (humans don't find words in order)
  for (let i = wordPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordPool[i], wordPool[j]] = [wordPool[j], wordPool[i]];
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
 * @param {object} bot - Bot object
 * @returns {number} - Delay in milliseconds
 */
function calculateNextDelay(bot) {
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  // Base delay with randomization
  let delay = timing.minDelay + Math.random() * (timing.maxDelay - timing.minDelay);

  // Add "typing time" based on word length
  const nextWord = bot.wordsToFind[bot.currentWordIndex];
  if (nextWord) {
    delay += nextWord.length * bot.typingSpeed;
  }

  // Add occasional "thinking" pauses (humans sometimes pause)
  if (Math.random() < 0.15) {
    delay += 1000 + Math.random() * 3000;
  }

  // Slight speed up as combo builds (humans get into rhythm)
  if (bot.comboLevel > 0) {
    delay *= Math.max(0.6, 1 - (bot.comboLevel * 0.05));
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
function startBot(bot, grid, language, onWordSubmit, gameDuration) {
  // Prepare words if not already done
  if (bot.wordsToFind.length === 0) {
    prepareBotWords(bot, grid, language);
  }

  bot.isActive = true;
  const timing = BOT_CONFIG.TIMING[bot.difficulty] || BOT_CONFIG.TIMING.medium;

  // Calculate how many words to attempt based on game duration
  const config = BOT_CONFIG.WORDS[bot.difficulty] || BOT_CONFIG.WORDS.medium;
  const targetWords = Math.floor((gameDuration / 60) * config.wordsPerMinute);

  // Limit words to target (don't use all words)
  bot.wordsToFind = bot.wordsToFind.slice(0, Math.min(bot.wordsToFind.length, targetWords * 2));

  // Schedule first word after initial delay
  const firstWordDelay = timing.startDelay + Math.random() * 2000;

  const timer = setTimeout(() => {
    scheduleNextWord(bot, onWordSubmit, gameDuration * 1000 - firstWordDelay);
  }, firstWordDelay);

  bot.timers.push(timer);

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
      const timer = setTimeout(() => {
        submitBotWord(bot, onWordSubmit);
      }, Math.min(remainingTime - 1500, 1000));
      bot.timers.push(timer);
    }
    return;
  }

  const timer = setTimeout(() => {
    if (!bot.isActive) return;

    submitBotWord(bot, onWordSubmit);
    scheduleNextWord(bot, onWordSubmit, remainingTime - delay);
  }, delay);

  bot.timers.push(timer);
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

  // Clear all scheduled timers
  for (const timer of bot.timers) {
    clearTimeout(timer);
  }
  bot.timers = [];
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

  // Configuration
  BOT_CONFIG,
};
