/**
 * User Manager Module
 * Handles user CRUD operations, socket mappings, and auth connections
 * Extracted from gameStateManager.js for better modularity
 */

// Socket to game mapping - maps socket.id to gameCode
const socketToGame = new Map();

// Socket to username mapping - maps socket.id to username
const socketToUsername = new Map();

// Username to socket mapping - maps "gameCode:username" to socket.id
const usernameToSocket = new Map();

// Track authenticated users across all games
// Maps authUserId -> { gameCode, socketId, username, isHost, connectedAt }
const authUserConnections = new Map();

/**
 * Add a user to a game
 * @param {object} game - Game object
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} socketId - Socket ID
 * @param {object} options - Additional options
 * @returns {boolean} - Whether addition was successful
 */
function addUserToGame(game, gameCode, username, socketId, options = {}) {
  if (!game) return false;

  const { avatar = null, isHost = false, playerId = null, authUserId = null, guestTokenHash = null } = options;

  // Store user data with auth context and presence tracking
  game.users[username] = {
    socketId,
    avatar,
    isHost,
    playerId,
    authUserId,        // Supabase user ID for authenticated users
    guestTokenHash,    // Hashed guest token for guest users
    joinedAt: Date.now(),
    // Presence tracking
    lastActivityAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    isWindowFocused: true,
    presenceStatus: 'active', // 'active' | 'idle' | 'afk'
  };

  // Initialize player tracking
  if (!game.playerScores[username]) {
    game.playerScores[username] = 0;
  }
  if (!game.playerWords[username]) {
    game.playerWords[username] = [];
  }
  if (!game.playerAchievements[username]) {
    game.playerAchievements[username] = [];
  }
  if (!game.playerWordDetails) {
    game.playerWordDetails = {};
  }
  if (!game.playerWordDetails[username]) {
    game.playerWordDetails[username] = [];
  }

  // Update mappings
  socketToGame.set(socketId, gameCode);
  socketToUsername.set(socketId, username);
  usernameToSocket.set(`${gameCode}:${username}`, socketId);

  // Track authenticated user globally for multi-tab detection
  if (authUserId) {
    setAuthUserConnection(authUserId, { gameCode, socketId, username, isHost });
  }

  game.lastActivity = Date.now();
  return true;
}

/**
 * Remove a user from a game
 * @param {object} game - Game object
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 */
function removeUserFromGame(game, gameCode, username) {
  if (!game) return;

  // Remove from global auth tracking before removing user data
  const userData = game.users[username];
  if (userData && userData.authUserId) {
    removeAuthUserConnection(userData.authUserId);
  }

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
 * @param {object} games - Games object
 * @param {string} socketId - Socket ID
 * @param {function} removeUserFn - Function to remove user from game
 * @returns {object|null} - Removed user info { gameCode, username } or null
 */
function removeUserBySocketId(games, socketId, removeUserFn) {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  const game = games[gameCode];
  if (game) {
    removeUserFn(gameCode, username);
  }

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
 * @param {object} games - Games object
 * @param {string} socketId - Socket ID
 * @returns {object|null} - User data with gameCode and username
 */
function getUserBySocketId(games, socketId) {
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
 * @param {object} game - Game object
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} newSocketId - New socket ID
 * @param {object} authContext - Optional auth context to update { authUserId, guestTokenHash }
 */
function updateUserSocketId(game, gameCode, username, newSocketId, authContext = null) {
  if (!game || !game.users[username]) return false;

  const oldSocketId = game.users[username].socketId;

  // Clean up old mappings
  if (oldSocketId) {
    socketToGame.delete(oldSocketId);
    socketToUsername.delete(oldSocketId);
  }

  // Update user data
  game.users[username].socketId = newSocketId;

  // Update auth context if provided (for reconnection with new auth state)
  if (authContext) {
    if (authContext.authUserId !== undefined) {
      game.users[username].authUserId = authContext.authUserId;
    }
    if (authContext.guestTokenHash !== undefined) {
      game.users[username].guestTokenHash = authContext.guestTokenHash;
    }
  }

  // Set up new mappings
  socketToGame.set(newSocketId, gameCode);
  socketToUsername.set(newSocketId, username);
  usernameToSocket.set(`${gameCode}:${username}`, newSocketId);

  // Update auth user connection tracking
  const authUserId = authContext?.authUserId || game.users[username]?.authUserId;
  if (authUserId) {
    setAuthUserConnection(authUserId, {
      gameCode,
      socketId: newSocketId,
      username,
      isHost: game.users[username]?.isHost || false
    });
  }

  return true;
}

/**
 * Get all users in a game
 * @param {object} game - Game object
 * @returns {array} - Array of user objects
 */
function getGameUsers(game) {
  if (!game) return [];

  return Object.entries(game.users).map(([username, data]) => ({
    username,
    isHost: data.isHost,
    avatar: data.avatar,
    score: game.playerScores[username] || 0,
    // Include presence information
    presenceStatus: data.presenceStatus || 'active',
    isWindowFocused: data.isWindowFocused !== false,
    lastActivityAt: data.lastActivityAt || Date.now(),
    // Include bot information
    isBot: data.isBot || false,
    botDifficulty: data.botDifficulty || null,
  }));
}

/**
 * Check if user is host
 * @param {object} games - Games object
 * @param {string} socketId - Socket ID
 * @returns {boolean}
 */
function isHost(games, socketId) {
  const gameCode = socketToGame.get(socketId);
  if (!gameCode) return false;

  const game = games[gameCode];
  if (!game) return false;

  return game.hostSocketId === socketId;
}

/**
 * Update host socket ID (for reconnection)
 * @param {object} game - Game object
 * @param {string} newSocketId - New socket ID
 */
function updateHostSocketId(game, newSocketId) {
  if (game) {
    game.hostSocketId = newSocketId;
  }
}

/**
 * Get connection info for an authenticated user
 * @param {string} authUserId - Supabase auth user ID
 * @returns {object|null} - { gameCode, socketId, username, isHost, connectedAt } or null
 */
function getAuthUserConnection(authUserId) {
  if (!authUserId) return null;
  return authUserConnections.get(authUserId) || null;
}

/**
 * Set connection info for an authenticated user
 * @param {string} authUserId - Supabase auth user ID
 * @param {object} connectionInfo - { gameCode, socketId, username, isHost }
 */
function setAuthUserConnection(authUserId, connectionInfo) {
  if (!authUserId) return;
  authUserConnections.set(authUserId, {
    ...connectionInfo,
    connectedAt: Date.now()
  });
}

/**
 * Remove connection info for an authenticated user
 * @param {string} authUserId - Supabase auth user ID
 */
function removeAuthUserConnection(authUserId) {
  if (!authUserId) return;
  authUserConnections.delete(authUserId);
}

/**
 * Clear socket mappings without removing user data (for disconnect grace period)
 * @param {string} socketId - Socket ID to clear
 * @returns {object|null} - { gameCode, username } or null
 */
function clearSocketMappings(socketId) {
  const gameCode = socketToGame.get(socketId);
  const username = socketToUsername.get(socketId);

  if (!gameCode || !username) return null;

  socketToGame.delete(socketId);
  socketToUsername.delete(socketId);
  // Note: Don't delete usernameToSocket - user data remains valid for reconnection

  return { gameCode, username };
}

/**
 * Clean up user mappings for a game being deleted
 * @param {object} game - Game object
 * @param {string} gameCode - Game code
 */
function cleanupUserMappings(game, gameCode) {
  if (!game) return;

  for (const username of Object.keys(game.users)) {
    const key = `${gameCode}:${username}`;
    const socketId = usernameToSocket.get(key);
    if (socketId) {
      socketToGame.delete(socketId);
      socketToUsername.delete(socketId);
      usernameToSocket.delete(key);
    }
  }
}

module.exports = {
  // User CRUD
  addUserToGame,
  removeUserFromGame,
  removeUserBySocketId,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getUserBySocketId,
  updateUserSocketId,
  getGameUsers,

  // Host management
  isHost,
  updateHostSocketId,

  // Auth user tracking
  getAuthUserConnection,
  setAuthUserConnection,
  removeAuthUserConnection,
  clearSocketMappings,
  cleanupUserMappings,

  // Expose maps for testing
  _socketToGame: socketToGame,
  _socketToUsername: socketToUsername,
  _usernameToSocket: usernameToSocket,
  _authUserConnections: authUserConnections,
};
