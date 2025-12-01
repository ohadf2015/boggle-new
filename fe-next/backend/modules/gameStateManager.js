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

// Presence tracking configuration
const PRESENCE_CONFIG = {
  IDLE_THRESHOLD: 30000,     // 30 seconds without activity = idle
  AFK_THRESHOLD: 45000,      // 45 seconds without activity = afk (for testing, change to 120000 for production)
  HEARTBEAT_TIMEOUT: 30000,  // 30 seconds without heartbeat = disconnected (increased for poor connections)
  WEAK_CONNECTION_THRESHOLD: 15000, // 15 seconds without heartbeat = weak connection warning
  MISSED_HEARTBEATS_FOR_WEAK: 2,    // Number of consecutive missed heartbeats before weak connection
};

// Track authenticated users across all games
// Maps authUserId -> { gameCode, socketId, username, isHost, connectedAt }
const authUserConnections = new Map();

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
    users: {}, // username -> { socketId, avatar, isHost, authUserId, guestTokenHash }
    playerScores: {},
    playerWords: {},
    playerAchievements: {},
    playerCombos: {}, // Track combo level per player for STREAK_MASTER achievement
    gameState: 'waiting', // waiting, in-progress, finished
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null, // Store timeout ID for host reconnection grace period
    isRanked: gameData.isRanked || false, // Ranked mode flag
    allowLateJoin: gameData.allowLateJoin !== false, // Allow late joins (default true, false for ranked)
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

    // Clean up any active timeouts to prevent memory leaks
    if (game.reconnectionTimeout) {
      clearTimeout(game.reconnectionTimeout);
      game.reconnectionTimeout = null;
    }
    if (game.validationTimeout) {
      clearTimeout(game.validationTimeout);
      game.validationTimeout = null;
    }

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
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 */
function removeUserFromGame(gameCode, username) {
  const game = games[gameCode];
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
 * @param {object} authContext - Optional auth context to update { authUserId, guestTokenHash }
 */
function updateUserSocketId(gameCode, username, newSocketId, authContext = null) {
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
    score: game.playerScores[username] || 0,
    // Include presence information
    presenceStatus: data.presenceStatus || 'active',
    isWindowFocused: data.isWindowFocused !== false,
    lastActivityAt: data.lastActivityAt || Date.now(),
  }));
}

/**
 * Update user presence status
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {object} presenceData - { isWindowFocused, lastActivityAt, forceIdle }
 * @returns {string|null} - New presence status or null if user not found
 */
function updateUserPresence(gameCode, username, presenceData) {
  const game = games[gameCode];
  if (!game || !game.users[username]) return null;

  const user = game.users[username];
  const now = Date.now();

  // Update presence data
  if (presenceData.isWindowFocused !== undefined) {
    user.isWindowFocused = presenceData.isWindowFocused;
  }
  if (presenceData.lastActivityAt !== undefined) {
    user.lastActivityAt = presenceData.lastActivityAt;
  }

  // Calculate presence status based on window focus and activity time
  const timeSinceActivity = now - (user.lastActivityAt || now);
  let newStatus = 'active';

  // Check for AFK first (regardless of window focus - 2 minutes of inactivity)
  if (timeSinceActivity >= PRESENCE_CONFIG.AFK_THRESHOLD) {
    newStatus = 'afk';
  }
  // If not AFK, check if idle (either window not focused OR 30 seconds of inactivity)
  else if (!user.isWindowFocused || presenceData.forceIdle || timeSinceActivity >= PRESENCE_CONFIG.IDLE_THRESHOLD) {
    newStatus = 'idle';
  }
  // else stays 'active'

  user.presenceStatus = newStatus;
  return newStatus;
}

/**
 * Update user heartbeat (proves connection is alive)
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @returns {object|null} - Connection status change info or null
 */
function updateUserHeartbeat(gameCode, username) {
  const game = games[gameCode];
  if (!game || !game.users[username]) return null;

  const user = game.users[username];
  const now = Date.now();
  const wasWeakConnection = user.connectionStatus === 'weak';

  // Reset heartbeat tracking
  user.lastHeartbeatAt = now;
  user.missedHeartbeats = 0;
  user.connectionStatus = 'stable';

  // Return status change if connection was previously weak
  if (wasWeakConnection) {
    return {
      statusChange: 'recovered',
      previousStatus: 'weak',
      newStatus: 'stable'
    };
  }
  return null;
}

/**
 * Check user connection health based on heartbeats
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @returns {object} - Connection health status
 */
function checkUserConnectionHealth(gameCode, username) {
  const game = games[gameCode];
  if (!game || !game.users[username]) {
    return { status: 'unknown', healthy: false };
  }

  const user = game.users[username];
  const now = Date.now();
  const timeSinceHeartbeat = now - (user.lastHeartbeatAt || now);

  // Initialize tracking fields if needed
  if (user.missedHeartbeats === undefined) {
    user.missedHeartbeats = 0;
  }
  if (user.connectionStatus === undefined) {
    user.connectionStatus = 'stable';
  }

  // Check if heartbeat is overdue
  if (timeSinceHeartbeat >= PRESENCE_CONFIG.WEAK_CONNECTION_THRESHOLD) {
    const expectedHeartbeats = Math.floor(timeSinceHeartbeat / 10000); // Heartbeats are every 10s
    user.missedHeartbeats = Math.max(user.missedHeartbeats, expectedHeartbeats);

    if (user.missedHeartbeats >= PRESENCE_CONFIG.MISSED_HEARTBEATS_FOR_WEAK) {
      user.connectionStatus = 'weak';
      return {
        status: 'weak',
        healthy: true, // Still healthy, just weak - don't disconnect yet
        missedHeartbeats: user.missedHeartbeats,
        timeSinceHeartbeat
      };
    }
  }

  // Check for complete timeout (still within grace period though)
  if (timeSinceHeartbeat >= PRESENCE_CONFIG.HEARTBEAT_TIMEOUT) {
    return {
      status: 'timeout',
      healthy: false,
      missedHeartbeats: user.missedHeartbeats,
      timeSinceHeartbeat
    };
  }

  return {
    status: user.connectionStatus || 'stable',
    healthy: true,
    missedHeartbeats: user.missedHeartbeats || 0,
    timeSinceHeartbeat
  };
}

/**
 * Mark user activity (reset idle timer)
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 */
function markUserActivity(gameCode, username) {
  const game = games[gameCode];
  if (!game || !game.users[username]) return;

  const now = Date.now();
  game.users[username].lastActivityAt = now;
  game.users[username].lastHeartbeatAt = now;

  // If user was idle/afk and window is focused, set back to active
  if (game.users[username].isWindowFocused) {
    game.users[username].presenceStatus = 'active';
  }
}

/**
 * Get presence configuration
 * @returns {object} - Presence configuration
 */
function getPresenceConfig() {
  return { ...PRESENCE_CONFIG };
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
 * Get empty rooms (rooms with no active players)
 * A room is considered empty if it has no users, or if all users are marked as disconnected
 * @returns {array} - Array of game codes for empty rooms
 */
function getEmptyRooms() {
  return Object.values(games)
    .filter(game => {
      const users = Object.values(game.users);
      // Room is empty if no users at all
      if (users.length === 0) return true;
      // Room is empty if all users are disconnected (e.g., host in grace period with no other players)
      const activeUsers = users.filter(user => !user.disconnected);
      return activeUsers.length === 0;
    })
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

  // COMPLETELY clear all game data first to prevent stale data from previous games
  // This is critical because playerWords/playerScores may contain entries
  // for players who left the game during previous rounds
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

  game.gameState = 'waiting';
  game.letterGrid = null;
  game.lastActivity = Date.now();
}

/**
 * Add a word to a player's list (both playerWords and playerWordDetails)
 * @param {string} gameCode - Game code
 * @param {string} username - Username
 * @param {string} word - Word to add
 * @param {Object} options - Additional word details
 * @param {boolean} options.autoValidated - Whether word was auto-validated
 * @param {boolean|null} options.validated - Explicit validation status (true/false/null)
 * @param {number} options.score - Score for this word (with combo if applicable)
 * @param {number} options.comboBonus - Combo bonus points earned
 * @param {number} options.comboLevel - Combo level when word was submitted
 */
function addPlayerWord(gameCode, username, word, options = {}) {
  const game = games[gameCode];
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
    });
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
 * Get leaderboard with leading-edge throttling for immediate feedback
 * Uses a leading-edge pattern: broadcasts immediately on first call,
 * then throttles subsequent calls to prevent excessive updates.
 * This ensures players get immediate feedback while preventing broadcast storms.
 *
 * @param {string} gameCode - Game code
 * @param {function} broadcastFn - Function to call with leaderboard data
 * @param {number} throttleMs - Throttle duration in milliseconds (default 500ms)
 */
const leaderboardLastBroadcast = {};
const leaderboardPendingUpdate = {};

function getLeaderboardThrottled(gameCode, broadcastFn, throttleMs = 500) {
  const game = games[gameCode];
  if (!game) return;

  const now = Date.now();
  const lastBroadcast = leaderboardLastBroadcast[gameCode] || 0;
  const timeSinceLastBroadcast = now - lastBroadcast;

  // If enough time has passed since last broadcast, send immediately (leading edge)
  if (timeSinceLastBroadcast >= throttleMs) {
    const leaderboard = getLeaderboard(gameCode);
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
          const leaderboard = getLeaderboard(gameCode);
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
 * Cleanup stale games (older than maxAge)
 * @param {number} maxAge - Maximum age in milliseconds (default 30 minutes)
 * NOTE: Reduced from 2 hours to 30 minutes to prevent memory leaks from abandoned games
 */
function cleanupStaleGames(maxAge = 30 * 60 * 1000) {
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

  // Presence tracking
  updateUserPresence,
  updateUserHeartbeat,
  markUserActivity,
  getPresenceConfig,
  checkUserConnectionHealth,

  // Auth user tracking
  getAuthUserConnection,
  setAuthUserConnection,
  removeAuthUserConnection,
  clearSocketMappings,

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
