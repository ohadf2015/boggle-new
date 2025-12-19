/**
 * Presence Handler
 * Handles presence updates, heartbeats, and connection health
 */

const {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  updateUserPresence,
  updateUserHeartbeat
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom } = require('../utils/socketHelpers');
const logger = require('../utils/logger');
const { validatePayload, presenceUpdateSchema, heartbeatSchema } = require('../utils/socketValidation');

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
    // Validate payload using standard schema
    const validation = validatePayload(presenceUpdateSchema, data);
    if (!validation.success) {
      logger.debug('PRESENCE', `Invalid presenceUpdate payload: ${validation.error}`);
      return;
    }

    const { status } = validation.data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

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
    updateUserHeartbeat(gameCode, username);
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
    const { forEachGame } = require('../modules/gameStateManager');

    forEachGame((gameCode, game) => {
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
    });
  }, HEALTH_CHECK_INTERVAL);
}

module.exports = { registerPresenceHandlers, startConnectionHealthCheck };
