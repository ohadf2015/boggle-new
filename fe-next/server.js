// server.js - Socket.IO Server (Refactored)
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const next = require("next");
const cors = require("cors");
const { createAdapter } = require("@socket.io/redis-adapter");

// Backend imports
const { initRedis, closeRedis, createPubSubClients } = require("./backend/redisClient");
const dictionary = require("./backend/dictionary");
const { initializeSocketHandlers } = require("./backend/socketHandlers");
const { restoreTournamentsFromRedis } = require("./backend/modules/tournamentManager");
const { cleanupStaleGames, cleanupEmptyRooms, getActiveRooms } = require("./backend/modules/gameStateManager");
const { pool: wordValidatorPool } = require("./backend/modules/wordValidatorPool");
const { geolocationMiddleware, getCountryFromRequest } = require("./backend/utils/geolocation");
const { setEventLoopLag } = require("./backend/utils/metrics");

// Route modules
const adminRoutes = require("./backend/routes/admin");
const leaderboardRoutes = require("./backend/routes/leaderboard");
const analyticsRoutes = require("./backend/routes/analytics");
const geolocationRoutes = require("./backend/routes/geolocation");

// Track cleanup timers for graceful shutdown
const cleanupTimers = new Set();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

nextApp.prepare().then(() => {
  const app = express();
  const httpServer = http.createServer(app);

  // Socket.IO server configuration
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
      methods: ["GET", "POST"],
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
    allowUpgrades: true
  });

  // Store io instance on app for route modules to access
  app.set('io', io);

  // Initialize Socket.IO event handlers
  initializeSocketHandlers(io);

  // =============================================
  // MIDDLEWARE CONFIGURATION
  // =============================================

  app.disable('x-powered-by');

  // SECURITY: Configure CORS - fail closed in production with wildcard
  const corsOptions = {
    origin: (() => {
      if (CORS_ORIGIN === '*') {
        if (!dev) {
          console.error('FATAL: CORS_ORIGIN=* is not allowed in production. Set explicit origins.');
          // In production, reject wildcard CORS for security
          return false;
        }
        return true; // Allow wildcard only in development
      }
      return CORS_ORIGIN.split(',');
    })(),
    credentials: true
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  // Security headers middleware
  app.use((req, res, next) => {
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
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (!dev) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });

  // IP Geolocation middleware
  app.use(geolocationMiddleware({
    skipPaths: ['/health', '/metrics', '/_next', '/favicon.ico'],
    pathFilter: ['/', '/api/geolocation']
  }));

  // =============================================
  // SOCKET.IO MONITORING
  // =============================================

  io.engine.on("connection_error", (err) => {
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

  // =============================================
  // HEALTH & METRICS ENDPOINTS
  // =============================================

  const { isRedisAvailable, getRedisMetrics } = require('./backend/redisClient');
  const { getAllGames } = require('./backend/modules/gameStateManager');
  const { getMetrics, getRoomMetrics, resetAll } = require('./backend/utils/metrics');

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/health/scaling', (_req, res) => {
    const games = getAllGames();
    res.json({
      status: 'ok',
      scaling: {
        horizontalReady: !!io.pubClient && isRedisAvailable(),
        redisAdapter: !!io.pubClient,
        redisAvailable: isRedisAvailable(),
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

  app.get('/metrics', (_req, res) => res.json(getMetrics()));
  app.get('/metrics/rooms', (_req, res) => res.json(getRoomMetrics()));
  app.get('/metrics/reset', (_req, res) => { resetAll(); res.json({ ok: true }); });
  app.get('/metrics/redis', async (_req, res) => {
    try {
      res.json(await getRedisMetrics());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // API ROUTES (Modular)
  // =============================================

  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);

  // =============================================
  // NEXT.JS REQUEST HANDLER
  // =============================================

  app.use(async (req, res) => {
    try {
      const parsedUrl = require('url').parse(req.url, true);
      const { pathname } = parsedUrl;

      console.log(`[Request] ${req.method} ${req.url} | pathname: ${pathname}`);

      // Handle root path locale redirect
      if (pathname === '/') {
        const redirectResult = handleLocaleRedirect(req, res, parsedUrl);
        if (redirectResult) return;
      }

      res.setHeader('X-Powered-By', 'Next.js');
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // =============================================
  // SERVER STARTUP
  // =============================================

  async function startServer() {
    const redisConnected = await initRedis();

    // Set up Socket.IO Redis adapter for horizontal scaling
    if (redisConnected) {
      try {
        const clients = createPubSubClients();
        if (clients) {
          const { pubClient, subClient } = clients;
          await Promise.all([pubClient.connect(), subClient.connect()]);
          io.adapter(createAdapter(pubClient, subClient));
          console.log('[SOCKET.IO] Redis adapter enabled - horizontal scaling ready');
          io.pubClient = pubClient;
          io.subClient = subClient;
        }
      } catch (error) {
        console.warn('[SOCKET.IO] Could not set up Redis adapter:', error.message);
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
      console.warn('[WORKER POOL] Failed to warm up:', error.message);
    }

    httpServer.listen(PORT, HOST, () => {
      console.log(`> Server ready on http://${HOST}:${PORT}`);
      console.log(`> Socket.IO server ready`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });
  }

  // =============================================
  // GRACEFUL SHUTDOWN
  // =============================================

  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('[SHUTDOWN] Starting graceful shutdown...');

    // Clear all cleanup timers
    console.log(`[SHUTDOWN] Clearing ${cleanupTimers.size} cleanup timers...`);
    for (const timer of cleanupTimers) {
      clearInterval(timer);
    }
    cleanupTimers.clear();

    // Stop accepting new connections
    httpServer.close(() => console.log('[SHUTDOWN] HTTP server closed'));

    // Notify clients
    io.emit('serverShutdown', { reconnectIn: 5000, message: 'Server is restarting' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Shutdown worker pool
    try {
      await wordValidatorPool.shutdown();
      console.log('[SHUTDOWN] Worker pool closed');
    } catch (err) {
      console.error('[SHUTDOWN] Error closing worker pool:', err.message);
    }

    // Close socket connections
    io.close(() => console.log('[SHUTDOWN] Socket.IO server closed'));

    // Clean up Redis adapter clients
    if (io.pubClient) {
      try { await io.pubClient.quit(); console.log('[SHUTDOWN] Redis pub client closed'); }
      catch (err) { console.error('[SHUTDOWN] Error closing pub client:', err.message); }
    }
    if (io.subClient) {
      try { await io.subClient.quit(); console.log('[SHUTDOWN] Redis sub client closed'); }
      catch (err) { console.error('[SHUTDOWN] Error closing sub client:', err.message); }
    }

    await closeRedis();

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

// =============================================
// HELPER: Locale Redirect for Root Path
// =============================================

function handleLocaleRedirect(req, res, parsedUrl) {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();

  // Detect social media crawlers
  const isSocialCrawler = [
    'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot',
    'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
    'pinterest', 'redditbot', 'embedly', 'quora link preview',
    'outbrain', 'vkshare', 'w3c_validator'
  ].some(bot => userAgent.includes(bot));

  // Country-to-locale mapping
  const countryToLocale = {
    IL: 'he', US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en',
    IE: 'en', ZA: 'en', IN: 'en', PH: 'en', SG: 'en',
    SE: 'sv', FI: 'sv', JP: 'ja'
  };
  const supportedLocales = ['he', 'en', 'sv', 'ja'];

  // Determine locale
  let locale = 'he'; // Default

  // Priority 1: Cookie preference
  const cookies = req.headers.cookie;
  const cookieLocale = cookies?.split(';').find(c => c.trim().startsWith('boggle_language='))?.split('=')[1];
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    locale = cookieLocale;
  }
  // Priority 2: IP Geolocation
  else if (req.geoData?.countryCode && countryToLocale[req.geoData.countryCode]) {
    locale = countryToLocale[req.geoData.countryCode];
  }
  // Priority 3: x-country-code header
  else if (req.headers['x-country-code'] && countryToLocale[req.headers['x-country-code']]) {
    locale = countryToLocale[req.headers['x-country-code']];
  }
  // Priority 4: Accept-Language header
  else {
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const browserLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
      if (supportedLocales.includes(browserLang)) {
        locale = browserLang;
      }
    }
  }

  const queryString = parsedUrl.search || '';

  // For social crawlers: rewrite internally
  if (isSocialCrawler) {
    console.log(`[Crawler] Social crawler detected -> rewriting to /${locale}${queryString}`);
    parsedUrl.pathname = `/${locale}`;
    req.url = `/${locale}${queryString}`;
    return false; // Continue to Next.js handler
  }

  // For regular users: redirect
  console.log(`[Redirect] Root path redirect: ${req.url} -> /${locale}${queryString}`);
  res.writeHead(307, { Location: `/${locale}${queryString}` });
  res.end();
  return true; // Request handled
}
