/**
 * Server Lifecycle Management
 * Handles startup initialization and graceful shutdown
 */

import type { Server as HttpServer } from 'http';
import type { Server } from 'socket.io';
import * as Sentry from '@sentry/nextjs';

import * as dictionary from '../backend/dictionary';
import { restoreTournamentsFromRedis } from '../backend/modules/tournamentManager';
import { pool as wordValidatorPool } from '../backend/modules/wordValidatorPool';
import { setEventLoopLag } from '../backend/utils/metrics';
import { setupRedisAdapter, cleanupRedisAdapter, type ExtendedSocketServer } from './redisAdapter';
import { clearCleanupTimers } from './socketSetup';
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
    console.error('Failed to restore tournaments:', error);
  }

  // Load English dictionary on startup (most common language)
  // Other languages will be lazy-loaded on first use for ~60% memory savings
  try {
    console.log('[STARTUP] Loading English dictionary (lazy loading enabled for other languages)...');
    await dictionary.loadEnglishOnly();
    console.log('[STARTUP] English dictionary loaded - other languages will be lazy-loaded on demand');
  } catch (error) {
    console.error('Failed to load dictionary:', error);
  }

  // Warm up worker pool
  try {
    await wordValidatorPool.initialize();
    console.log('[WORKER POOL] Worker pool warmed up');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[WORKER POOL] Failed to warm up:', errorMessage);
  }

  // Start all cron schedulers (Daily Buzz, Wikipedia, Daily Words, Bot Difficulty)
  try {
    cronTasks = startAllCronJobs();
    console.log(`[STARTUP] Started ${cronTasks.length} cron schedulers`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[STARTUP] Failed to start cron schedulers:', errorMessage);
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
    console.log(`[SHUTDOWN] Persisting ${gameCodes.length} active game(s) to Redis...`);
    
    const persistPromises = gameCodes.map(async (gameCode) => {
      try {
        await gameStateManager.persistGameStateNow(gameCode);
        console.log(`[SHUTDOWN] Persisted game ${gameCode}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SHUTDOWN] Failed to persist game ${gameCode}:`, errorMessage);
      }
    });

    await Promise.all(persistPromises);
    console.log(`[SHUTDOWN] Successfully persisted ${gameCodes.length} game(s) to Redis`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SHUTDOWN] Error persisting games:', errorMessage);
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

    console.log('[SHUTDOWN] Starting graceful shutdown...');

    // Clear all cleanup timers
    clearCleanupTimers();

    // Persist all active games to Redis before shutdown
    // This ensures running games survive deployments
    await persistAllActiveGames();

    // Stop accepting new connections
    httpServer.close(() => console.log('[SHUTDOWN] HTTP server closed'));

    // Notify clients about shutdown
    io.emit('serverShutdown', { reconnectIn: 5000, message: 'Server is restarting' });
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    // Shutdown worker pool
    try {
      await wordValidatorPool.shutdown();
      console.log('[SHUTDOWN] Worker pool closed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[SHUTDOWN] Error closing worker pool:', errorMessage);
    }

    // Stop all cron schedulers
    try {
      if (cronTasks.length > 0) {
        stopAllCronJobs(cronTasks);
        console.log(`[SHUTDOWN] Stopped ${cronTasks.length} cron schedulers`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[SHUTDOWN] Error stopping cron schedulers:', errorMessage);
    }

    // Close socket connections
    io.close(() => console.log('[SHUTDOWN] Socket.IO server closed'));

    // Clean up Redis adapter clients
    await cleanupRedisAdapter(extendedIo);

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
    console.error('[PROCESS] Unhandled Promise Rejection:', reason);

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
    console.error('[PROCESS] Uncaught Exception:', error);

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
    console.warn('[PROCESS] Warning:', warning.name, warning.message);

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
