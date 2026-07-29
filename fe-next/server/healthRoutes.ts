/**
 * Health and Metrics Routes
 * Endpoints for monitoring, health checks, and metrics
 */

import v8 from 'v8';
import type { Application, Request, Response } from 'express';
import type { Server } from 'socket.io';
import { computeScalingPressure } from './scalingPressure';
import { isRedisAvailable, getRedisMetrics, getRedisClient } from '../backend/redisClient';
import { circuitBreaker } from '../backend/redis/circuitBreaker';
import { checkPoolHealth } from '../backend/db/supabasePool';
import { getAllGames, getGameCount } from '../backend/modules/gameStateManager';
import { getSocketMapSizes } from '../backend/modules/userManager';
import { getBotManagerStats } from '../backend/modules/botManager';
import { getMetrics, getRoomMetrics, resetAll } from '../backend/utils/metrics';
import { getConnectionMetrics } from '../backend/modules/supabase/client';
import * as dictionary from '../backend/dictionary';

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

    const HEALTH_CHECK_TIMEOUT_MS = 5000;

    /** Race a promise against a timeout */
    function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`)), HEALTH_CHECK_TIMEOUT_MS)
        ),
      ]);
    }

    // Check Redis (reuse existing client — no per-request connection)
    try {
      const redis = getRedisClient();
      if (redis) {
        const start = Date.now();
        await withTimeout(redis.ping(), 'Redis');
        const cbState = circuitBreaker.getState();
        checks.redis = {
          status: cbState.state === 'OPEN' ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          ...(cbState.state !== 'CLOSED' && { circuitBreaker: cbState.state, failures: cbState.failureCount }),
        } as any;
      } else {
        checks.redis = { status: 'skipped', error: 'No Redis client available' };
      }
    } catch (err) {
      checks.redis = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      overall = 'degraded';
    }

    // Check Supabase (pooled connection)
    try {
      const poolResult = await withTimeout(checkPoolHealth(), 'Supabase');
      checks.supabase = poolResult.ok
        ? { status: 'ok', latencyMs: poolResult.latencyMs }
        : { status: 'error', latencyMs: poolResult.latencyMs, error: poolResult.error };
      if (!poolResult.ok) overall = 'degraded';
    } catch (err) {
      checks.supabase = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      overall = 'degraded';
    }

    // Dictionary loaded check — getMemoryStats returns empty array if no dictionaries loaded
    try {
      const stats = dictionary.getMemoryStats();
      const loaded = stats.length > 0;
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

  // Detailed health check for scaling/load balancer with capacity metrics.
  // The `readyForMore` boolean is designed for autoscalers — true means this
  // replica can accept more traffic without degrading game experience.
  app.get('/health/scaling', (_req: Request, res: Response): void => {
    const games: GameInfo[] = getAllGames();
    const socketConnections = io.sockets.sockets.size;
    const maxConnections = parseInt(process.env.MAX_SOCKET_CONNECTIONS || '500', 10);
    const socketMaps = getSocketMapSizes();
    const botStats = getBotManagerStats();
    const memUsage = process.memoryUsage();
    const metrics = getMetrics();
    const supabaseMetrics = getConnectionMetrics();

    // Compute pressure signals for autoscaler. heapUtilization is measured against
    // the V8 heap *limit* (--max-old-space-size), NOT heapTotal — see scalingPressure.ts.
    const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;
    const eventLoopLagMs = metrics.eventLoopLagMs;
    const supabaseQueueDepth = supabaseMetrics.queueLength;

    // readyForMore: true when this replica has headroom across all dimensions.
    // Autoscalers can scale up when ALL replicas report readyForMore=false.
    const { connectionUtilization, heapUtilization, readyForMore } = computeScalingPressure({
      socketConnections,
      maxConnections,
      heapUsedBytes: memUsage.heapUsed,
      heapLimitBytes,
      eventLoopLagMs,
      supabaseQueueDepth,
    });

    res.json({
      status: 'ok',
      readyForMore,
      scaling: {
        horizontalReady: !!extendedIo.pubClient && isRedisAvailable(),
        redisAdapter: !!extendedIo.pubClient,
        redisAvailable: isRedisAvailable(),
        clusterEnabled: process.env.CLUSTER_ENABLED === 'true',
        instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local',
        workerId: process.pid,
      },
      capacity: {
        socketConnections,
        maxConnections,
        utilizationPercent: Math.round(connectionUtilization * 100),
        activeGames: getGameCount(),
        totalPlayers: games.reduce((sum: number, g: GameInfo) => sum + g.playerCount, 0),
      },
      pressure: {
        eventLoopLagMs: Math.round(eventLoopLagMs),
        heapUtilizationPercent: Math.round(heapUtilization * 100),
        connectionUtilizationPercent: Math.round(connectionUtilization * 100),
        supabase: {
          activeRequests: supabaseMetrics.activeRequests,
          queueDepth: supabaseQueueDepth,
          maxConcurrent: supabaseMetrics.maxConcurrent,
        },
      },
      internals: {
        socketMaps,
        bots: {
          activeGames: botStats.activeGames,
          activeBots: botStats.activeBots,
          activeTimers: botStats.activeTimers,
        },
      },
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        // heapLimitMB is the real OOM ceiling (--max-old-space-size). Compare
        // heapUsedMB against THIS, not heapTotalMB, to judge OOM proximity.
        heapLimitMB: Math.round(heapLimitBytes / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
    });
  });

  // Metrics endpoints
  app.get('/metrics', (_req: Request, res: Response): void => {
    res.json(getMetrics());
  });

  app.get('/metrics/rooms', (_req: Request, res: Response): void => {
    res.json(getRoomMetrics());
  });

  app.post('/metrics/reset', (req: Request, res: Response): void => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_API_KEY;
    if (!expectedKey || !adminKey || adminKey !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
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
