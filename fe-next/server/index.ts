/**
 * Server Entry Point
 * Orchestrates all server modules for a clean, modular architecture
 *
 * Modules:
 * - middleware.ts - Express middleware (CORS, security headers)
 * - socketSetup.ts - Socket.IO configuration and monitoring
 * - redisAdapter.ts - Redis adapter for horizontal scaling
 * - localeRedirect.ts - i18n locale detection and redirection
 * - healthRoutes.ts - Health check and metrics endpoints
 * - lifecycle.ts - Startup initialization and graceful shutdown
 */

import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import * as http from 'http';
import next from 'next';
import * as url from 'url';

import type { Server as SocketIOServer } from 'socket.io';

// Server modules
import { configureMiddleware } from './middleware';
import { createSocketServer, setupConnectionMonitoring, setupCleanupTimers } from './socketSetup';
import { configureHealthRoutes } from './healthRoutes';
import { handleLocaleRedirect } from './localeRedirect';
import {
  initializeServer,
  setupEventLoopMonitoring,
  createShutdownHandler,
  registerShutdownHandlers
} from './lifecycle';

// Route modules
import adminRoutes from '../backend/routes/admin';
import leaderboardRoutes from '../backend/routes/leaderboard';
import analyticsRoutes from '../backend/routes/analytics';
import geolocationRoutes from '../backend/routes/geolocation';
import dictionaryRoutes from '../backend/routes/dictionary';
import solveGridRoutes from '../backend/routes/solveGrid';
import singlePlayerRoutes from '../backend/routes/singlePlayer';
import dailyChallengeRoutes from '../backend/routes/dailyChallenge';
import aiHintsRoutes from '../backend/routes/aiHints';

// Configuration
const dev: boolean = process.env.NODE_ENV !== 'production';
const PORT: number = parseInt(process.env.PORT || '3001', 10);
const HOST: string = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN: string = process.env.CORS_ORIGIN || '*';

// Initialize Next.js
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();


/**
 * Start the server
 *
 * IMPORTANT: Health endpoint must be available IMMEDIATELY for Railway healthchecks.
 * Next.js preparation can take 60+ seconds, so we start the HTTP server first
 * with a basic health endpoint, then prepare Next.js in parallel.
 */
async function start(): Promise<void> {
  let nextReady = false;

  const app: Application = express();
  const httpServer = http.createServer(app);

  // HTTP server optimizations
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
  httpServer.maxHeadersCount = 2000;

  // Create and configure Socket.IO
  const io = createSocketServer(httpServer, CORS_ORIGIN);
  app.set('io', io);

  // Configure middleware
  configureMiddleware(app, { corsOrigin: CORS_ORIGIN, isDev: dev });

  // Set up Socket.IO monitoring and cleanup
  setupConnectionMonitoring(io);
  setupCleanupTimers(io);

  // Health and metrics routes - available IMMEDIATELY before Next.js prepares
  configureHealthRoutes(app, io);

  // API routes - also available immediately
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dictionary', dictionaryRoutes);
  app.use('/api/solve-grid', solveGridRoutes);
  app.use('/api/single-player', singlePlayerRoutes);
  app.use('/api/daily-challenge', dailyChallengeRoutes);
  app.use('/api', aiHintsRoutes);

  // Next.js request handler (catch-all) - waits for Next.js to be ready
  app.use(async (req: Request, res: Response): Promise<void> => {
    // Return 503 if Next.js isn't ready yet (but health endpoint already works)
    if (!nextReady) {
      res.status(503).json({
        status: 'starting',
        message: 'Server is starting up, please wait...'
      });
      return;
    }

    try {
      const parsedUrl = url.parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle root path locale redirect
      if (pathname === '/') {
        const redirectResult = handleLocaleRedirect(req, res, parsedUrl);
        if (redirectResult) return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('internal server error');
      }
    }
  });

  // Start listening IMMEDIATELY so health endpoint is available
  httpServer.listen(PORT, HOST, () => {
    console.log(`> Server listening on http://${HOST}:${PORT}`);
    console.log(`> Health endpoint available, preparing Next.js...`);
  });

  // Now prepare Next.js (this is the slow part)
  console.log(`> Preparing Next.js...`);
  await nextApp.prepare();
  nextReady = true;
  console.log(`> Next.js ready`);

  // Initialize server components
  await initializeServer(io);

  // Set up event loop monitoring
  setupEventLoopMonitoring();

  // Register shutdown handlers
  const shutdownHandler = createShutdownHandler(httpServer, io);
  registerShutdownHandlers(shutdownHandler);

  console.log(`> Server fully ready`);
  console.log(`> Socket.IO server ready`);
  console.log(`> Environment: ${dev ? 'development' : 'production'}`);
}

// Start the server
start().catch((err: Error) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
