/**
 * Presence Handler
 * Handles presence updates, heartbeats, and connection health
 */

const {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updateUserPresence,
  recordUserHeartbeat
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom } = require('../utils/socketHelpers');
const logger = require('../utils/logger');

/**
 * Register presence-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerPresenceHandlers(io, socket) {

  // Handle ping (simple connection check)
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle presence update (active/idle/afk status)
  socket.on('presenceUpdate', (data) => {
    const { status } = data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Validate status
    const validStatuses = ['active', 'idle', 'afk'];
    if (!validStatuses.includes(status)) return;

    // Update user presence
    updateUserPresence(gameCode, username, status);

    // Broadcast to room
    broadcastToRoom(io, getGameRoom(gameCode), 'userPresenceChanged', {
      username,
      status,
      timestamp: Date.now()
    });

    logger.debug('PRESENCE', `${username} in game ${gameCode} is now ${status}`);
  });

  // Handle presence heartbeat
  socket.on('presenceHeartbeat', () => {
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    // Record heartbeat
    recordUserHeartbeat(gameCode, username);
  });
}

/**
 * Start connection health check interval
 * Checks for stale connections and cleans them up
 * @param {Server} io - Socket.IO server instance
 */
function startConnectionHealthCheck(io) {
  const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  const STALE_THRESHOLD = 60000; // 1 minute without heartbeat

  setInterval(() => {
    const { games } = require('../modules/gameStateManager');

    for (const [gameCode, game] of Object.entries(games)) {
      for (const [username, userData] of Object.entries(game.users || {})) {
        // Skip if user is already marked disconnected
        if (userData.disconnected) continue;

        // Skip bots
        if (userData.isBot) continue;

        const lastHeartbeat = userData.lastHeartbeat || userData.lastActivity || 0;
        const now = Date.now();

        if (now - lastHeartbeat > STALE_THRESHOLD) {
          // Mark user as potentially stale
          logger.debug('PRESENCE', `User ${username} in game ${gameCode} may be stale (${Math.round((now - lastHeartbeat) / 1000)}s since last heartbeat)`);
        }
      }
    }
  }, HEALTH_CHECK_INTERVAL);
}

module.exports = { registerPresenceHandlers, startConnectionHealthCheck };
