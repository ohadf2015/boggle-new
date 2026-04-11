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

// IMPORTANT: Must be first import - sets up globalThis.AsyncLocalStorage for Next.js 16+
import './preload';

import 'dotenv/config';
import { httpLogger } from './logger';
import express, { Application, Request, Response, NextFunction } from 'express';
import * as http from 'http';
import next from 'next';
import { parse as parseUrl } from 'url';

// Server modules
import { configureMiddleware } from './middleware';
import { createSocketServer, setupConnectionMonitoring, setupCleanupTimers } from './socketSetup';
import { configureHealthRoutes } from './healthRoutes';
import { handleLocaleRedirect } from './localeRedirect';
import { errorHandler, notFoundHandler } from './errorMiddleware';
import { httpRateLimitMiddleware } from '../backend/middleware/rateLimiterRedis';
import {
  initializeServer,
  setupEventLoopMonitoring,
  createShutdownHandler,
  registerShutdownHandlers,
  registerProcessErrorHandlers
} from './lifecycle';

// Route modules
import adminRoutes from '../backend/routes/admin';
import leaderboardRoutes from '../backend/routes/leaderboard';
import analyticsRoutes from '../backend/routes/analytics';
import geolocationRoutes from '../backend/routes/geolocation';
import dictionaryRoutes from '../backend/routes/dictionary';
import solveGridRoutes from '../backend/routes/solveGrid';
import singlePlayerRoutes from '../backend/routes/singlePlayer';
import singlePlayerLeaderboardRoutes from '../backend/routes/singlePlayerLeaderboard';
import dailyChallengeRoutes from '../backend/routes/dailyChallenge';
import aiHintsRoutes from '../backend/routes/aiHints';
// adminGift and adminNotification now mounted inside admin/index.ts for RBAC + rate limiting
import ugcPacksRoutes from '../backend/routes/ugcPacks';
import ugcBoardsRoutes from '../backend/routes/ugcBoards';
import playerProfileRoutes from '../backend/routes/playerProfile';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '../backend/trpc/root';

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

  // Rate limiting for API routes
  app.use('/api', httpRateLimitMiddleware());

  // API routes
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/geolocation', geolocationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dictionary', dictionaryRoutes);
  app.use('/api/solve-grid', solveGridRoutes);
  app.use('/api/single-player', singlePlayerRoutes);
  app.use('/api/single-player', singlePlayerLeaderboardRoutes);
  app.use('/api/daily-challenge', dailyChallengeRoutes);
  app.use('/api/ugc/packs', ugcPacksRoutes);
  app.use('/api/ugc/boards', ugcBoardsRoutes);
  app.use('/api/player-profile', playerProfileRoutes);
  app.use('/api', aiHintsRoutes);

  // tRPC API — type-safe endpoints (alongside existing Express routes)
  app.use('/api/trpc', createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  }));

  // Next.js request handler (catch-all)
  app.use(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedUrl = parseUrl(req.url, true);
      const { pathname } = parsedUrl;

      // Handle root path locale redirect
      if (pathname === '/') {
        const redirectResult = handleLocaleRedirect(req, res, parsedUrl);
        if (redirectResult) return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      // Pass to error handler instead of handling inline
      next(err);
    }
  });

  // 404 handler (must be after all routes)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  // Register process-level error handlers (must be early)
  registerProcessErrorHandlers();

  // Initialize server components BEFORE listening — ensures Redis, dictionaries,
  // and Socket.IO adapter are ready before Railway routes traffic to this container.
  await initializeServer(io);

  // Set up event loop monitoring
  setupEventLoopMonitoring();

  // Register shutdown handlers
  const shutdownHandler = createShutdownHandler(httpServer, io);
  registerShutdownHandlers(shutdownHandler);

  // Start listening AFTER initialization is complete
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, HOST, () => {
      httpLogger.info({ host: HOST, port: PORT, env: dev ? 'development' : 'production' }, 'Server ready');
      resolve();
    });
  });
}

// Start the server
start().catch((err: Error) => {
  httpLogger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
