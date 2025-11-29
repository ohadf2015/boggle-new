// server.js - Socket.IO Server
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const next = require("next");
const cors = require("cors");
const { createAdapter } = require("@socket.io/redis-adapter");

// Backend imports
const { initRedis, closeRedis, createPubSubClients, getRedisMetrics } = require("./backend/redisClient");
const dictionary = require("./backend/dictionary");
const { initializeSocketHandlers } = require("./backend/socketHandlers");
const { restoreTournamentsFromRedis } = require("./backend/modules/tournamentManager");
const { cleanupStaleGames, cleanupEmptyRooms } = require("./backend/modules/gameStateManager");
const { pool: wordValidatorPool } = require("./backend/modules/wordValidatorPool");

// Track cleanup timers for graceful shutdown
const cleanupTimers = new Set();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  // Socket.IO server configuration
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
      methods: ["GET", "POST"],
      credentials: true
    },
    // Performance optimizations
    perMessageDeflate: {
      threshold: 1024, // Only compress messages > 1KB
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      }
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 100 * 1024, // 100KB max message size
    // Transport configuration
    transports: ['websocket', 'polling'],
    allowUpgrades: true
  });

  // Initialize Socket.IO event handlers
  initializeSocketHandlers(io);

  // Middleware
  server.disable('x-powered-by');

  // SECURITY: Configure CORS properly for production
  const corsOptions = {
    origin: CORS_ORIGIN === '*' && !dev
      ? false // Reject wildcard in production
      : CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    credentials: true
  };

  if (!dev && CORS_ORIGIN === '*') {
    console.warn('WARNING: CORS is set to wildcard (*) in production. This is insecure!');
    console.warn('Please set CORS_ORIGIN environment variable to your production domain.');
  }

  server.use(cors(corsOptions));
  server.use(express.json());

  // SECURITY: Add security headers
  server.use((req, res, next) => {
    const cspDev = "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';";
    const cspProd = "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';";
    res.setHeader('Content-Security-Policy', dev ? cspDev : cspProd);

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS for production
    if (!dev) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });

  // Socket.IO connection logging
  io.engine.on("connection_error", (err) => {
    console.error('[SOCKET.IO] Connection error:', err.req?.url, err.code, err.message);
  });

  // Log connection stats periodically (tracked for graceful shutdown)
  const statsTimer = setInterval(() => {
    const socketCount = io.sockets.sockets.size;
    if (socketCount > 0) {
      console.log(`[SOCKET.IO] Active connections: ${socketCount}`);
    }
  }, 60000);
  cleanupTimers.add(statsTimer);

  // Cleanup stale games periodically (tracked for graceful shutdown)
  const staleGamesTimer = setInterval(() => {
    const cleaned = cleanupStaleGames();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} stale games`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  cleanupTimers.add(staleGamesTimer);

  // Cleanup empty rooms more frequently (tracked for graceful shutdown)
  const emptyRoomsTimer = setInterval(() => {
    const cleaned = cleanupEmptyRooms();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} empty room(s)`);
      io.emit('activeRooms', { rooms: require('./backend/modules/gameStateManager').getActiveRooms() });
    }
  }, 30 * 1000); // Every 30 seconds
  cleanupTimers.add(emptyRoomsTimer);

  // Health check endpoint (responds immediately, doesn't depend on Redis/DB)
  server.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  // Scaling readiness endpoint - shows whether horizontal scaling is enabled
  server.get('/health/scaling', (_req, res) => {
    const { isRedisAvailable } = require('./backend/redisClient');
    const { getAllGames } = require('./backend/modules/gameStateManager');

    const games = getAllGames();
    const hasRedisAdapter = !!io.pubClient;
    const redisAvailable = isRedisAvailable();

    res.json({
      status: 'ok',
      scaling: {
        horizontalReady: hasRedisAdapter && redisAvailable,
        redisAdapter: hasRedisAdapter,
        redisAvailable: redisAvailable,
        instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local'
      },
      stats: {
        activeGames: games.length,
        totalPlayers: games.reduce((sum, g) => sum + g.playerCount, 0),
        socketConnections: io.sockets.sockets.size
      },
      timestamp: Date.now()
    });
  });

  // Metrics endpoint
  const { getMetrics, getRoomMetrics, resetAll, setEventLoopLag } = require('./backend/utils/metrics');
  server.get('/metrics', (_req, res) => {
    res.json(getMetrics());
  });
  server.get('/metrics/rooms', (_req, res) => {
    res.json(getRoomMetrics());
  });
  server.get('/metrics/reset', (_req, res) => {
    resetAll();
    res.json({ ok: true });
  });

  // Redis metrics endpoint
  server.get('/metrics/redis', async (_req, res) => {
    try {
      const metrics = await getRedisMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leaderboard API endpoints
  const { getSupabase, isSupabaseConfigured } = require('./backend/modules/supabaseServer');
  const { getCachedLeaderboardTop100, cacheLeaderboardTop100, getCachedUserRank, cacheUserRank } = require('./backend/redisClient');

  // GET /api/leaderboard - Get top 100 leaderboard
  server.get('/api/leaderboard', async (_req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(503).json({ error: 'Leaderboard service not available' });
      }

      // Try cache first
      const cached = await getCachedLeaderboardTop100();
      if (cached) {
        return res.json({ data: cached, cached: true });
      }

      // Fetch from Supabase
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('leaderboard')
        .select('player_id, username, avatar_emoji, avatar_color, total_score, games_played, games_won, ranked_mmr')
        .order('total_score', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[API] Leaderboard fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }

      // Cache the result
      if (data) {
        await cacheLeaderboardTop100(data);
      }

      res.json({ data: data || [], cached: false });
    } catch (error) {
      console.error('[API] Leaderboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/leaderboard/rank/:userId - Get a specific user's rank
  server.get('/api/leaderboard/rank/:userId', async (req, res) => {
    try {
      if (!isSupabaseConfigured()) {
        return res.status(503).json({ error: 'Leaderboard service not available' });
      }

      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Try cache first
      const cached = await getCachedUserRank(userId);
      if (cached) {
        return res.json({ data: cached, cached: true });
      }

      // Fetch from Supabase using a window function to get rank
      const supabase = getSupabase();

      // First get the user's total score
      const { data: userData, error: userError } = await supabase
        .from('leaderboard')
        .select('player_id, username, total_score, games_played')
        .eq('player_id', userId)
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: 'User not found in leaderboard' });
      }

      // Count how many users have a higher score to get rank
      const { count, error: countError } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('total_score', userData.total_score);

      if (countError) {
        console.error('[API] Rank count error:', countError);
        return res.status(500).json({ error: 'Failed to calculate rank' });
      }

      const rankData = {
        ...userData,
        rank_position: (count || 0) + 1
      };

      // Cache the result
      await cacheUserRank(userId, rankData);

      res.json({ data: rankData, cached: false });
    } catch (error) {
      console.error('[API] User rank error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Next.js handler for all other routes
  server.use(async (req, res) => {
    try {
      const parsedUrl = require('url').parse(req.url, true);
      const { pathname, query } = parsedUrl;

      console.log(`[Request] ${req.method} ${req.url} | pathname: ${pathname}`);

      // Note: Locale-prefixed auth callbacks (e.g., /he/auth/callback) are now handled
      // by the client-side page at app/[locale]/auth/callback/page.jsx
      // This is necessary because hash fragments (#access_token=...) are not sent to the server,
      // so we need client-side JavaScript to process the OAuth implicit flow response.

      // Manual redirect for root path (since middleware might be skipped in custom server)
      if (pathname === '/') {
        const acceptLanguage = req.headers['accept-language'];
        let locale = 'he'; // Default

        if (acceptLanguage) {
          const browserLang = acceptLanguage.split(',')[0].split('-')[0];
          if (['en', 'he'].includes(browserLang)) {
            locale = browserLang;
          }
        }

        // Preserve query params (e.g., ?room=1234) during redirect
        const queryString = parsedUrl.search || '';
        console.log(`[Redirect] Root path redirect: ${req.url} -> /${locale}${queryString}`);
        res.writeHead(307, { Location: `/${locale}${queryString}` });
        res.end();
        return;
      }

      // Set x-powered-by to Next.js to reassure user
      res.setHeader('X-Powered-By', 'Next.js');

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Start server
  async function startServer() {
    const redisConnected = await initRedis();

    // Set up Socket.IO Redis adapter for horizontal scaling
    // Reuses existing Redis connection via createPubSubClients()
    if (redisConnected) {
      try {
        const clients = createPubSubClients();

        if (clients) {
          const { pubClient, subClient } = clients;

          // Connect the duplicated clients
          await Promise.all([
            pubClient.connect(),
            subClient.connect()
          ]);

          io.adapter(createAdapter(pubClient, subClient));
          console.log('[SOCKET.IO] Redis adapter enabled - horizontal scaling ready');

          // Store adapter clients for cleanup
          io.pubClient = pubClient;
          io.subClient = subClient;
        } else {
          console.warn('[SOCKET.IO] Could not create pub/sub clients');
          console.log('[SOCKET.IO] Running in single instance mode');
        }
      } catch (error) {
        console.warn('[SOCKET.IO] Could not set up Redis adapter:', error.message);
        console.warn('[SOCKET.IO] Continuing without Redis adapter (single instance mode)');
      }
    } else {
      console.log('[SOCKET.IO] Running in single instance mode (no Redis adapter)');
    }

    // Restore tournaments from Redis
    try {
      await restoreTournamentsFromRedis();
    } catch (error) {
      console.error('Failed to restore tournaments:', error);
    }

    try {
      await dictionary.load();
    } catch (error) {
      console.error('Failed to load dictionaries:', error);
    }

    // Warm up worker pool for word validation (prevents cold start latency)
    try {
      await wordValidatorPool.initialize();
      console.log('[WORKER POOL] Worker pool warmed up');
    } catch (error) {
      console.warn('[WORKER POOL] Failed to warm up worker pool:', error.message);
    }

    httpServer.listen(PORT, HOST, () => {
      console.log(`> Server ready on http://${HOST}:${PORT}`);
      console.log(`> Socket.IO server ready`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });
  }

  // Graceful shutdown with connection draining
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('[SHUTDOWN] Starting graceful shutdown...');

    // Clear all cleanup timers to prevent memory leaks
    console.log(`[SHUTDOWN] Clearing ${cleanupTimers.size} cleanup timers...`);
    for (const timer of cleanupTimers) {
      clearInterval(timer);
    }
    cleanupTimers.clear();

    // Stop accepting new connections
    httpServer.close(() => {
      console.log('[SHUTDOWN] HTTP server closed');
    });

    // Notify all connected clients about the shutdown
    io.emit('serverShutdown', { reconnectIn: 5000, message: 'Server is restarting' });
    console.log('[SHUTDOWN] Notified clients of shutdown');

    // Give clients a moment to receive the notification
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Shutdown worker pool
    try {
      await wordValidatorPool.shutdown();
      console.log('[SHUTDOWN] Worker pool closed');
    } catch (err) {
      console.error('[SHUTDOWN] Error closing worker pool:', err.message);
    }

    // Close all socket connections
    io.close(() => {
      console.log('[SHUTDOWN] Socket.IO server closed');
    });

    // Clean up Redis adapter clients if they exist
    if (io.pubClient) {
      try {
        await io.pubClient.quit();
        console.log('[SHUTDOWN] Redis pub client closed');
      } catch (err) {
        console.error('[SHUTDOWN] Error closing pub client:', err.message);
      }
    }
    if (io.subClient) {
      try {
        await io.subClient.quit();
        console.log('[SHUTDOWN] Redis sub client closed');
      } catch (err) {
        console.error('[SHUTDOWN] Error closing sub client:', err.message);
      }
    }

    await closeRedis();

    // Force exit after timeout if graceful shutdown takes too long
    setTimeout(() => {
      console.log('[SHUTDOWN] Forcing exit after timeout');
      process.exit(0);
    }, 10000);

    console.log('[SHUTDOWN] Server shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Event loop lag measurement
  (function monitorLoopLag() {
    let last = Date.now();
    const interval = parseInt(process.env.EVENT_LOOP_MONITOR_INTERVAL_MS || '1000');
    setInterval(() => {
      const now = Date.now();
      const drift = now - last - interval;
      last = now;
      setEventLoopLag(Math.max(0, drift));
    }, interval).unref();
  })();

  startServer();
});
