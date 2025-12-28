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
 */
async function start(): Promise<void> {
  await nextApp.prepare();

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

  // Health and metrics routes
  configureHealthRoutes(app, io);

  // API routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dictionary', dictionaryRoutes);
  app.use('/api/solve-grid', solveGridRoutes);
  app.use('/api/single-player', singlePlayerRoutes);
  app.use('/api/daily-challenge', dailyChallengeRoutes);
  app.use('/api', aiHintsRoutes);

  // Next.js request handler (catch-all)
  app.use(async (req: Request, res: Response): Promise<void> => {
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
start().catch((err: Error) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
