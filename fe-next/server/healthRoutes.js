/**
 * Health and Metrics Routes
 * Endpoints for monitoring, health checks, and metrics
 */

const { isRedisAvailable, getRedisMetrics } = require('../backend/redisClient');
const { getAllGames } = require('../backend/modules/gameStateManager');
const { getMetrics, getRoomMetrics, resetAll } = require('../backend/utils/metrics');

/**
 * Configure health and metrics routes
 * @param {Express} app - Express application instance
 * @param {Server} io - Socket.IO server instance
 */
function configureHealthRoutes(app, io) {
  // Basic health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  // Detailed health check for scaling/load balancer
  app.get('/health/scaling', (_req, res) => {
    const games = getAllGames();
    res.json({
      status: 'ok',
      scaling: {
        horizontalReady: !!io.pubClient && isRedisAvailable(),
        redisAdapter: !!io.pubClient,
        redisAvailable: isRedisAvailable(),
        instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local'
      },
      stats: {
        activeGames: games.length,
        totalPlayers: games.reduce((sum, g) => sum + g.playerCount, 0),
        socketConnections: io.sockets.sockets.size
      },
      timestamp: Date.now()
    });
  });

  // Metrics endpoints
  app.get('/metrics', (_req, res) => res.json(getMetrics()));
  app.get('/metrics/rooms', (_req, res) => res.json(getRoomMetrics()));
  app.get('/metrics/reset', (_req, res) => {
    resetAll();
    res.json({ ok: true });
  });
  app.get('/metrics/redis', async (_req, res) => {
    try {
      res.json(await getRedisMetrics());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  configureHealthRoutes,
};
