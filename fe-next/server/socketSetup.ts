/**
 * Socket.IO Configuration and Monitoring
 * Handles Socket.IO server setup, connection monitoring, and cleanup timers
 */

import { Server } from 'socket.io';
import { initializeSocketHandlers } from '../backend/socketHandlers';
import { cleanupStaleGames, cleanupEmptyRooms, getActiveRooms } from '../backend/modules/gameStateManager';
import { registerDuelHandlers } from '../backend/handlers/duel';

import type { Server as HttpServer } from 'http';

// Track cleanup timers for graceful shutdown
const cleanupTimers: Set<NodeJS.Timeout> = new Set();

// Maximum concurrent connections allowed (prevents resource exhaustion)
const MAX_CONNECTIONS = parseInt(process.env.MAX_SOCKET_CONNECTIONS || '1000', 10);

/**
 * Create and configure Socket.IO server
 * @param httpServer - HTTP server instance
 * @param corsOrigin - CORS origin setting
 * @returns Socket.IO server instance
 */
export function createSocketServer(httpServer: HttpServer, corsOrigin: string): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin === '*' ? true : corsOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Performance optimizations
    perMessageDeflate: {
      threshold: 1024,
      zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
      zlibInflateOptions: { chunkSize: 10 * 1024 }
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 100 * 1024,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    // Connection limits to prevent resource exhaustion on low-end servers
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000 // 2 minutes
    }
  });

  // Connection limit middleware - prevents resource exhaustion on low-end devices
  io.use((socket, next) => {
    const currentConnections = io.sockets.sockets.size;
    if (currentConnections >= MAX_CONNECTIONS) {
      console.warn(`[SOCKET.IO] Connection rejected: limit reached (${currentConnections}/${MAX_CONNECTIONS})`);
      return next(new Error('Server at capacity, please try again later'));
    }
    next();
  });

  // Initialize event handlers for default namespace
  initializeSocketHandlers(io);

  // Create /duel namespace for duel-specific events
  // Isolates duel room state from default namespace game rooms
  const duelNamespace = io.of('/duel');

  // Middleware stub for duel namespace authentication
  // TODO (Phase 38): Add authentication middleware
  duelNamespace.use((socket, next) => {
    // Future: Verify JWT token, attach user data to socket
    // For now, allow all connections
    next();
  });

  // Register duel namespace connection handler
  duelNamespace.on('connection', (socket) => {
    console.log(`[DUEL NAMESPACE] Client connected: ${socket.id}`);

    // Register all duel event handlers for this socket
    registerDuelHandlers(duelNamespace, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[DUEL NAMESPACE] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
}

/**
 * Set up Socket.IO connection monitoring
 * @param io - Socket.IO server instance
 */
export function setupConnectionMonitoring(io: Server): void {
  // Log connection errors
  io.engine.on('connection_error', (err: { req?: { url?: string }; code?: string; message?: string }) => {
    console.error('[SOCKET.IO] Connection error:', err.req?.url, err.code, err.message);
  });

  // Log connection stats periodically
  const statsTimer = setInterval(() => {
    const socketCount = io.sockets.sockets.size;
    if (socketCount > 0) {
      console.log(`[SOCKET.IO] Active connections: ${socketCount}`);
    }
  }, 60000);
  cleanupTimers.add(statsTimer);
}

/**
 * Set up game cleanup timers
 * @param io - Socket.IO server instance
 */
export function setupCleanupTimers(io: Server): void {
  // Cleanup stale games every 5 minutes
  const staleGamesTimer = setInterval(() => {
    const cleaned = cleanupStaleGames();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} stale games`);
    }
  }, 5 * 60 * 1000);
  cleanupTimers.add(staleGamesTimer);

  // Cleanup empty rooms every 30 seconds
  const emptyRoomsTimer = setInterval(() => {
    const cleaned = cleanupEmptyRooms();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} empty room(s)`);
      io.emit('activeRooms', { rooms: getActiveRooms() });
    }
  }, 30 * 1000);
  cleanupTimers.add(emptyRoomsTimer);
}

/**
 * Clear all cleanup timers (for graceful shutdown)
 */
export function clearCleanupTimers(): void {
  console.log(`[SHUTDOWN] Clearing ${cleanupTimers.size} cleanup timers...`);
  for (const timer of cleanupTimers) {
    clearInterval(timer);
  }
  cleanupTimers.clear();
}

/**
 * Get the set of cleanup timers (for external management)
 * @returns Set of timer IDs
 */
export function getCleanupTimers(): Set<NodeJS.Timeout> {
  return cleanupTimers;
}
