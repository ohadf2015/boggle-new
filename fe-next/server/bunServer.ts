/**
 * Bun Native Server with Socket.IO
 *
 * Uses @socket.io/bun-engine for native Bun WebSocket performance.
 * Next.js runs on an internal HTTP server and requests are proxied.
 */

import 'dotenv/config';
import { createServer } from 'http';
import { Server as BunEngine } from '@socket.io/bun-engine';
import { Server } from 'socket.io';
import next from 'next';
import express from 'express';

import type { Application } from 'express';

// Socket handlers and lifecycle
import { initializeSocketHandlers } from '../backend/socketHandlers';
import { setupRedisAdapter, ExtendedSocketServer } from './redisAdapter';
import {
  initializeServer,
  setupEventLoopMonitoring,
} from './lifecycle';
import { setupConnectionMonitoring, setupCleanupTimers, clearCleanupTimers } from './socketSetup';

// Middleware utilities
import { createCorsOptions } from './middleware';
import { isRedisAvailable, getRedisMetrics } from '../backend/redisClient';
import { getAllGames } from '../backend/modules/gameStateManager';
import { getMetrics, getRoomMetrics, resetAll } from '../backend/utils/metrics';

// Configuration
const dev: boolean = process.env.NODE_ENV !== 'production';
const PORT: number = parseInt(process.env.PORT || '3001', 10);
const HOST: string = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN: string = process.env.CORS_ORIGIN || '*';
const INTERNAL_PORT = 3002; // Internal Next.js server port

// Initialize Next.js
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

// CSP Headers
const cspDev = "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://pagead2.googlesyndication.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "img-src 'self' data: https: blob:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ws: wss:;" +
  "worker-src 'self' blob:; " +
  "frame-ancestors 'none';";

const cspProd = "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://pagead2.googlesyndication.com; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "img-src 'self' data: https: blob:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ws: wss:;" +
  "worker-src 'self' blob:; " +
  "frame-ancestors 'none';";

/**
 * Add security headers to response
 */
function addSecurityHeaders(headers: Headers): void {
  headers.set('Content-Security-Policy', dev ? cspDev : cspProd);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (!dev) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(headers: Headers, origin: string | null): void {
  const corsOptions = createCorsOptions(CORS_ORIGIN, dev);

  if (corsOptions.origin === true) {
    headers.set('Access-Control-Allow-Origin', origin || '*');
  } else if (Array.isArray(corsOptions.origin) && origin && corsOptions.origin.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  if (corsOptions.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

/**
 * Add cache headers based on path
 */
function addCacheHeaders(headers: Headers, path: string): void {
  if (path.startsWith('/_next/static/') || path.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp|avif)$/)) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (path.startsWith('/_next/') || path.startsWith('/api/')) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
  }
}

/**
 * Create response with standard headers
 */
function createResponse(body: BodyInit | null, init: ResponseInit & { path?: string; origin?: string | null } = {}): Response {
  const headers = new Headers(init.headers);

  addSecurityHeaders(headers);
  addCorsHeaders(headers, init.origin || null);
  if (init.path) {
    addCacheHeaders(headers, init.path);
  }

  return new Response(body, { ...init, headers });
}

/**
 * JSON response helper
 */
function jsonResponse(data: unknown, status = 200, options: { path?: string; origin?: string | null } = {}): Response {
  return createResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
}

// Socket.IO server instance (will be initialized in start())
let io: ExtendedSocketServer;
let engine: BunEngine;
let bunServer: ReturnType<typeof Bun.serve>;
let internalServer: ReturnType<typeof createServer>;

/**
 * Health check routes
 */
function handleHealthRoutes(url: URL, origin: string | null): Response | null {
  if (url.pathname === '/health') {
    return jsonResponse({ status: 'ok', timestamp: Date.now() }, 200, { origin });
  }

  if (url.pathname === '/health/scaling') {
    const games = getAllGames();
    return jsonResponse({
      status: 'ok',
      scaling: {
        horizontalReady: !!io?.pubClient && isRedisAvailable(),
        redisAdapter: !!io?.pubClient,
        redisAvailable: isRedisAvailable(),
        instanceId: process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || 'local'
      },
      stats: {
        activeGames: games.length,
        totalPlayers: games.reduce((sum, g) => sum + (g as { playerCount: number }).playerCount, 0),
        socketConnections: io?.sockets?.sockets?.size || 0
      },
      timestamp: Date.now()
    }, 200, { origin });
  }

  return null;
}

/**
 * Metrics routes
 */
function handleMetricsRoutes(url: URL, origin: string | null): Response | null {
  if (url.pathname === '/metrics') {
    return jsonResponse(getMetrics(), 200, { origin });
  }

  if (url.pathname === '/metrics/rooms') {
    return jsonResponse(getRoomMetrics(), 200, { origin });
  }

  if (url.pathname === '/metrics/reset') {
    resetAll();
    return jsonResponse({ ok: true }, 200, { origin });
  }

  if (url.pathname === '/metrics/redis') {
    // This is async, handle separately
    return null;
  }

  return null;
}

/**
 * WWW redirect check
 */
function checkWwwRedirect(req: Request): Response | null {
  if (!dev) {
    const host = req.headers.get('host') || '';
    if (host === 'lexiclash.live') {
      const url = new URL(req.url);
      return Response.redirect(`https://www.lexiclash.live${url.pathname}${url.search}`, 301);
    }
  }
  return null;
}

/**
 * Handle OPTIONS preflight requests
 */
function handlePreflight(origin: string | null): Response {
  const headers = new Headers();
  addCorsHeaders(headers, origin);
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

/**
 * Proxy request to internal Next.js server
 */
async function proxyToNextJs(req: Request, url: URL, origin: string | null): Promise<Response> {
  try {
    // Build internal URL
    const internalUrl = `http://127.0.0.1:${INTERNAL_PORT}${url.pathname}${url.search}`;

    // Forward the request to internal Next.js server
    const proxyReq: RequestInit = {
      method: req.method,
      headers: req.headers,
    };

    // Include body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      proxyReq.body = req.body;
      // duplex is needed for streaming bodies in Bun
      (proxyReq as RequestInit & { duplex?: string }).duplex = 'half';
    }

    const proxyResponse = await fetch(internalUrl, proxyReq);

    // Add security headers to proxied response
    const headers = new Headers(proxyResponse.headers);
    addSecurityHeaders(headers);
    addCorsHeaders(headers, origin);
    addCacheHeaders(headers, url.pathname);

    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers
    });
  } catch (error) {
    console.error('Error proxying to Next.js:', url.pathname, error);
    return createResponse('Internal Server Error', { status: 500, origin });
  }
}

/**
 * Start the Bun server
 */
async function start(): Promise<void> {
  console.log('🚀 Starting Bun native server with Socket.IO...');

  // Prepare Next.js
  await nextApp.prepare();
  console.log('✓ Next.js prepared');

  // Create internal Express + Next.js server
  const expressApp: Application = express();
  expressApp.all('*', (req, res) => nextHandler(req, res));
  internalServer = createServer(expressApp);

  await new Promise<void>((resolve) => {
    internalServer.listen(INTERNAL_PORT, '127.0.0.1', () => {
      console.log(`✓ Internal Next.js server ready on port ${INTERNAL_PORT}`);
      resolve();
    });
  });

  // Create Socket.IO with Bun engine
  io = new Server() as ExtendedSocketServer;
  engine = new BunEngine({
    path: '/socket.io/',
    cors: {
      origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.bind(engine);
  console.log('✓ Socket.IO bound to Bun native engine');

  // Initialize socket handlers
  initializeSocketHandlers(io);
  console.log('✓ Socket handlers initialized');

  // Set up Redis adapter if available
  await setupRedisAdapter(io);

  // Set up monitoring and cleanup
  setupConnectionMonitoring(io);
  setupCleanupTimers(io);

  // Initialize server components (dictionary, validators, tournaments)
  await initializeServer(io);
  console.log('✓ Server components initialized');

  // Set up event loop monitoring
  setupEventLoopMonitoring();

  // Get the Bun engine handler
  const engineHandler = engine.handler();

  // Create Bun server
  bunServer = Bun.serve({
    port: PORT,
    hostname: HOST,
    idleTimeout: 30, // Must be > pingInterval (25s)

    async fetch(req: Request, server): Promise<Response> {
      const url = new URL(req.url);
      const origin = req.headers.get('origin');

      // WWW redirect
      const wwwRedirect = checkWwwRedirect(req);
      if (wwwRedirect) return wwwRedirect;

      // Handle preflight
      if (req.method === 'OPTIONS') {
        return handlePreflight(origin);
      }

      // Socket.IO requests - handle with Bun native WebSocket
      if (url.pathname.startsWith('/socket.io/')) {
        return engine.handleRequest(req, server);
      }

      // Health routes
      const healthResponse = handleHealthRoutes(url, origin);
      if (healthResponse) return healthResponse;

      // Metrics routes
      const metricsResponse = handleMetricsRoutes(url, origin);
      if (metricsResponse) return metricsResponse;

      // Async metrics/redis
      if (url.pathname === '/metrics/redis') {
        try {
          const metrics = await getRedisMetrics();
          return jsonResponse(metrics, 200, { origin });
        } catch (error) {
          return jsonResponse({ error: (error as Error).message }, 500, { origin });
        }
      }

      // All other requests -> proxy to internal Next.js server
      return proxyToNextJs(req, url, origin);
    },

    // The bun-engine websocket handler is compatible with Bun.serve
    websocket: engineHandler.websocket as unknown as Bun.WebSocketHandler<unknown>,
  });

  console.log(`> Server ready on http://${HOST}:${PORT}`);
  console.log(`> Socket.IO with Bun native WebSocket engine`);
  console.log(`> Environment: ${dev ? 'development' : 'production'}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Clear cleanup timers
    clearCleanupTimers();

    // Close Socket.IO connections
    if (io) {
      console.log('Closing Socket.IO connections...');
      io.close();
    }

    // Stop internal server
    if (internalServer) {
      console.log('Stopping internal Next.js server...');
      internalServer.close();
    }

    // Stop Bun server
    if (bunServer) {
      console.log('Stopping Bun server...');
      bunServer.stop();
    }

    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
start().catch((err: Error) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
