/**
 * Health Check Routes
 * Handles /health and /metrics endpoints
 */

import express, { Request, Response, Router } from 'express';
 
const { isRedisAvailable, getRedisMetrics } = require('../redisClient');
 
const { getAllGames } = require('../modules/gameStateManager');
 
const { getMetrics, getRoomMetrics, resetAll } = require('../utils/metrics');

const router: Router = express.Router();

interface HealthResponse {
  status: string;
  timestamp: number;
}

interface ScalingInfo {
  horizontalReady: boolean;
  redisAdapter: boolean;
  redisAvailable: boolean;
  instanceId: string;
}

interface ScalingStats {
  activeGames: number;
  totalPlayers: number;
  socketConnections: number;
}

interface ScalingResponse {
  status: string;
  scaling: ScalingInfo;
  stats: ScalingStats;
  timestamp: number;
}

interface SocketIO {
  pubClient?: unknown;
  sockets: {
    sockets: Map<string, unknown>;
  };
}

/**
 * GET /health
 * Basic health check - responds immediately, doesn't depend on Redis/DB
 */
router.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() } as HealthResponse);
});

/**
 * GET /health/scaling
 * Scaling readiness endpoint - shows whether horizontal scaling is enabled
 */
router.get('/scaling', (req: Request, res: Response): void => {
  const io = req.app.get('io') as SocketIO | undefined;
  const games = getAllGames();
  const hasRedisAdapter = io ? !!io.pubClient : false;
  const redisAvailable = isRedisAvailable();

  const response: ScalingResponse = {
    status: 'ok',
    scaling: {
      horizontalReady: hasRedisAdapter && redisAvailable,
      redisAdapter: hasRedisAdapter,
      redisAvailable: redisAvailable,
      instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local'
    },
    stats: {
      activeGames: games.length,
      totalPlayers: games.reduce((sum: number, g: { playerCount: number }) => sum + g.playerCount, 0),
      socketConnections: io ? io.sockets.sockets.size : 0
    },
    timestamp: Date.now()
  };

  res.json(response);
});

/**
 * GET /metrics
 * Get application metrics
 */
router.get('/', (_req: Request, res: Response): void => {
  res.json(getMetrics());
});

/**
 * GET /metrics/rooms
 * Get room-specific metrics
 */
router.get('/rooms', (_req: Request, res: Response): void => {
  res.json(getRoomMetrics());
});

/**
 * GET /metrics/reset
 * Reset all metrics
 */
router.get('/reset', (_req: Request, res: Response): void => {
  resetAll();
  res.json({ ok: true });
});

/**
 * GET /metrics/redis
 * Get Redis metrics
 */
router.get('/redis', async (_req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await getRedisMetrics();
    res.json(metrics);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;
