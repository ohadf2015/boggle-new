/**
 * Health and Metrics Routes
 * Endpoints for monitoring, health checks, and metrics
 */

import type { Application, Request, Response } from 'express';
import type { Server } from 'socket.io';

import { isRedisAvailable, getRedisMetrics } from '../backend/redisClient';
import { getAllGames } from '../backend/modules/gameStateManager';
import { getMetrics, getRoomMetrics, resetAll } from '../backend/utils/metrics';

import type { ExtendedSocketServer } from './redisAdapter';

/**
 * Game info returned from getAllGames
 */
interface GameInfo {
  playerCount: number;
}

/**
 * Configure health and metrics routes
 * @param app - Express application instance
 * @param io - Socket.IO server instance
 */
export function configureHealthRoutes(app: Application, io: Server): void {
  const extendedIo = io as ExtendedSocketServer;

  // Basic health check
  app.get('/health', (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  // Detailed health check for scaling/load balancer
  app.get('/health/scaling', (_req: Request, res: Response): void => {
    const games: GameInfo[] = getAllGames();
    res.json({
      status: 'ok',
      scaling: {
        horizontalReady: !!extendedIo.pubClient && isRedisAvailable(),
        redisAdapter: !!extendedIo.pubClient,
        redisAvailable: isRedisAvailable(),
        instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local'
      },
      stats: {
        activeGames: games.length,
        totalPlayers: games.reduce((sum: number, g: GameInfo) => sum + g.playerCount, 0),
        socketConnections: io.sockets.sockets.size
      },
      timestamp: Date.now()
    });
  });

  // Metrics endpoints
  app.get('/metrics', (_req: Request, res: Response): void => {
    res.json(getMetrics());
  });

  app.get('/metrics/rooms', (_req: Request, res: Response): void => {
    res.json(getRoomMetrics());
  });

  app.get('/metrics/reset', (_req: Request, res: Response): void => {
    resetAll();
    res.json({ ok: true });
  });

  app.get('/metrics/redis', async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json(await getRedisMetrics());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });
}
