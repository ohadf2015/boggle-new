/**
 * Socket.IO Configuration and Monitoring
 * Handles Socket.IO server setup, connection monitoring, and cleanup timers
 */

import { Server } from 'socket.io';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { initializeSocketHandlers } from '../backend/socketHandlers';
import { cleanupStaleGames, cleanupEmptyRooms, getActiveRooms } from '../backend/modules/gameStateManager';
import { broadcastActiveRooms } from '../backend/utils/socketHelpers';
import { registerDuelHandlers } from '../backend/handlers/duel';

import type { Server as HttpServer } from 'http';

// Track cleanup timers for graceful shutdown
const cleanupTimers: Set<NodeJS.Timeout> = new Set();

// Maximum concurrent connections allowed (prevents resource exhaustion).
// Lowered from 1000 to 200 — each socket can trigger multiple Supabase queries,
// and Supabase's Varnish layer has a ~20-60 max_conn limit.
const MAX_CONNECTIONS = parseInt(process.env.MAX_SOCKET_CONNECTIONS || '200', 10);

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
  io.use((_socket, next) => {
    const currentConnections = io.sockets.sockets.size;
    if (currentConnections >= MAX_CONNECTIONS) {
      console.warn(`[SOCKET.IO] Connection rejected: limit reached (${currentConnections}/${MAX_CONNECTIONS})`);
      return next(new Error('Server at capacity, please try again later'));
    }
    next();
  });

  // Authentication middleware — verify Supabase JWT if provided.
  // Guests (no token) are allowed but get no verifiedUserId.
  // Authenticated users get their verified ID stored on socket.data.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      // Guest connection — allowed but unverified
      socket.data.verifiedUserId = null;
      return next();
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[SOCKET.IO] Auth middleware: Supabase not configured, skipping verification');
      socket.data.verifiedUserId = null;
      return next();
    }

    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.warn(`[SOCKET.IO] Invalid auth token from ${socket.id}: ${error?.message || 'no user'}`);
        socket.data.verifiedUserId = null;
        // Don't reject — allow as guest, but log the failed auth attempt
        return next();
      }

      socket.data.verifiedUserId = user.id;
      socket.data.verifiedEmail = user.email;
    } catch (err) {
      console.error('[SOCKET.IO] Auth verification error:', err);
      socket.data.verifiedUserId = null;
    }

    next();
  });

  // Initialize event handlers for default namespace
  initializeSocketHandlers(io);

  // Create /duel namespace for duel-specific events
  // Isolates duel room state from default namespace game rooms
  const duelNamespace = io.of('/duel');

  // Duel namespace authentication middleware
  // Reads userId and displayName from handshake auth/query params
  // so all duel handlers can rely on socket.data.userId and socket.data.displayName
  duelNamespace.use((socket, next) => {
    const auth = socket.handshake.auth || {};
    const query = socket.handshake.query || {};

    const userId = (auth.userId || query.userId || '') as string;
    const displayName = (auth.displayName || query.displayName || 'Anonymous') as string;

    if (!userId) {
      // Allow unauthenticated connections with a generated ID for now,
      // so the game UI can still render. Handlers that need a real user
      // will reject actions without a valid userId.
      socket.data.userId = socket.id;
    } else {
      socket.data.userId = userId;
    }

    socket.data.displayName = displayName;
    socket.data.classroomIds = [];

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
      broadcastActiveRooms(io, getActiveRooms());
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
