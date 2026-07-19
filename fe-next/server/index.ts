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
import { withBootTimeout } from './bootTimeout';
import { sendOpsAlert } from '../backend/modules/notificationService';
import { startMemoryWatchdog } from '../backend/modules/memoryWatchdog';

// Route modules
import adminRoutes from '../backend/routes/admin';
import leaderboardRoutes from '../backend/routes/leaderboard';
import analyticsRoutes from '../backend/routes/analytics';
import geolocationRoutes from '../backend/routes/geolocation';
import dictionaryRoutes from '../backend/routes/dictionary';
import solveGridRoutes from '../backend/routes/solveGrid';
import singlePlayerRoutes from '../backend/routes/singlePlayer';
import singlePlayerLeaderboardRoutes from '../backend/routes/singlePlayerLeaderboard';
import presenceRoutes from '../backend/routes/presence';
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

  // Liveness probe — must be ahead of helmet/compression/CORS so a future
  // middleware regression can never make Railway probes flaky. Stays trivial
  // (sync JSON, no deps); /health/ready in healthRoutes.ts owns the full
  // dependency check.
  app.get('/health/live', (_req: Request, res: Response): void => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

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
  app.use('/api/presence', presenceRoutes);
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

  // SEO file bypass - handle directly via Express to avoid Next.js catch-all interference
  app.get('/sitemap.xml', async (req, res, next) => {
    try {
      const sitemapModule = await import('../app/sitemap');
      const routes = sitemapModule.default();
      
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
      
      for (const route of routes) {
        xml += '  <url>\n';
        xml += `    <loc>${route.url}</loc>\n`;
        if (route.lastModified) xml += `    <lastmod>${route.lastModified}</lastmod>\n`;
        if (route.changeFrequency) xml += `    <changefreq>${route.changeFrequency}</changefreq>\n`;
        if (route.priority) xml += `    <priority>${route.priority}</priority>\n`;
        if (route.alternates?.languages) {
          for (const [lang, url] of Object.entries(route.alternates.languages)) {
            xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${url}" />\n`;
          }
        }
        xml += '  </url>\n';
      }
      xml += '</urlset>';
      
      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      httpLogger.error({ err }, 'Failed to generate sitemap.xml');
      next(err);
    }
  });

  app.get('/robots.txt', async (req, res, next) => {
    try {
      const robotsModule = await import('../app/robots');
      const config = robotsModule.default();
      
      let txt = '';
      if (config.rules) {
        const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
        for (const rule of rules) {
          const uas = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
          for (const ua of uas) txt += `User-agent: ${ua}\n`;
          
          if (rule.allow) {
            const allows = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
            for (const allow of allows) txt += `Allow: ${allow}\n`;
          }
          if (rule.disallow) {
            const disallows = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
            for (const disallow of disallows) txt += `Disallow: ${disallow}\n`;
          }
          txt += '\n';
        }
      }
      if (config.sitemap) {
        const sitemaps = Array.isArray(config.sitemap) ? config.sitemap : [config.sitemap];
        for (const s of sitemaps) txt += `Sitemap: ${s}\n`;
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(txt);
    } catch (err) {
      httpLogger.error({ err }, 'Failed to generate robots.txt');
      next(err);
    }
  });

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
  // Guarded by an aggregate watchdog: if any single step hangs (e.g. a wedged
  // dictionary load or worker-pool init that has no finer timeout of its own),
  // we still bind the port in degraded mode rather than never listening — which
  // would fail Railway's healthcheck forever and put the container in a
  // kill→restart→hang crash-loop. Default 25s sits under Railway's 30s
  // healthcheckTimeout so the port binds inside the healthcheck window.
  const INIT_TIMEOUT_MS = parseInt(process.env.SERVER_INIT_TIMEOUT_MS || '25000', 10);
  const bootedDegraded = await withBootTimeout('Server initialization', initializeServer(io), INIT_TIMEOUT_MS);
  if (bootedDegraded) {
    void sendOpsAlert(
      `🟠 lexiclash boggle-new: booted in DEGRADED mode — server init exceeded ${INIT_TIMEOUT_MS}ms. Port bound so the liveness probe answers, but Redis/dictionary/adapter may be partial.`,
    );
  }

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

  // Warn to Telegram before an OOM-kill (2026-07-19: silent SIGKILL at the
  // ~2560MB cgroup limit after a slow leak → 53min outage). Early warning buys
  // time to act while there's still headroom.
  startMemoryWatchdog();
}

// Start the server
start().catch((err: Error) => {
  httpLogger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
