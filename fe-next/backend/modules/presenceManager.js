/**
 * Presence Manager Module
 * Handles user presence tracking, heartbeat, and connection health
 * Extracted from gameStateManager.js for better modularity
 */

// Presence tracking configuration
const PRESENCE_CONFIG = {
  IDLE_THRESHOLD: 30000,     // 30 seconds without activity = idle
  AFK_THRESHOLD: 45000,      // 45 seconds without activity = afk (for testing, change to 120000 for production)
  HEARTBEAT_TIMEOUT: 30000,  // 30 seconds without heartbeat = disconnected (increased for poor connections)
  WEAK_CONNECTION_THRESHOLD: 15000, // 15 seconds without heartbeat = weak connection warning
  MISSED_HEARTBEATS_FOR_WEAK: 2,    // Number of consecutive missed heartbeats before weak connection
};

/**
 * Update user presence status
 * @param {object} game - Game object
 * @param {string} username - Username
 * @param {object} presenceData - { isWindowFocused, lastActivityAt, forceIdle }
 * @returns {string|null} - New presence status or null if user not found
 */
function updateUserPresence(game, username, presenceData) {
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
 * @param {object} game - Game object
 * @param {string} username - Username
 * @returns {object|null} - Connection status change info or null
 */
function updateUserHeartbeat(game, username) {
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
 * @param {object} game - Game object
 * @param {string} username - Username
 * @returns {object} - Connection health status
 */
function checkUserConnectionHealth(game, username) {
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
 * @param {object} game - Game object
 * @param {string} username - Username
 */
function markUserActivity(game, username) {
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
 * Get all users with their presence status
 * @param {object} game - Game object
 * @returns {array} - Array of users with presence info
 */
function getUsersWithPresence(game) {
  if (!game) return [];

  return Object.entries(game.users).map(([username, user]) => ({
    username,
    presenceStatus: user.presenceStatus || 'active',
    isWindowFocused: user.isWindowFocused !== false,
    lastActivityAt: user.lastActivityAt,
    lastHeartbeatAt: user.lastHeartbeatAt,
    connectionStatus: user.connectionStatus || 'stable',
  }));
}

/**
 * Check if user is considered disconnected based on heartbeat
 * @param {object} game - Game object
 * @param {string} username - Username
 * @returns {boolean}
 */
function isUserDisconnected(game, username) {
  if (!game || !game.users[username]) return true;

  const user = game.users[username];
  if (user.disconnected) return true;

  const health = checkUserConnectionHealth(game, username);
  return !health.healthy;
}

module.exports = {
  // Presence tracking
  updateUserPresence,
  updateUserHeartbeat,
  checkUserConnectionHealth,
  markUserActivity,
  getPresenceConfig,
  getUsersWithPresence,
  isUserDisconnected,

  // Export config for reference
  PRESENCE_CONFIG,
};
