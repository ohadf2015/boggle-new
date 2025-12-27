/**
 * Server Lifecycle Management
 * Handles startup initialization and graceful shutdown
 */

import type { Server as HttpServer } from 'http';
import type { Server } from 'socket.io';

import * as dictionary from '../backend/dictionary';
import { restoreTournamentsFromRedis } from '../backend/modules/tournamentManager';
import { pool as wordValidatorPool } from '../backend/modules/wordValidatorPool';
import { setEventLoopLag } from '../backend/utils/metrics';
import { setupRedisAdapter, cleanupRedisAdapter } from './redisAdapter';
import { clearCleanupTimers } from './socketSetup';
import * as gameStateManager from '../backend/modules/gameStateManager';

import type { ExtendedSocketServer } from './redisAdapter';

/**
 * Shutdown handler function type
 */
export type ShutdownHandler = () => Promise<void>;

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

  // Load dictionaries
  try {
    await dictionary.load();
  } catch (error) {
    console.error('Failed to load dictionaries:', error);
  }

  // Warm up worker pool
  try {
    await wordValidatorPool.initialize();
    console.log('[WORKER POOL] Worker pool warmed up');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[WORKER POOL] Failed to warm up:', errorMessage);
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
