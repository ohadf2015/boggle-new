/**
 * Server Lifecycle Management
 * Handles startup initialization and graceful shutdown
 */

const dictionary = require('../backend/dictionary');
const { restoreTournamentsFromRedis } = require('../backend/modules/tournamentManager');
const { pool: wordValidatorPool } = require('../backend/modules/wordValidatorPool');
const { setEventLoopLag } = require('../backend/utils/metrics');
const { setupRedisAdapter, cleanupRedisAdapter } = require('./redisAdapter');
const { clearCleanupTimers } = require('./socketSetup');

/**
 * Initialize all server components
 * @param {Server} io - Socket.IO server instance
 */
async function initializeServer(io) {
  // Set up Redis adapter for horizontal scaling
  await setupRedisAdapter(io);

  // Restore tournaments from Redis
  try {
    await restoreTournamentsFromRedis();
  } catch (error) {
    console.error('Failed to restore tournaments:', error);
  }

  // Load dictionaries
  try {
    await dictionary.load();
  } catch (error) {
    console.error('Failed to load dictionaries:', error);
  }

  // Warm up worker pool
  try {
    await wordValidatorPool.initialize();
    console.log('[WORKER POOL] Worker pool warmed up');
  } catch (error) {
    console.warn('[WORKER POOL] Failed to warm up:', error.message);
  }
}

/**
 * Set up event loop lag monitoring
 */
function setupEventLoopMonitoring() {
  let last = Date.now();
  const interval = parseInt(process.env.EVENT_LOOP_MONITOR_INTERVAL_MS || '1000');

  setInterval(() => {
    const now = Date.now();
    const drift = now - last - interval;
    last = now;
    setEventLoopLag(Math.max(0, drift));
  }, interval).unref();
}

/**
 * Create graceful shutdown handler
 * @param {http.Server} httpServer - HTTP server instance
 * @param {Server} io - Socket.IO server instance
 * @returns {Function} Shutdown handler function
 */
function createShutdownHandler(httpServer, io) {
  let isShuttingDown = false;

  return async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('[SHUTDOWN] Starting graceful shutdown...');

    // Clear all cleanup timers
    clearCleanupTimers();

    // Stop accepting new connections
    httpServer.close(() => console.log('[SHUTDOWN] HTTP server closed'));

    // Notify clients
    io.emit('serverShutdown', { reconnectIn: 5000, message: 'Server is restarting' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Shutdown worker pool
    try {
      await wordValidatorPool.shutdown();
      console.log('[SHUTDOWN] Worker pool closed');
    } catch (err) {
      console.error('[SHUTDOWN] Error closing worker pool:', err.message);
    }

    // Close socket connections
    io.close(() => console.log('[SHUTDOWN] Socket.IO server closed'));

    // Clean up Redis adapter clients
    await cleanupRedisAdapter(io);

    // Force exit after timeout
    setTimeout(() => {
      console.log('[SHUTDOWN] Forcing exit after timeout');
      process.exit(0);
    }, 10000);

    console.log('[SHUTDOWN] Server shutdown complete');
    process.exit(0);
  };
}

/**
 * Register shutdown signal handlers
 * @param {Function} shutdownHandler - Shutdown handler function
 */
function registerShutdownHandlers(shutdownHandler) {
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
}

module.exports = {
  initializeServer,
  setupEventLoopMonitoring,
  createShutdownHandler,
  registerShutdownHandlers,
};
