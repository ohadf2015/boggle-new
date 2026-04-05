/**
 * System health endpoint for admin dashboard.
 * Reports Redis, database, and process status.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { successResponse, errorResponse } from './responseHelpers';
import { getRedisClient, isRedisAvailable, getRedisMetrics } from '../../redis/connection';
import logger from '../../utils/logger';

import { getSupabase } from '../../modules/supabaseServer';

const router: Router = express.Router();

export interface SystemHealthResult {
  redis: 'ok' | 'down';
  database: 'ok' | 'down';
  process: { heapMB: number; uptimeSeconds: number };
}

/**
 * Check all subsystems and return health status.
 * Exported for testing.
 */
export async function checkSystemHealth(): Promise<SystemHealthResult> {
  const redis = getRedisClient();
  const supabase = getSupabase();

  const [redisResult, dbResult] = await Promise.allSettled([
    redis ? redis.ping() : Promise.reject(new Error('no client')),
    supabase ? supabase.from('profiles').select('id', { count: 'exact', head: true }) : Promise.reject(new Error('no client')),
  ]);

  const redisOk = redisResult.status === 'fulfilled';
  const dbOk = dbResult.status === 'fulfilled' && !(dbResult.value as { error?: unknown }).error;

  return {
    redis: redisOk ? 'ok' : 'down',
    database: dbOk ? 'ok' : 'down',
    process: {
      heapMB: Math.round(process.memoryUsage().heapUsed / 1e6),
      uptimeSeconds: Math.round(process.uptime()),
    },
  };
}

/**
 * GET /api/admin/system/health
 */
router.get('/system/health', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const health = await checkSystemHealth();
    const allOk = health.redis === 'ok' && health.database === 'ok';
    res.status(allOk ? 200 : 503).json(successResponse(health));
  } catch (err) {
    logger.error('ADMIN_API', `Health check error: ${(err as Error).message}`);
    res.status(500).json(errorResponse('HEALTH_CHECK_FAILED', (err as Error).message));
  }
});

/**
 * GET /api/admin/system/redis
 */
router.get('/system/redis', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const metrics = await getRedisMetrics();
    res.json(successResponse(metrics));
  } catch (err) {
    res.status(500).json(errorResponse('REDIS_METRICS_FAILED', (err as Error).message));
  }
});

export default router;
