/**
 * Server Entry Point
 * Orchestrates all server modules for a clean, modular architecture
 *
 * Modules:
 * - middleware.js - Express middleware (CORS, security headers)
 * - socketSetup.js - Socket.IO configuration and monitoring
 * - redisAdapter.js - Redis adapter for horizontal scaling
 * - localeRedirect.js - i18n locale detection and redirection
 * - healthRoutes.js - Health check and metrics endpoints
 * - lifecycle.js - Startup initialization and graceful shutdown
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const next = require('next');

// Server modules
const { configureMiddleware } = require('./middleware');
const { createSocketServer, setupConnectionMonitoring, setupCleanupTimers } = require('./socketSetup');
const { configureHealthRoutes } = require('./healthRoutes');
const { handleLocaleRedirect } = require('./localeRedirect');
const {
  initializeServer,
  setupEventLoopMonitoring,
  createShutdownHandler,
  registerShutdownHandlers
} = require('./lifecycle');

// Route modules
const adminRoutes = require('../backend/routes/admin');
const leaderboardRoutes = require('../backend/routes/leaderboard');
const analyticsRoutes = require('../backend/routes/analytics');
const geolocationRoutes = require('../backend/routes/geolocation');

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize Next.js
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

/**
 * Start the server
 */
async function start() {
  await nextApp.prepare();

  const app = express();
  const httpServer = http.createServer(app);

  // Create and configure Socket.IO
  const io = createSocketServer(httpServer, CORS_ORIGIN);
  app.set('io', io);

  // Configure middleware
  configureMiddleware(app, { corsOrigin: CORS_ORIGIN, isDev: dev });

  // Set up Socket.IO monitoring and cleanup
  setupConnectionMonitoring(io);
  setupCleanupTimers(io);

  // Health and metrics routes
  configureHealthRoutes(app, io);

  // API routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);

  // Next.js request handler (catch-all)
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

  // Initialize server components
  await initializeServer(io);

  // Set up event loop monitoring
  setupEventLoopMonitoring();

  // Register shutdown handlers
  const shutdownHandler = createShutdownHandler(httpServer, io);
  registerShutdownHandlers(shutdownHandler);

  // Start listening
  httpServer.listen(PORT, HOST, () => {
    console.log(`> Server ready on http://${HOST}:${PORT}`);
    console.log(`> Socket.IO server ready`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
  });
}

// Start the server
start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
