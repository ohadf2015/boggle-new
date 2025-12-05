/**
 * Score Manager Module
 * Handles player scores, words, and leaderboard operations
 * Extracted from gameStateManager.js for better modularity
 */

// Leaderboard throttling - maps gameCode to timeout ID
const leaderboardThrottleTimers = {};
const leaderboardLastBroadcast = {};
const leaderboardPendingUpdate = {};

/**
 * Add a word to a player's list (both playerWords and playerWordDetails)
 * @param {object} game - Game object
 * @param {string} username - Username
 * @param {string} word - Word to add
 * @param {Object} options - Additional word details
 * @param {boolean} options.autoValidated - Whether word was auto-validated
 * @param {boolean|null} options.validated - Explicit validation status (true/false/null)
 * @param {number} options.score - Score for this word (with combo if applicable)
 * @param {number} options.comboBonus - Combo bonus points earned
 * @param {number} options.comboLevel - Combo level when word was submitted
 */
function addPlayerWord(game, username, word, options = {}) {
  if (!game) return;

  const normalizedWord = word.toLowerCase();

  // Initialize playerWords if needed
  if (!game.playerWords[username]) {
    game.playerWords[username] = [];
  }

  // Initialize playerWordDetails if needed
  if (!game.playerWordDetails) {
    game.playerWordDetails = {};
  }
  if (!game.playerWordDetails[username]) {
    game.playerWordDetails[username] = [];
  }

  // Only add if not already present
  if (!game.playerWords[username].includes(normalizedWord)) {
    game.playerWords[username].push(normalizedWord);

    // Calculate time since game start
    const currentTime = Date.now();
    const timeSinceStart = game.startTime ? (currentTime - game.startTime) / 1000 : 0;

    // Determine validated status:
    // - If explicitly provided (true/false), use it
    // - If autoValidated is true, set to true
    // - Otherwise null (pending validation)
    let validatedStatus;
    if (options.validated !== undefined) {
      validatedStatus = options.validated;
    } else if (options.autoValidated) {
      validatedStatus = true;
    } else {
      validatedStatus = null;
    }

    // Add to playerWordDetails for achievement tracking
    game.playerWordDetails[username].push({
      word: normalizedWord,
      score: options.score || 0,
      comboBonus: options.comboBonus || 0,
      comboLevel: options.comboLevel || 0,
      timestamp: currentTime,
      timeSinceStart,
      validated: validatedStatus,
      autoValidated: options.autoValidated || false,
      onBoard: true,
      isBot: options.isBot || false,
    });
  }
}

/**
 * Check if player already has a word
 * @param {object} game - Game object
 * @param {string} username - Username
 * @param {string} word - Word to check
 * @returns {boolean}
 */
function playerHasWord(game, username, word) {
  if (!game) return false;
  return game.playerWords[username]?.includes(word.toLowerCase()) || false;
}

/**
 * Update player score
 * @param {object} game - Game object
 * @param {string} username - Username
 * @param {number} score - New score or delta
 * @param {boolean} isDelta - Whether score is a delta to add
 */
function updatePlayerScore(game, username, score, isDelta = false) {
  if (!game) return;

  if (!game.playerScores[username]) {
    game.playerScores[username] = 0;
  }

  if (isDelta) {
    game.playerScores[username] += score;
  } else {
    game.playerScores[username] = score;
  }
}

/**
 * Get leaderboard for a game
 * @param {object} game - Game object
 * @returns {array} - Sorted leaderboard
 */
function getLeaderboard(game) {
  if (!game) return [];

  return Object.entries(game.playerScores)
    .map(([username, score]) => ({
      username,
      score,
      wordCount: game.playerWords[username]?.length || 0,
      avatar: game.users[username]?.avatar
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Get leaderboard with leading-edge throttling for immediate feedback
 * Uses a leading-edge pattern: broadcasts immediately on first call,
 * then throttles subsequent calls to prevent excessive updates.
 * This ensures players get immediate feedback while preventing broadcast storms.
 *
 * @param {object} game - Game object
 * @param {string} gameCode - Game code
 * @param {function} broadcastFn - Function to call with leaderboard data
 * @param {number} throttleMs - Throttle duration in milliseconds (default 500ms)
 */
function getLeaderboardThrottled(game, gameCode, broadcastFn, throttleMs = 500) {
  if (!game) return;

  const now = Date.now();
  const lastBroadcast = leaderboardLastBroadcast[gameCode] || 0;
  const timeSinceLastBroadcast = now - lastBroadcast;

  // If enough time has passed since last broadcast, send immediately (leading edge)
  if (timeSinceLastBroadcast >= throttleMs) {
    const leaderboard = getLeaderboard(game);
    if (broadcastFn && typeof broadcastFn === 'function') {
      broadcastFn(leaderboard);
    }
    leaderboardLastBroadcast[gameCode] = now;

    // Clear any pending trailing update since we just broadcasted
    if (leaderboardThrottleTimers[gameCode]) {
      clearTimeout(leaderboardThrottleTimers[gameCode]);
      delete leaderboardThrottleTimers[gameCode];
    }
    leaderboardPendingUpdate[gameCode] = false;
  } else {
    // Within throttle window - mark that we have a pending update
    leaderboardPendingUpdate[gameCode] = true;

    // Set a trailing-edge timer to catch any updates during the throttle window
    // Only set if not already set
    if (!leaderboardThrottleTimers[gameCode]) {
      const remainingTime = throttleMs - timeSinceLastBroadcast;
      leaderboardThrottleTimers[gameCode] = setTimeout(() => {
        // Only broadcast if there's actually a pending update
        if (leaderboardPendingUpdate[gameCode]) {
          const leaderboard = getLeaderboard(game);
          if (broadcastFn && typeof broadcastFn === 'function') {
            broadcastFn(leaderboard);
          }
          leaderboardLastBroadcast[gameCode] = Date.now();
          leaderboardPendingUpdate[gameCode] = false;
        }
        delete leaderboardThrottleTimers[gameCode];
      }, remainingTime);
    }
  }
}

/**
 * Clear leaderboard throttle state for a game
 * @param {string} gameCode - Game code
 */
function clearLeaderboardThrottle(gameCode) {
  if (leaderboardThrottleTimers[gameCode]) {
    clearTimeout(leaderboardThrottleTimers[gameCode]);
    delete leaderboardThrottleTimers[gameCode];
  }
  delete leaderboardLastBroadcast[gameCode];
  delete leaderboardPendingUpdate[gameCode];
}

/**
 * Reset player scores and words for a new round
 * @param {object} game - Game object
 */
function resetScoresForNewRound(game) {
  if (!game) return;

  // COMPLETELY clear all game data first to prevent stale data from previous games
  game.playerScores = {};
  game.playerWords = {};
  game.playerWordDetails = {};
  game.playerAchievements = {};
  game.playerCombos = {}; // Reset combo tracking for new round
  game.firstWordFound = false; // Reset FIRST_BLOOD achievement flag

  // Re-initialize scores/words only for CURRENT players in the room
  for (const username of Object.keys(game.users)) {
    game.playerScores[username] = 0;
    game.playerWords[username] = [];
    game.playerWordDetails[username] = [];
    game.playerAchievements[username] = [];
    game.playerCombos[username] = 0; // Initialize combo tracking
  }
}

module.exports = {
  // Word management
  addPlayerWord,
  playerHasWord,

  // Score management
  updatePlayerScore,

  // Leaderboard
  getLeaderboard,
  getLeaderboardThrottled,
  clearLeaderboardThrottle,

  // Reset
  resetScoresForNewRound,
};
