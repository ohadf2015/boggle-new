/**
 * Game State Manager
 * Centralized game state management for Socket.IO
 * Uses socket IDs instead of WebSocket references
 */

// Game storage - maps gameCode to game object
const games = {};

// Socket to game mapping - maps socket.id to gameCode
const socketToGame = new Map();

// Socket to username mapping - maps socket.id to username
const socketToUsername = new Map();

// Username to socket mapping - maps "gameCode:username" to socket.id
const usernameToSocket = new Map();

// Leaderboard throttling - maps gameCode to timeout ID
const leaderboardThrottleTimers = {};

/**
 * Create a new game
 * @param {string} gameCode - Unique game code
 * @param {object} gameData - Initial game data
 */
function createGame(gameCode, gameData) {
  games[gameCode] = {
    gameCode,
    hostSocketId: gameData.hostSocketId,
    hostUsername: gameData.hostUsername,
    hostPlayerId: gameData.hostPlayerId,
    roomName: gameData.roomName || gameCode,
    language: gameData.language || 'en',
    users: {}, // username -> { socketId, avatar, isHost }
    playerScores: {},
    playerWords: {},
    playerAchievements: {},
    gameState: 'waiting', // waiting, in-progress, finished
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null, // Store timeout ID for host reconnection grace period
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  return games[gameCode];
}

/**
 * Get a game by code
 * @param {string} gameCode - Game code
 * @returns {object|null} - Game object or null
 */
function getGame(gameCode) {
  return games[gameCode] || null;
}

/**
 * Update a game
 * @param {string} gameCode - Game code
 * @param {object} updates - Updates to apply
 */
function updateGame(gameCode, updates) {
  if (games[gameCode]) {
    Object.assign(games[gameCode], updates, { lastActivity: Date.now() });
  }
}

/**
 * Delete a game
 * @param {string} gameCode - Game code
 */
function deleteGame(gameCode) {
  if (games[gameCode]) {
    // Clean up user mappings
    const game = games[gameCode];
    for (const username of Object.keys(game.users)) {
      const key = `${gameCode}:${username}`;
      const socketId = usernameToSocket.get(key);
      if (socketId) {
        socketToGame.delete(socketId);
        socketToUsername.delete(socketId);
        usernameToSocket.delete(key);
      }
    }
    delete games[gameCode];
  }
}

/**
 * Check if a game exists
 * @param {string} gameCode - Game code
 * @returns {boolean}
 */
function gameExists(gameCode) {
  return !!games[gameCode];
}

/**
 * Add a user to a game
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} socketId - Socket ID
 * @param {object} options - Additional options
 * @returns {boolean} - Whether addition was successful
 */
function addUserToGame(gameCode, username, socketId, options = {}) {
  const game = games[gameCode];
  if (!game) return false;

  const { avatar = null, isHost = false, playerId = null } = options;

  // Store user data
  game.users[username] = {
    socketId,
    avatar,
    isHost,
    playerId,
    joinedAt: Date.now()
  };

  // Initialize player tracking
  if (!game.playerScores[username]) {
    game.playerScores[username] = 0;
  }
  if (!game.playerWords[username]) {
    game.playerWords[username] = [];
  }

  // Update mappings
  socketToGame.set(socketId, gameCode);
  socketToUsername.set(socketId, username);
  usernameToSocket.set(`${gameCode}:${username}`, socketId);

  game.lastActivity = Date.now();
  return true;
}

/**
 * Remove a user from a game
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 */
function removeUserFromGame(gameCode, username) {
  const game = games[gameCode];
  if (!game) return;

  const key = `${gameCode}:${username}`;
  const socketId = usernameToSocket.get(key);

  if (socketId) {
    socketToGame.delete(socketId);
    socketToUsername.delete(socketId);
    usernameToSocket.delete(key);
  }

  delete game.users[username];
  game.lastActivity = Date.now();
}

/**
 * Remove a user by socket ID
 * @param {string} socketId - Socket ID
 * @returns {object|null} - Removed user info { gameCode, username } or null
 */
function removeUserBySocketId(socketId) {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  removeUserFromGame(gameCode, username);

  return { gameCode, username };
}

/**
 * Get user's game code by socket ID
 * @param {string} socketId - Socket ID
 * @returns {string|null} - Game code or null
 */
function getGameBySocketId(socketId) {
  return socketToGame.get(socketId) || null;
}

/**
 * Get username by socket ID
 * @param {string} socketId - Socket ID
 * @returns {string|null} - Username or null
 */
function getUsernameBySocketId(socketId) {
  return socketToUsername.get(socketId) || null;
}

/**
 * Get socket ID by username in a game
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @returns {string|null} - Socket ID or null
 */
function getSocketIdByUsername(gameCode, username) {
  return usernameToSocket.get(`${gameCode}:${username}`) || null;
}

/**
 * Get user by socket ID
 * @param {string} socketId - Socket ID
 * @returns {object|null} - User data with gameCode and username
 */
function getUserBySocketId(socketId) {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  const game = games[gameCode];
  if (!game || !game.users[username]) return null;

  return {
    gameCode,
    username,
    ...game.users[username]
  };
}

/**
 * Update a user's socket ID (for reconnection)
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} newSocketId - New socket ID
 */
function updateUserSocketId(gameCode, username, newSocketId) {
  const game = games[gameCode];
  if (!game || !game.users[username]) return false;

  const oldSocketId = game.users[username].socketId;

  // Clean up old mappings
  if (oldSocketId) {
    socketToGame.delete(oldSocketId);
    socketToUsername.delete(oldSocketId);
  }

  // Update user data
  game.users[username].socketId = newSocketId;

  // Set up new mappings
  socketToGame.set(newSocketId, gameCode);
  socketToUsername.set(newSocketId, username);
  usernameToSocket.set(`${gameCode}:${username}`, newSocketId);

  return true;
}

/**
 * Get all users in a game
 * @param {string} gameCode - Game code
 * @returns {array} - Array of user objects
 */
function getGameUsers(gameCode) {
  const game = games[gameCode];
  if (!game) return [];

  return Object.entries(game.users).map(([username, data]) => ({
    username,
    isHost: data.isHost,
    avatar: data.avatar,
    score: game.playerScores[username] || 0
  }));
}

/**
 * Get all active games
 * @returns {array} - Array of game summaries
 */
function getAllGames() {
  return Object.values(games).map(game => ({
    gameCode: game.gameCode,
    roomName: game.roomName,
    hostUsername: game.hostUsername,
    playerCount: Object.keys(game.users).length,
    gameState: game.gameState,
    language: game.language
  }));
}

/**
 * Get active rooms for lobby display
 * Filters out rooms with no players
 * @returns {array} - Array of room info
 */
function getActiveRooms() {
  return Object.values(games)
    .filter(game => Object.keys(game.users).length > 0) // Only show rooms with players
    .map(game => ({
      gameCode: game.gameCode,
      roomName: game.roomName,
      playerCount: Object.keys(game.users).length,
      gameState: game.gameState,
      language: game.language
    }));
}

/**
 * Get empty rooms (rooms with no players)
 * @returns {array} - Array of game codes for empty rooms
 */
function getEmptyRooms() {
  return Object.values(games)
    .filter(game => Object.keys(game.users).length === 0)
    .map(game => game.gameCode);
}

/**
 * Clean up empty rooms (rooms with no players)
 * @returns {number} - Number of rooms cleaned up
 */
function cleanupEmptyRooms() {
  const emptyRooms = getEmptyRooms();

  for (const gameCode of emptyRooms) {
    console.log(`[CLEANUP] Removing empty room: ${gameCode}`);
    deleteGame(gameCode);
  }

  return emptyRooms.length;
}

/**
 * Check if user is host
 * @param {string} socketId - Socket ID
 * @returns {boolean}
 */
function isHost(socketId) {
  const gameCode = socketToGame.get(socketId);
  if (!gameCode) return false;

  const game = games[gameCode];
  if (!game) return false;

  return game.hostSocketId === socketId;
}

/**
 * Update host socket ID (for reconnection)
 * @param {string} gameCode - Game code
 * @param {string} newSocketId - New socket ID
 */
function updateHostSocketId(gameCode, newSocketId) {
  const game = games[gameCode];
  if (game) {
    game.hostSocketId = newSocketId;
  }
}

/**
 * Reset game state for a new round
 * @param {string} gameCode - Game code
 */
function resetGameForNewRound(gameCode) {
  const game = games[gameCode];
  if (!game) return;

  // Reset scores and words but keep players
  for (const username of Object.keys(game.users)) {
    game.playerScores[username] = 0;
    game.playerWords[username] = [];
    game.playerAchievements[username] = [];
  }

  game.gameState = 'waiting';
  game.letterGrid = null;
  game.lastActivity = Date.now();
}

/**
 * Add a word to a player's list
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} word - Word to add
 */
function addPlayerWord(gameCode, username, word) {
  const game = games[gameCode];
  if (!game) return;

  if (!game.playerWords[username]) {
    game.playerWords[username] = [];
  }

  if (!game.playerWords[username].includes(word.toLowerCase())) {
    game.playerWords[username].push(word.toLowerCase());
  }
}

/**
 * Check if player already has a word
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} word - Word to check
 * @returns {boolean}
 */
function playerHasWord(gameCode, username, word) {
  const game = games[gameCode];
  if (!game) return false;

  return game.playerWords[username]?.includes(word.toLowerCase()) || false;
}

/**
 * Update player score
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {number} score - New score or delta
 * @param {boolean} isDelta - Whether score is a delta to add
 */
function updatePlayerScore(gameCode, username, score, isDelta = false) {
  const game = games[gameCode];
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
 * @param {string} gameCode - Game code
 * @returns {array} - Sorted leaderboard
 */
function getLeaderboard(gameCode) {
  const game = games[gameCode];
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
 * Get leaderboard with throttling to prevent excessive updates
 * @param {string} gameCode - Game code
 * @param {function} broadcastFn - Function to call with leaderboard data
 * @param {number} throttleMs - Throttle duration in milliseconds (default 1000ms)
 */
function getLeaderboardThrottled(gameCode, broadcastFn, throttleMs = 1000) {
  const game = games[gameCode];
  if (!game) return;

  // Clear existing timer for this game
  if (leaderboardThrottleTimers[gameCode]) {
    clearTimeout(leaderboardThrottleTimers[gameCode]);
  }

  // Set new timer to broadcast leaderboard after throttle period
  leaderboardThrottleTimers[gameCode] = setTimeout(() => {
    const leaderboard = getLeaderboard(gameCode);
    if (broadcastFn && typeof broadcastFn === 'function') {
      broadcastFn(leaderboard);
    }
    delete leaderboardThrottleTimers[gameCode];
  }, throttleMs);
}

/**
 * Cleanup stale games (older than maxAge)
 * @param {number} maxAge - Maximum age in milliseconds (default 2 hours)
 */
function cleanupStaleGames(maxAge = 2 * 60 * 60 * 1000) {
  const now = Date.now();
  const staleCodes = [];

  for (const [code, game] of Object.entries(games)) {
    if (now - game.lastActivity > maxAge) {
      staleCodes.push(code);
    }
  }

  for (const code of staleCodes) {
    console.log(`[CLEANUP] Removing stale game: ${code}`);
    deleteGame(code);
  }

  return staleCodes.length;
}

// Legacy compatibility exports (for gradual migration)
const gameWs = socketToGame;
const wsUsername = socketToUsername;
const getUsernameFromWs = getUsernameBySocketId;
const getGameCodeFromUsername = (username) => {
  for (const [gameCode, game] of Object.entries(games)) {
    if (game.users[username]) {
      return gameCode;
    }
  }
  return null;
};
const getWsHostFromGameCode = (gameCode) => games[gameCode]?.hostSocketId;
const getWsFromUsername = getSocketIdByUsername;
const getTournamentIdFromGame = (gameCode) => games[gameCode]?.tournamentId || null;
const setTournamentIdForGame = (gameCode, tournamentId) => {
  if (games[gameCode]) {
    games[gameCode].tournamentId = tournamentId;
    return true;
  }
  return false;
};

module.exports = {
  // Game CRUD
  games,
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,

  // User management
  addUserToGame,
  removeUserFromGame,
  removeUserBySocketId,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getUserBySocketId,
  updateUserSocketId,
  getGameUsers,

  // Game queries
  getAllGames,
  getActiveRooms,
  getEmptyRooms,
  cleanupEmptyRooms,

  // Host management
  isHost,
  updateHostSocketId,

  // Game state
  resetGameForNewRound,

  // Player data
  addPlayerWord,
  playerHasWord,
  updatePlayerScore,
  getLeaderboard,
  getLeaderboardThrottled,

  // Cleanup
  cleanupStaleGames,

  // Legacy compatibility
  gameWs,
  wsUsername,
  getUsernameFromWs,
  getGameCodeFromUsername,
  getWsHostFromGameCode,
  getWsFromUsername,
  getTournamentIdFromGame,
  setTournamentIdForGame
};
