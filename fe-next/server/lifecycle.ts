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
import { shutdownInMemorySingletons } from './shutdownSingletons';
import { clearCleanupTimers } from './socketSetup';
import { stopConnectionHealthCheck } from '../backend/handlers/presenceHandler';
import { sendOpsAlert } from '../backend/modules/notificationService';
import { stopEmptyRoomCleanup } from '../backend/socketHandlers';
import * as gameStateManager from '../backend/modules/gameStateManager';
import { startAllCronJobs, stopAllCronJobs } from '../backend/services/cronScheduler';
import { initCronQueue, registerAllCronJobs, shutdownCronQueue } from '../backend/queues/cronQueue';
import type { ScheduledTask } from 'node-cron';
import { isClientDisconnectError } from './clientDisconnect';

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
/**
 * Validate required env vars at boot. Logs loudly + Sentry-flags any missing
 * secrets so misconfiguration is caught in deploy logs, not on the first user
 * who hits the feature in prod (Sentry 12K — boost claim threw mid-request).
 */
function validateRequiredEnv(): void {
  const required = ['BOOST_TOKEN_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    const msg = `Missing required env vars: ${missing.join(', ')}`;
    lifecycleLogger.error(msg);
    Sentry.captureMessage(msg, 'error');
  }
}

export async function initializeServer(io: Server): Promise<void> {
  validateRequiredEnv();
  // Set up Redis adapter for horizontal scaling — timeout to prevent blocking startup
  const REDIS_INIT_TIMEOUT_MS = 15000;
  let redisInitTimer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      setupRedisAdapter(io as ExtendedSocketServer),
      new Promise<boolean>((resolve) => {
        redisInitTimer = setTimeout(() => {
          lifecycleLogger.warn('Redis adapter setup timed out — continuing without Redis adapter');
          resolve(false);
        }, REDIS_INIT_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Redis adapter setup failed — running in degraded mode');
  } finally {
    // Whoever loses the race must be cancelled — otherwise the loser fires its
    // log line minutes later, polluting prod logs and confusing post-mortems.
    if (redisInitTimer) clearTimeout(redisInitTimer);
  }

  // Restore active games from Redis (persisted during previous graceful shutdown)
  try {
    const restoredCount = await gameStateManager.restoreAllGamesFromRedis();
    if (restoredCount > 0) {
      lifecycleLogger.info({ count: restoredCount }, 'Restored active games from Redis — players can reconnect');
    }
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Failed to restore games from Redis');
  }

  // Start cross-replica cache invalidation (only active when REDIS_PRIMARY=true)
  try {
    await gameStateManager.initCacheInvalidation();
  } catch (error) {
    lifecycleLogger.warn({ err: error }, 'Cache invalidation listener failed to start — running without cross-replica eviction');
  }

  // Restore tournaments from Redis
  try {
    await restoreTournamentsFromRedis();
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Failed to restore tournaments');
  }

  // Load English only at boot; every other language lazy-loads via ensureLanguageLoaded()
  // on first game start (already wired in gameStartHandler/gameLifecycleHandler/gameTimer/
  // quickPlayRound/wordHuntRoutes/bot*). Measured Set+trie cost: Russian 262MB, Japanese
  // 77MB, Hebrew 55MB — eager-loading all 6 was the dominant idle-memory driver, not a
  // ~10-15MB rounding error as the old comment claimed.
  try {
    lifecycleLogger.info('Loading English dictionary at boot (other languages lazy-load on demand)');
    await dictionary.loadEnglishOnly();
    lifecycleLogger.info('English dictionary loaded successfully');
  } catch (error) {
    lifecycleLogger.error({ err: error }, 'Failed to load English dictionary');
  }

  // Warm up worker pool
  try {
    await wordValidatorPool.initialize();
    lifecycleLogger.info('Worker pool warmed up');
  } catch (error) {
    lifecycleLogger.warn({ err: error }, 'Failed to warm up worker pool');
  }

  // Start cron schedulers — BullMQ (durable, with retries) or node-cron (legacy)
  if (process.env.USE_BULLMQ === 'true') {
    try {
      initCronQueue();
      await registerAllCronJobs();
      lifecycleLogger.info('Started BullMQ cron queue');
    } catch (error) {
      lifecycleLogger.error({ err: error }, 'Failed to start BullMQ cron queue, falling back to node-cron');
      cronTasks = startAllCronJobs();
    }
  } else {
    try {
      cronTasks = startAllCronJobs();
      lifecycleLogger.info({ count: cronTasks.length }, 'Started cron schedulers');
    } catch (error) {
      lifecycleLogger.error({ err: error }, 'Failed to start cron schedulers');
    }
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
    stopEmptyRoomCleanup();

    // Stop cache invalidation listener
    await gameStateManager.shutdownCacheInvalidation();

    // Persist all active games to Redis before shutdown
    // This ensures running games survive deployments
    await persistAllActiveGames();

    // Stop accepting new connections
    httpServer.close(() => lifecycleLogger.info('HTTP server closed'));

    // Notify clients about shutdown.
    // reconnectIn = minimum wait; reconnectJitterMs = random spread on top.
    // Each client reconnects at a random point in [reconnectIn, reconnectIn+jitter]
    // so the freshly-booted (single) instance isn't hit by every client at once.
    io.emit('serverShutdown', {
      reconnectIn: 3000,
      reconnectJitterMs: 9000,
      message: 'Server is restarting',
    });
    await new Promise<void>(resolve => setTimeout(resolve, 2000));

    // Shutdown worker pool
    try {
      await wordValidatorPool.shutdown();
      lifecycleLogger.info('Worker pool closed');
    } catch (err) {
      lifecycleLogger.error({ err }, 'Error closing worker pool');
    }

    // Stop all cron schedulers (BullMQ or node-cron)
    try {
      if (process.env.USE_BULLMQ === 'true') {
        await shutdownCronQueue();
        lifecycleLogger.info('Stopped BullMQ cron queue');
      } else if (cronTasks.length > 0) {
        stopAllCronJobs(cronTasks);
        lifecycleLogger.info({ count: cronTasks.length }, 'Stopped cron schedulers');
      }
    } catch (err) {
      lifecycleLogger.error({ err }, 'Error stopping cron schedulers');
    }

    // Close socket connections
    io.close(() => lifecycleLogger.info('Socket.IO server closed'));

    // Stop in-memory singleton intervals (rate limiters + spam detector)
    shutdownInMemorySingletons();

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
    // A client vanishing mid-request (closed tab, navigation during a slow
    // response, reload) surfaces here as an uncaught exception because the
    // request stream errors with no listener. That is routine network
    // behaviour, not corrupted process state, so it must not exit and must not
    // page anyone — previously a single browser navigating away could take the
    // server down, which reads as an unexplained restart in production.
    if (isClientDisconnectError(error)) {
      lifecycleLogger.warn(
        { err: error, code: (error as NodeJS.ErrnoException).code },
        'Client disconnected mid-request (non-fatal)',
      );
      return;
    }

    lifecycleLogger.fatal({ err: error }, 'Uncaught Exception');

    // Fire-and-forget crash alert (best-effort within the 2s pre-exit window
    // below). Storm-guarded inside sendOpsAlert so a rapid crash loop can't flood.
    void sendOpsAlert(`🔴 lexiclash boggle-new: UNCAUGHT EXCEPTION — process exiting.\n${error?.message || String(error)}`);

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
