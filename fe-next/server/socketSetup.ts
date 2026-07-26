/**
 * Socket.IO Configuration and Monitoring
 * Handles Socket.IO server setup, connection monitoring, and cleanup timers
 */

import { Server } from 'socket.io';
import { socketLogger } from './logger';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { initializeSocketHandlers } from '../backend/socketHandlers';
import { cleanupStaleGames, cleanupEmptyRooms, getActiveRooms } from '../backend/modules/gameStateManager';
import { broadcastActiveRooms } from '../backend/utils/socketHelpers';
import { purgeStaleSocketEntries, getSocketMapSizes } from '../backend/modules/userManager';
import { registerDuelHandlers } from '../backend/handlers/duel';
import { checkConnectionRateLimit } from '../backend/middleware/rateLimiterRedis';
import { pruneSolverCaches } from '../backend/modules/boggleSolver';

import type { Server as HttpServer } from 'http';

// Track cleanup timers for graceful shutdown
const cleanupTimers: Set<NodeJS.Timeout> = new Set();

// Maximum concurrent connections allowed (prevents resource exhaustion).
// Set to 500 to support 300+ concurrent players with headroom.
// Each socket can trigger Supabase queries — ensure PgBouncer pool size
// supports this (recommended: pool_size >= MAX_CONNECTIONS / 5).
const MAX_CONNECTIONS = parseInt(process.env.MAX_SOCKET_CONNECTIONS || '500', 10);

/**
 * Create and configure Socket.IO server
 * @param httpServer - HTTP server instance
 * @param corsOrigin - CORS origin setting
 * @returns Socket.IO server instance
 */
export function createSocketServer(httpServer: HttpServer, corsOrigin: string): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (() => {
        if (corsOrigin === '*') {
          const isDev = process.env.NODE_ENV !== 'production';
          if (!isDev) {
            socketLogger.fatal('CORS_ORIGIN=* is not allowed in production for Socket.IO. Set explicit origins.');
            return false;
          }
          return true;
        }
        return corsOrigin.split(',');
      })(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    // perMessageDeflate disabled — zlib compression per frame burns CPU on
    // small JSON payloads and hurts multi-game fan-out. Bandwidth savings
    // are not worth the latency under concurrent load.
    perMessageDeflate: false,
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

  // Connection rate limit middleware - prevents rapid reconnect abuse per IP
  io.use(async (socket, next) => {
    const ip = socket.handshake.headers['x-forwarded-for'] as string || socket.handshake.address;
    const allowed = await checkConnectionRateLimit(ip);
    if (!allowed) {
      socketLogger.warn({ ip }, 'Connection rejected: rate limit exceeded');
      next(new Error('Too many connections'));
      return;
    }
    next();
  });

  // Connection limit middleware with backpressure.
  // Soft limit (80%): log warning. Hard limit (100%): reject with retry hint.
  const SOFT_LIMIT = Math.floor(MAX_CONNECTIONS * 0.8);
  io.use((_socket, next) => {
    const currentConnections = io.sockets.sockets.size;
    if (currentConnections >= MAX_CONNECTIONS) {
      socketLogger.warn({ currentConnections, maxConnections: MAX_CONNECTIONS }, 'Connection rejected: hard limit reached');
      return next(new Error('Server at capacity, please try again later'));
    }
    if (currentConnections >= SOFT_LIMIT) {
      socketLogger.info({ currentConnections, softLimit: SOFT_LIMIT }, 'Connection accepted: approaching capacity');
    }
    next();
  });

  // Authentication middleware — verify Supabase JWT if provided.
  // Guests (no token) are allowed but get no verifiedUserId.
  // Authenticated users get their verified ID stored on socket.data.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Create Supabase client once and reuse across all auth checks
  // (previously recreated per connection — unnecessary overhead)
  const supabase = supabaseUrl && supabaseServiceKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceKey)
    : null;

  const AUTH_TIMEOUT_MS = 5000;

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const crazyGamesToken = socket.handshake.auth?.crazyGamesToken as string | undefined;

    // Verify Supabase auth token
    if (!token) {
      socket.data.verifiedUserId = null;
    } else if (!supabase) {
      socketLogger.warn('Auth middleware: Supabase not configured, skipping verification');
      socket.data.verifiedUserId = null;
    } else {
      try {
        const authResult = await Promise.race([
          supabase.auth.getUser(token),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth verification timed out')), AUTH_TIMEOUT_MS)
          ),
        ]);

        const { data: { user }, error } = authResult;

        if (error || !user) {
          socketLogger.warn({ socketId: socket.id, err: error?.message || 'no user' }, 'Invalid auth token');
          socket.data.verifiedUserId = null;
        } else {
          socket.data.verifiedUserId = user.id;
          socket.data.verifiedEmail = user.email;
        }
      } catch (err) {
        socketLogger.error({ err }, 'Auth verification error');
        socket.data.verifiedUserId = null;
      }
    }

    // Store CrazyGames token for downstream handlers (verified lazily on demand).
    // Full JWT verification requires jose + JWKS fetch — handlers that need
    // verified CG identity should call the /api/auth/verify-crazygames endpoint.
    if (crazyGamesToken) {
      socket.data.crazyGamesToken = crazyGamesToken;
      socket.data.isCrazyGames = true;
    } else {
      socket.data.isCrazyGames = false;
    }

    next();
  });

  // Initialize event handlers for default namespace
  initializeSocketHandlers(io);

  // Create /duel namespace for duel-specific events
  // Isolates duel room state from default namespace game rooms
  const duelNamespace = io.of('/duel');

  // M7/B16 fix: Duel namespace authentication middleware with JWT verification
  // Previously accepted userId from handshake without verification — identity spoofing was possible.
  // Now verifies Supabase JWT like the main namespace, then sets verified userId.
  duelNamespace.use(async (socket, next) => {
    const auth = socket.handshake.auth || {};
    const query = socket.handshake.query || {};
    const token = (auth.token || '') as string;
    const displayName = (auth.displayName || query.displayName || 'Anonymous') as string;

    if (!token) {
      // No JWT — reject for duel namespace (duels require authenticated users)
      return next(new Error('Authentication required for duels'));
    }

    if (!supabase) {
      socketLogger.warn('Duel auth middleware: Supabase not configured');
      return next(new Error('Authentication service unavailable'));
    }

    try {
      const authResult = await Promise.race([
        supabase.auth.getUser(token),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Duel auth timed out')), AUTH_TIMEOUT_MS)
        ),
      ]);
      const { data: { user }, error } = authResult;

      if (error || !user) {
        socketLogger.warn({ socketId: socket.id, err: error?.message || 'no user' }, 'Duel invalid auth token');
        return next(new Error('Invalid authentication token'));
      }

      // Use verified userId — never trust client-supplied userId
      socket.data.userId = user.id;
      socket.data.verifiedUserId = user.id;
      socket.data.displayName = displayName;
      socket.data.classroomIds = [];
      next();
    } catch (err) {
      socketLogger.error({ err }, 'Duel auth verification error');
      return next(new Error('Authentication error'));
    }
  });

  // Register duel namespace connection handler
  duelNamespace.on('connection', (socket) => {
    socketLogger.info({ socketId: socket.id }, 'Duel client connected');

    // Register all duel event handlers for this socket
    registerDuelHandlers(duelNamespace, socket);

    socket.on('disconnect', (reason) => {
      socketLogger.info({ socketId: socket.id, reason }, 'Duel client disconnected');
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
    socketLogger.error({ url: err.req?.url, code: err.code, err: err.message }, 'Connection error');
  });

  // Log connection stats periodically
  const statsTimer = setInterval(() => {
    const socketCount = io.sockets.sockets.size;
    if (socketCount > 0) {
      socketLogger.info({ socketCount }, 'Active connections');
    }
  }, 60000);
  cleanupTimers.add(statsTimer);
}

/**
 * Set up game cleanup timers
 * @param io - Socket.IO server instance
 */
export function setupCleanupTimers(io: Server): void {
  // Cleanup stale games every 5 minutes (reduced from 30min to 10min max age)
  const staleGamesTimer = setInterval(() => {
    const cleaned = cleanupStaleGames(10 * 60 * 1000); // 10 min instead of 30
    if (cleaned > 0) {
      socketLogger.info({ count: cleaned }, 'Removed stale games');
    }
  }, 5 * 60 * 1000);
  cleanupTimers.add(staleGamesTimer);

  // Purge orphaned socket map entries every 5 minutes.
  // Collects active socket IDs from Socket.IO and removes any map entries
  // pointing to sockets that no longer exist (missed disconnect events).
  const socketPurgeTimer = setInterval(() => {
    const activeSocketIds = new Set<string>();
    for (const [id] of io.sockets.sockets) {
      activeSocketIds.add(id);
    }
    const purged = purgeStaleSocketEntries(activeSocketIds);
    if (purged > 0) {
      socketLogger.info({ purged }, 'Purged stale socket map entries');
    }
    // Log map sizes for monitoring
    const sizes = getSocketMapSizes();
    if (sizes.socketToGame > 100) {
      socketLogger.info(sizes, 'Socket map sizes');
    }
  }, 5 * 60 * 1000);
  cleanupTimers.add(socketPurgeTimer);

  // Reclaim idle solver memory every 10 minutes.
  // Tries are built lazily per locale and were never swept — the TTL inside
  // getCachedTrie() is only honoured on the next access for that SAME
  // language, so a locale played once held its trie (~36 MB for English,
  // 607k nodes) for the life of the process. Container sits at ~790 MB heap /
  // 1.1 GB RSS with zero active games, so this is worth reclaiming.
  //
  // Deliberately does NOT call unloadIdleDictionaries(): that empties the word
  // Set, and getCachedTrie() returns null for an empty Set. Callers are not
  // uniformly null-safe (getTrieNode dereferences straight away, and
  // botWheelRush already documents bots flatlining on a null trie). Pruning
  // the trie alone is safe — it rebuilds from the still-loaded Set in ~91 ms.
  const memoryReclaimTimer = setInterval(() => {
    const { tries, grids } = pruneSolverCaches();
    if (tries > 0 || grids > 0) {
      socketLogger.info(
        { tries, grids, heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1048576) },
        'Reclaimed idle solver memory'
      );
    }
  }, 10 * 60 * 1000);
  cleanupTimers.add(memoryReclaimTimer);

  // Cleanup empty rooms every 30 seconds
  const emptyRoomsTimer = setInterval(() => {
    const cleaned = cleanupEmptyRooms();
    if (cleaned > 0) {
      socketLogger.info({ count: cleaned }, 'Removed empty rooms');
      broadcastActiveRooms(io, getActiveRooms());
    }
  }, 30 * 1000);
  cleanupTimers.add(emptyRoomsTimer);
}

/**
 * Clear all cleanup timers (for graceful shutdown)
 */
export function clearCleanupTimers(): void {
  socketLogger.info({ count: cleanupTimers.size }, 'Clearing cleanup timers');
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
