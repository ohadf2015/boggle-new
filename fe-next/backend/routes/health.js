/**
 * Health Check Routes
 * Handles /health and /metrics endpoints
 */

const express = require('express');
const router = express.Router();
const { isRedisAvailable, getRedisMetrics } = require('../redisClient');
const { getAllGames } = require('../modules/gameStateManager');
const { getMetrics, getRoomMetrics, resetAll } = require('../utils/metrics');

/**
 * GET /health
 * Basic health check - responds immediately, doesn't depend on Redis/DB
 */
router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

/**
 * GET /health/scaling
 * Scaling readiness endpoint - shows whether horizontal scaling is enabled
 */
router.get('/scaling', (req, res) => {
  const io = req.app.get('io');
  const games = getAllGames();
  const hasRedisAdapter = io ? !!io.pubClient : false;
  const redisAvailable = isRedisAvailable();

  res.json({
    status: 'ok',
    scaling: {
      horizontalReady: hasRedisAdapter && redisAvailable,
      redisAdapter: hasRedisAdapter,
      redisAvailable: redisAvailable,
      instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local'
    },
    stats: {
      activeGames: games.length,
      totalPlayers: games.reduce((sum, g) => sum + g.playerCount, 0),
      socketConnections: io ? io.sockets.sockets.size : 0
    },
    timestamp: Date.now()
  });
});

/**
 * GET /metrics
 * Get application metrics
 */
router.get('/', (_req, res) => {
  res.json(getMetrics());
});

/**
 * GET /metrics/rooms
 * Get room-specific metrics
 */
router.get('/rooms', (_req, res) => {
  res.json(getRoomMetrics());
});

/**
 * GET /metrics/reset
 * Reset all metrics
 */
router.get('/reset', (_req, res) => {
  resetAll();
  res.json({ ok: true });
});

/**
 * GET /metrics/redis
 * Get Redis metrics
 */
router.get('/redis', async (_req, res) => {
  try {
    const metrics = await getRedisMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
