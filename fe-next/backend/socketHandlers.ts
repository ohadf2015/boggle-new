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

import type { Server, Socket } from 'socket.io';

const {
  registerAllHandlers,
  startConnectionHealthCheck,
  MAX_PLAYERS_PER_ROOM
} = require('./handlers');

const { loadCommunityWords } = require('./modules/communityWordManager');
const { cleanupEmptyRooms } = require('./modules/gameStateManager');
const { initRateLimit, resetRateLimit, isIpBlocked, isIpBlockedAsync, RateLimiter } = require('./utils/rateLimiter');
const logger = require('./utils/logger');

/**
 * Initialize socket handlers for the Socket.IO server
 * @param io - Socket.IO server instance
 */
function initializeSocketHandlers(io: Server): void {
  // Load community words on startup
  loadCommunityWords()
    .then(() => logger.info('STARTUP', 'Community words loaded'))
    .catch((err: Error) => logger.warn('STARTUP', `Failed to load community words: ${err.message}`));

  // Start connection health check
  startConnectionHealthCheck(io);

  // Set up periodic cleanup of empty rooms
  setInterval(() => {
    try {
      cleanupEmptyRooms();
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('CLEANUP', `Error cleaning up empty rooms: ${error.message}`);
    }
  }, 30 * 60 * 1000); // Every 30 minutes

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    const clientIp: string = RateLimiter.getClientIp(socket);

    // Quick check: local in-memory IP block (instant)
    if (isIpBlocked(clientIp)) {
      logger.warn('SOCKET', `Blocked IP ${clientIp} attempted connection - rejecting`);
      socket.emit('error', { message: 'Too many requests. Please try again later.' });
      socket.disconnect(true);
      return;
    }

    // Initialize rate limiting for this socket with IP tracking
    initRateLimit(socket);

    // Async check: Redis distributed IP block (catches blocks from other instances)
    // This runs after connection is established but before handlers are registered
    isIpBlockedAsync(clientIp)
      .then((blocked: boolean) => {
        if (blocked) {
          logger.warn('SOCKET', `Redis-blocked IP ${clientIp} detected - disconnecting`);
          socket.emit('error', { message: 'Too many requests. Please try again later.' });
          socket.disconnect(true);
          return;
        }

        logger.info('SOCKET', `New connection: ${socket.id} from IP: ${clientIp}`);

        // Join lobby room so client receives activeRooms broadcasts
        socket.join('lobby:rooms');

        // Register all event handlers for this socket
        registerAllHandlers(io, socket);
      })
      .catch((err: Error) => {
        // On Redis error, allow connection (fail open)
        logger.warn('SOCKET', `Redis check failed for ${clientIp}: ${err.message} - allowing connection`);
        logger.info('SOCKET', `New connection: ${socket.id} from IP: ${clientIp}`);
        socket.join('lobby:rooms');
        registerAllHandlers(io, socket);
      });

    // Clean up rate limiting on disconnect
    socket.on('disconnect', () => {
      resetRateLimit(socket.id);
    });
  });

  logger.info('SOCKET', 'Socket handlers initialized');
}

// Named exports for TypeScript compatibility
export { initializeSocketHandlers };
export { MAX_PLAYERS_PER_ROOM };

// CommonJS exports for backward compatibility
module.exports = {
  initializeSocketHandlers,
  MAX_PLAYERS_PER_ROOM,
  handlers: require('./handlers'),
};
