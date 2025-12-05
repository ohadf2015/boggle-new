/**
 * Socket.IO Event Handlers
 * Entry point for all real-time game events using Socket.IO
 *
 * This module has been refactored into smaller, focused handlers:
 * - handlers/gameHandler.js - Game lifecycle (create, join, start, end, reset)
 * - handlers/wordHandler.js - Word submission and validation
 * - handlers/chatHandler.js - Chat messages
 * - handlers/botHandler.js - Bot management
 * - handlers/tournamentHandler.js - Tournament operations
 * - handlers/presenceHandler.js - User presence tracking
 * - handlers/hostHandler.js - Host-specific operations
 * - handlers/connectionHandler.js - Disconnect handling
 * - handlers/shared.js - Shared utilities (timer, endGame, etc.)
 */

const {
  registerAllHandlers,
  startConnectionHealthCheck,
  MAX_PLAYERS_PER_ROOM
} = require('./handlers');

const { loadCommunityWords } = require('./modules/communityWordManager');
const { cleanupEmptyRooms } = require('./modules/gameStateManager');
const logger = require('./utils/logger');

/**
 * Initialize socket handlers for the Socket.IO server
 * @param {Server} io - Socket.IO server instance
 */
function initializeSocketHandlers(io) {
  // Load community words on startup
  loadCommunityWords()
    .then(() => logger.info('STARTUP', 'Community words loaded'))
    .catch(err => logger.warn('STARTUP', `Failed to load community words: ${err.message}`));

  // Start connection health check
  startConnectionHealthCheck(io);

  // Set up periodic cleanup of empty rooms
  setInterval(() => {
    try {
      cleanupEmptyRooms();
    } catch (err) {
      logger.error('CLEANUP', `Error cleaning up empty rooms: ${err.message}`);
    }
  }, 30 * 60 * 1000); // Every 30 minutes

  // Handle new connections
  io.on('connection', (socket) => {
    logger.info('SOCKET', `New connection: ${socket.id}`);

    // Register all event handlers for this socket
    registerAllHandlers(io, socket);
  });

  logger.info('SOCKET', 'Socket handlers initialized');
}

// Re-export key functions and constants for backwards compatibility
module.exports = {
  initializeSocketHandlers,
  MAX_PLAYERS_PER_ROOM
};

// Also export individual handlers for testing and advanced usage
module.exports.handlers = require('./handlers');
