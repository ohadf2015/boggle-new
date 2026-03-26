/**
 * Server Lifecycle Management
 * Handles startup initialization and graceful shutdown
 */

import type { Server as HttpServer } from 'http';
import type { Server } from 'socket.io';
import * as Sentry from '@sentry/nextjs';

import { lifecycleLogger } from './logger';
import * as dictionary from '../backend/dictionary';
import { restoreTournamentsFromRedis } from '../backend/modules/tournamentManager';
import { pool as wordValidatorPool } from '../backend/modules/wordValidatorPool';
import { setEventLoopLag } from '../backend/utils/metrics';
import { setupRedisAdapter, cleanupRedisAdapter, type ExtendedSocketServer } from './redisAdapter';
import { clearCleanupTimers } from './socketSetup';
import { stopConnectionHealthCheck } from '../backend/handlers/presenceHandler';
import * as gameStateManager from '../backend/modules/gameStateManager';
import { startAllCronJobs, stopAllCronJobs } from '../backend/services/cronScheduler';
import type { ScheduledTask } from 'node-cron';

/**
 * Shutdown handler function type
 */
export type ShutdownHandler = () => Promise<void>;

/**
 * Cron tasks (stored for cleanup)
 */
let cronTasks: ScheduledTask[] = [];

/**
 * Initialize all server components
 * @param io - Socket.IO server instance
 */
export async function initializeServer(io: Server): Promise<void> {
  // Set up Redis adapter for horizontal scaling
  await setupRedisAdapter(io as ExtendedSocketServer);

  // Restore tournaments from Redis
  try {
    await restoreTournamentsFromRedis();
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Failed to restore tournaments');
  }

  // Load ALL dictionaries on startup to prevent race conditions and delays during gameplay
  // Memory cost is ~10-15MB for all 5 languages, but eliminates latency issues
  try {
    lifecycleLogger.info('Loading all dictionaries (en, he, sv, ja, es)');
    await dictionary.load();
    lifecycleLogger.info('All dictionaries loaded successfully');
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Failed to load dictionaries');
  }

  // Warm up worker pool
  try {
    await wordValidatorPool.initialize();
    lifecycleLogger.info('Worker pool warmed up');
  } catch (error) {
    lifecycleLogger.warn({ err: error }, 'Failed to warm up worker pool');
  }

  // Start all cron schedulers (Wikipedia, Daily Words, Bot Difficulty)
  try {
    cronTasks = startAllCronJobs();
    lifecycleLogger.info({ count: cronTasks.length }, 'Started cron schedulers');
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Failed to start cron schedulers');
  }
}

/**
 * Set up event loop lag monitoring
 */
export function setupEventLoopMonitoring(): void {
  let last = Date.now();
  const interval = parseInt(process.env.EVENT_LOOP_MONITOR_INTERVAL_MS || '1000', 10);

  setInterval(() => {
    const now = Date.now();
    const drift = now - last - interval;
    last = now;
    setEventLoopLag(Math.max(0, drift));
  }, interval).unref();
}

/**
 * Persist all active games to Redis before shutdown
 * Ensures no game state is lost during deployments
 */
async function persistAllActiveGames(): Promise<void> {
  try {
    const gameCodes = gameStateManager.getAllGameCodes();
    lifecycleLogger.info({ count: gameCodes.length }, 'Persisting active games to Redis');
    
    const persistPromises = gameCodes.map(async (gameCode) => {
      try {
        await gameStateManager.persistGameStateNow(gameCode);
        lifecycleLogger.info({ gameCode }, 'Persisted game');
      } catch (error) {
        lifecycleLogger.error({ gameCode, err: error }, 'Failed to persist game');
      }
    });

    await Promise.all(persistPromises);
    lifecycleLogger.info({ count: gameCodes.length }, 'Successfully persisted all games to Redis');
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Error persisting games');
  }
}

/**
 * Create graceful shutdown handler
 * @param httpServer - HTTP server instance
 * @param io - Socket.IO server instance
 * @returns Shutdown handler function
 */
export function createShutdownHandler(httpServer: HttpServer, io: Server): ShutdownHandler {
  let isShuttingDown = false;
  const extendedIo = io as ExtendedSocketServer;

  return async (): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    lifecycleLogger.info('Starting graceful shutdown');

    // Clear all cleanup timers and health checks
    clearCleanupTimers();
    stopConnectionHealthCheck();

    // Persist all active games to Redis before shutdown
    // This ensures running games survive deployments
    await persistAllActiveGames();

    // Stop accepting new connections
    httpServer.close(() => lifecycleLogger.info('HTTP server closed'));

    // Notify clients about shutdown
    io.emit('serverShutdown', { reconnectIn: 5000, message: 'Server is restarting' });
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    // Shutdown worker pool
    try {
      await wordValidatorPool.shutdown();
      lifecycleLogger.info('Worker pool closed');
    } catch (err) {
      lifecycleLogger.error({ err }, 'Error closing worker pool');
    }

    // Stop all cron schedulers
    try {
      if (cronTasks.length > 0) {
        stopAllCronJobs(cronTasks);
        lifecycleLogger.info({ count: cronTasks.length }, 'Stopped cron schedulers');
      }
    } catch (err) {
      lifecycleLogger.error({ err }, 'Error stopping cron schedulers');
    }

    // Close socket connections
    io.close(() => lifecycleLogger.info('Socket.IO server closed'));

    // Clean up Redis adapter clients
    await cleanupRedisAdapter(extendedIo);

    // Force exit after timeout
    setTimeout(() => {
      lifecycleLogger.warn('Forcing exit after timeout');
      process.exit(0);
    }, 10000);

    lifecycleLogger.info('Server shutdown complete');
    process.exit(0);
  };
}

/**
 * Register shutdown signal handlers
 * @param shutdownHandler - Shutdown handler function
 */
export function registerShutdownHandlers(shutdownHandler: ShutdownHandler): void {
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
}

/**
 * Register process-level error handlers to capture uncaught errors to Sentry
 * Must be called during server initialization
 */
export function registerProcessErrorHandlers(): void {
  // Capture unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    lifecycleLogger.error({ err: reason }, 'Unhandled Promise Rejection');

    // Capture to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      if (reason instanceof Error) {
        Sentry.withScope((scope) => {
          scope.setTag('error.type', 'unhandled_rejection');
          scope.setContext('promise', {
            promise: String(promise),
          });
          Sentry.captureException(reason);
        });
      } else {
        Sentry.withScope((scope) => {
          scope.setTag('error.type', 'unhandled_rejection');
          Sentry.captureMessage(`Unhandled Rejection: ${String(reason)}`, 'error');
        });
      }
    }
  });

  // Capture uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    lifecycleLogger.fatal({ err: error }, 'Uncaught Exception');

    // Capture to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.withScope((scope) => {
        scope.setTag('error.type', 'uncaught_exception');
        Sentry.captureException(error);
      });
    }

    // Exit process after logging (uncaught exceptions are fatal)
    // Give Sentry time to send the error
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  });

  // Capture warnings (non-fatal)
  process.on('warning', (warning: Error) => {
    lifecycleLogger.warn({ warningName: warning.name }, warning.message);

    // Only capture high-severity warnings to Sentry in production
    if (
      process.env.NODE_ENV === 'production' &&
      warning.name === 'DeprecationWarning'
    ) {
      Sentry.withScope((scope) => {
        scope.setLevel('warning');
        scope.setTag('warning.type', warning.name);
        Sentry.captureMessage(`Process Warning: ${warning.message}`, 'warning');
      });
    }
  });
}
