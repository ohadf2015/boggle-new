/**
 * Bun Native Server with Socket.IO
 *
 * Uses @socket.io/bun-engine for native Bun WebSocket performance.
 * Next.js requests are handled via Node.js request/response conversion (no proxy).
 */

import 'dotenv/config';
import { Server as BunEngine } from '@socket.io/bun-engine';
import { Server } from 'socket.io';
import next from 'next';
import { Readable } from 'stream';

import type { IncomingMessage, ServerResponse } from 'http';
import type { Socket } from 'net';

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

// Server readiness state - health endpoint available immediately, full server after init
let serverReady = false;

/**
 * Health check routes
 * Returns 200 even during initialization so Railway healthcheck passes
 */
function handleHealthRoutes(url: URL, origin: string | null): Response | null {
  if (url.pathname === '/health') {
    return jsonResponse({
      status: serverReady ? 'ok' : 'starting',
      ready: serverReady,
      timestamp: Date.now()
    }, 200, { origin });
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
    return null; // Handle async separately
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
 * Convert Bun Request to Node.js IncomingMessage
 */
function createNodeRequest(req: Request, url: URL, clientIP?: string): IncomingMessage {
  const readable = new Readable({
    read() {}
  });

  // Push body data if present
  if (req.body) {
    const reader = req.body.getReader();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            readable.push(null);
            break;
          }
          readable.push(value);
        }
      } catch {
        readable.push(null);
      }
    })();
  } else {
    readable.push(null);
  }

  // Create mock socket with minimal properties Next.js needs
  const mockSocket = {
    remoteAddress: clientIP || '127.0.0.1',
    encrypted: url.protocol === 'https:',
  } as unknown as Socket;

  // Extend readable as IncomingMessage
  const nodeReq = readable as IncomingMessage;
  nodeReq.url = url.pathname + url.search;
  nodeReq.method = req.method;
  nodeReq.headers = {};
  nodeReq.socket = mockSocket;

  // Convert headers
  req.headers.forEach((value, key) => {
    nodeReq.headers[key.toLowerCase()] = value;
  });

  return nodeReq;
}

/**
 * Create a mock ServerResponse that captures the response
 */
function createNodeResponse(): {
  res: ServerResponse;
  getResponse: () => Promise<Response>;
} {
  let statusCode = 200;
  let statusMessage = 'OK';
  const headers: Record<string, string | string[]> = {};
  const chunks: Uint8Array[] = [];
  let resolvePromise: (response: Response) => void;
  let finished = false;

  const responsePromise = new Promise<Response>((resolve) => {
    resolvePromise = resolve;
  });

  // Create a mock response object
  const res = {
    statusCode: 200,
    statusMessage: 'OK',

    setHeader(name: string, value: string | string[]) {
      headers[name.toLowerCase()] = value;
      return this;
    },

    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },

    removeHeader(name: string) {
      delete headers[name.toLowerCase()];
      return this;
    },

    hasHeader(name: string) {
      return name.toLowerCase() in headers;
    },

    writeHead(code: number, message?: string | Record<string, string | string[]>, hdrs?: Record<string, string | string[]>) {
      statusCode = code;
      if (typeof message === 'string') {
        statusMessage = message;
        if (hdrs) {
          Object.entries(hdrs).forEach(([k, v]) => {
            headers[k.toLowerCase()] = v;
          });
        }
      } else if (message) {
        Object.entries(message).forEach(([k, v]) => {
          headers[k.toLowerCase()] = v;
        });
      }
      return this;
    },

    write(chunk: string | Uint8Array) {
      if (typeof chunk === 'string') {
        chunks.push(new TextEncoder().encode(chunk));
      } else {
        chunks.push(chunk);
      }
      return true;
    },

    end(chunk?: string | Uint8Array) {
      if (finished) return this;
      finished = true;

      if (chunk) {
        if (typeof chunk === 'string') {
          chunks.push(new TextEncoder().encode(chunk));
        } else {
          chunks.push(chunk);
        }
      }

      // Convert headers to Headers object
      const responseHeaders = new Headers();
      Object.entries(headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => responseHeaders.append(key, v));
        } else {
          responseHeaders.set(key, value);
        }
      });

      // Combine chunks into body
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const body = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }

      resolvePromise(new Response(body.length > 0 ? body : null, {
        status: statusCode,
        statusText: statusMessage,
        headers: responseHeaders,
      }));

      return this;
    },

    // Additional properties Next.js might access
    finished: false,
    headersSent: false,
    get writableEnded() { return finished; },
    get writableFinished() { return finished; },
  } as unknown as ServerResponse;

  return {
    res,
    getResponse: () => responsePromise,
  };
}

/**
 * Handle Next.js requests by converting to Node.js format
 */
async function handleNextJs(req: Request, url: URL, origin: string | null, clientIP?: string): Promise<Response> {
  try {
    const nodeReq = createNodeRequest(req, url, clientIP);
    const { res: nodeRes, getResponse } = createNodeResponse();

    // Call Next.js handler
    await nextHandler(nodeReq, nodeRes);

    // Get the response from Next.js
    const response = await getResponse();

    // Add security headers
    const headers = new Headers(response.headers);
    addSecurityHeaders(headers);
    addCorsHeaders(headers, origin);
    addCacheHeaders(headers, url.pathname);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Error handling Next.js request:', url.pathname, error);
    return createResponse('Internal Server Error', { status: 500, origin });
  }
}

/**
 * Start the Bun server
 * IMPORTANT: HTTP server starts FIRST for health checks, then heavy initialization happens
 */
async function start(): Promise<void> {
  console.log('🚀 Starting Bun native server with Socket.IO...');

  // Start HTTP server IMMEDIATELY for health checks
  // This ensures Railway healthcheck passes while we initialize
  bunServer = Bun.serve({
    port: PORT,
    hostname: HOST,
    idleTimeout: 30,

    async fetch(req: Request, server): Promise<Response> {
      const url = new URL(req.url);
      const origin = req.headers.get('origin');

      // Health routes ALWAYS work - even during initialization
      const healthResponse = handleHealthRoutes(url, origin);
      if (healthResponse) return healthResponse;

      // Handle preflight
      if (req.method === 'OPTIONS') {
        return handlePreflight(origin);
      }

      // If server not ready yet, return 503 for all other routes
      if (!serverReady) {
        return jsonResponse(
          { error: 'Server is starting up, please retry in a moment' },
          503,
          { origin }
        );
      }

      const clientIP = server.requestIP(req)?.address;

      // WWW redirect
      const wwwRedirect = checkWwwRedirect(req);
      if (wwwRedirect) return wwwRedirect;

      // Socket.IO requests - handle with Bun native WebSocket
      if (url.pathname.startsWith('/socket.io/')) {
        return engine.handleRequest(req, server);
      }

      // Metrics routes (fast path)
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

      // All other requests -> Next.js (direct conversion, no proxy!)
      return handleNextJs(req, url, origin, clientIP);
    },

    // WebSocket handler - will be properly configured after Socket.IO init
    websocket: {
      open() {},
      message() {},
      close() {},
    },
  });

  console.log(`> HTTP server listening on http://${HOST}:${PORT}`);
  console.log(`> Health endpoint available immediately`);

  // Now do the heavy initialization while health checks pass
  console.log('🔄 Initializing server components...');

  // Prepare Next.js
  await nextApp.prepare();
  console.log('✓ Next.js prepared');

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

  // Get the Bun engine handler and reload server with WebSocket support
  const engineHandler = engine.handler();

  // Reload server with proper WebSocket handler
  bunServer.reload({
    fetch: bunServer.fetch,
    websocket: engineHandler.websocket as unknown as Bun.WebSocketHandler<unknown>,
  });

  // Mark server as fully ready
  serverReady = true;
  console.log(`✅ Server fully ready on http://${HOST}:${PORT}`);
  console.log(`> Socket.IO with Bun native WebSocket (no proxy)`);
  console.log(`> Environment: ${dev ? 'development' : 'production'}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    clearCleanupTimers();

    if (io) {
      console.log('Closing Socket.IO connections...');
      io.close();
    }

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
