/**
 * Health and Metrics Routes
 * Endpoints for monitoring, health checks, and metrics
 */

import type { Application, Request, Response } from 'express';
import type { Server } from 'socket.io';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

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

  // Simple liveness — just confirms the process is running
  app.get('/health/live', (_req: Request, res: Response): void => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  // Readiness — checks all dependencies
  app.get('/health/ready', async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check Redis
    try {
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
      const redis = new Redis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
      const start = Date.now();
      await redis.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - start };
      await redis.quit();
    } catch (err) {
      checks.redis = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      overall = 'degraded';
    }

    // Check Supabase
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const start = Date.now();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        checks.supabase = { status: 'ok', latencyMs: Date.now() - start };
      } else {
        checks.supabase = { status: 'skipped', error: 'Missing env vars' };
      }
    } catch (err) {
      checks.supabase = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      overall = 'degraded';
    }

    // Dictionary loaded check
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dictionary = require('../backend/dictionary');
      const loaded = typeof dictionary.isLoaded === 'function' ? dictionary.isLoaded() : true;
      checks.dictionary = { status: loaded ? 'ok' : 'not_loaded' };
      if (!loaded) overall = 'degraded';
    } catch {
      checks.dictionary = { status: 'unknown' };
    }

    const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503;
    res.status(statusCode).json({
      status: overall,
      checks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      timestamp: new Date().toISOString(),
    });
  });

  // Basic health check (backward compatibility)
  app.get('/health', (_req: Request, res: Response): void => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
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
