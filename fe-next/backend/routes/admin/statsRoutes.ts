/**
 * Admin Stats Routes
 * Dashboard statistics and overview metrics.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { successResponse, errorResponse } from './responseHelpers';
import { withCache } from './adminCache';
import { fetchDashboardStats } from './statsService';
import logger from '../../utils/logger';
import * as dictionary from '../../dictionary';
import { getCacheStats as getBotCacheStats, clearBehaviorCaches } from '../../../backend/modules/botBehavior';
import { getPoolStats } from '../../../backend/modules/wordValidatorPool';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

/**
 * GET /api/admin/stats
 * Dashboard statistics — optimized with RPC + Redis cache.
 * Was: 14 sequential queries. Now: 3 parallel RPCs, cached 60s.
 */
router.get('/stats', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const stats = await withCache('admin:stats:overview', 60, () =>
      fetchDashboardStats(getSupabase())
    );
    res.json(successResponse(stats));
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Stats error: ${err.message}`);
    res.status(500).json(errorResponse('STATS_FETCH_FAILED', err.message));
  }
});

/**
 * GET /api/admin/stats/memory
 * Get memory usage statistics for monitoring and optimization
 */
router.get('/stats/memory', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    // Get Node.js process memory usage
    const processMemory = process.memoryUsage();

    // Get dictionary memory stats
    const dictionaryStats = dictionary.getMemoryStats();
    const dictionaryTotalBytes = dictionary.getTotalMemoryUsage();

    // Get bot cache stats
    const botCacheStats = getBotCacheStats();

    // Get worker pool stats
    const workerPoolStats = getPoolStats();

    const response = {
      process: {
        heapUsed: processMemory.heapUsed,
        heapTotal: processMemory.heapTotal,
        external: processMemory.external,
        rss: processMemory.rss,
        heapUsedMB: Math.round(processMemory.heapUsed / 1024 / 1024 * 10) / 10,
        heapTotalMB: Math.round(processMemory.heapTotal / 1024 / 1024 * 10) / 10,
        rssMB: Math.round(processMemory.rss / 1024 / 1024 * 10) / 10,
      },
      dictionaries: {
        stats: dictionaryStats,
        totalBytes: dictionaryTotalBytes,
        totalMB: Math.round(dictionaryTotalBytes / 1024 / 1024 * 100) / 100,
      },
      botCaches: {
        ...botCacheStats,
        estimatedMB: Math.round(botCacheStats.estimatedMemoryBytes / 1024 / 1024 * 100) / 100,
      },
      workerPool: workerPoolStats,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Memory stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch memory stats' });
  }
});

/**
 * POST /api/admin/stats/memory/cleanup
 * Trigger memory cleanup operations
 */
router.post('/stats/memory/cleanup', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const cleanupResults: Record<string, unknown> = {};

    // Unload idle dictionaries (not accessed in 30 minutes)
    const unloadedDictionaries = dictionary.unloadIdleDictionaries(30 * 60 * 1000);
    cleanupResults.unloadedDictionaries = unloadedDictionaries;

    // Clear bot behavior caches
    clearBehaviorCaches();
    cleanupResults.clearedBotCaches = true;

    // Get memory stats after cleanup
    const processMemory = process.memoryUsage();
    cleanupResults.memoryAfterCleanup = {
      heapUsedMB: Math.round(processMemory.heapUsed / 1024 / 1024 * 10) / 10,
      heapTotalMB: Math.round(processMemory.heapTotal / 1024 / 1024 * 10) / 10,
    };

    // Request garbage collection if available (requires --expose-gc flag)
    if (global.gc) {
      global.gc();
      cleanupResults.gcTriggered = true;
    } else {
      cleanupResults.gcTriggered = false;
    }

    logger.info('ADMIN_API', `Memory cleanup completed: ${JSON.stringify(cleanupResults)}`);
    res.json({ success: true, results: cleanupResults });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Memory cleanup error: ${err.message}`);
    res.status(500).json({ error: 'Failed to perform memory cleanup' });
  }
});

export default router;
