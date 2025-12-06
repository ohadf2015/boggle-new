/**
 * Socket.IO Configuration and Monitoring
 * Handles Socket.IO server setup, connection monitoring, and cleanup timers
 */

const { Server } = require('socket.io');
const { initializeSocketHandlers } = require('../backend/socketHandlers');
const { cleanupStaleGames, cleanupEmptyRooms, getActiveRooms } = require('../backend/modules/gameStateManager');

// Track cleanup timers for graceful shutdown
const cleanupTimers = new Set();

/**
 * Create and configure Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @param {string} corsOrigin - CORS origin setting
 * @returns {Server} Socket.IO server instance
 */
function createSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin === '*' ? true : corsOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Performance optimizations
    perMessageDeflate: {
      threshold: 1024,
      zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
      zlibInflateOptions: { chunkSize: 10 * 1024 }
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 100 * 1024,
    transports: ['websocket', 'polling'],
    allowUpgrades: true
  });

  // Initialize event handlers
  initializeSocketHandlers(io);

  return io;
}

/**
 * Set up Socket.IO connection monitoring
 * @param {Server} io - Socket.IO server instance
 */
function setupConnectionMonitoring(io) {
  // Log connection errors
  io.engine.on('connection_error', (err) => {
    console.error('[SOCKET.IO] Connection error:', err.req?.url, err.code, err.message);
  });

  // Log connection stats periodically
  const statsTimer = setInterval(() => {
    const socketCount = io.sockets.sockets.size;
    if (socketCount > 0) {
      console.log(`[SOCKET.IO] Active connections: ${socketCount}`);
    }
  }, 60000);
  cleanupTimers.add(statsTimer);
}

/**
 * Set up game cleanup timers
 * @param {Server} io - Socket.IO server instance
 */
function setupCleanupTimers(io) {
  // Cleanup stale games every 5 minutes
  const staleGamesTimer = setInterval(() => {
    const cleaned = cleanupStaleGames();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} stale games`);
    }
  }, 5 * 60 * 1000);
  cleanupTimers.add(staleGamesTimer);

  // Cleanup empty rooms every 30 seconds
  const emptyRoomsTimer = setInterval(() => {
    const cleaned = cleanupEmptyRooms();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} empty room(s)`);
      io.emit('activeRooms', { rooms: getActiveRooms() });
    }
  }, 30 * 1000);
  cleanupTimers.add(emptyRoomsTimer);
}

/**
 * Clear all cleanup timers (for graceful shutdown)
 */
function clearCleanupTimers() {
  console.log(`[SHUTDOWN] Clearing ${cleanupTimers.size} cleanup timers...`);
  for (const timer of cleanupTimers) {
    clearInterval(timer);
  }
  cleanupTimers.clear();
}

/**
 * Get the set of cleanup timers (for external management)
 * @returns {Set} Set of timer IDs
 */
function getCleanupTimers() {
  return cleanupTimers;
}

module.exports = {
  createSocketServer,
  setupConnectionMonitoring,
  setupCleanupTimers,
  clearCleanupTimers,
  getCleanupTimers,
};
