// server.js - Socket.IO Server
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const next = require("next");
const cors = require("cors");

// Backend imports
const { initRedis, closeRedis } = require("./backend/redisClient");
const dictionary = require("./backend/dictionary");
const { initializeSocketHandlers } = require("./backend/socketHandlers");
const { restoreTournamentsFromRedis } = require("./backend/modules/tournamentManager");
const { cleanupStaleGames } = require("./backend/modules/gameStateManager");

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
    // Content Security Policy
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';"
    );

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

  // Log connection stats periodically
  setInterval(() => {
    const socketCount = io.sockets.sockets.size;
    if (socketCount > 0) {
      console.log(`[SOCKET.IO] Active connections: ${socketCount}`);
    }
  }, 60000);

  // Cleanup stale games periodically
  setInterval(() => {
    const cleaned = cleanupStaleGames();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} stale games`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Next.js handler for all other routes
  server.use(async (req, res) => {
    try {
      const parsedUrl = require('url').parse(req.url, true);
      const { pathname, query } = parsedUrl;

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

        res.writeHead(307, { Location: `/${locale}` });
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
    await initRedis();

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

    httpServer.listen(PORT, HOST, () => {
      console.log(`> Server ready on http://${HOST}:${PORT}`);
      console.log(`> Socket.IO server ready`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Closing server...');

    // Close all socket connections
    io.close(() => {
      console.log('Socket.IO server closed');
    });

    await closeRedis();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  startServer();
});
