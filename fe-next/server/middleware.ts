/**
 * Express Middleware Configuration
 * Security headers, CORS, and common middleware setup
 */

import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import { geolocationMiddleware } from '../backend/utils/geolocation';

const dev: boolean = process.env.NODE_ENV !== 'production';
const EXPRESS_API_ROUTES: string[] = ['/api/leaderboard', '/api/geolocation', '/api/analytics', '/api/admin', '/api/dictionary', '/api/solve-grid', '/api/single-player', '/api/daily-challenge', '/api/generate-word-hints'];

/**
 * Middleware configuration options
 */
export interface MiddlewareOptions {
  corsOrigin: string;
  isDev: boolean;
}

/**
 * Configure CORS options based on environment
 * @param corsOrigin - CORS_ORIGIN environment variable
 * @param isDev - Whether running in development mode
 * @returns CORS configuration
 */
export function createCorsOptions(corsOrigin: string, isDev: boolean): CorsOptions {
  return {
    origin: (() => {
      if (corsOrigin === '*') {
        if (!isDev) {
          console.error('FATAL: CORS_ORIGIN=* is not allowed in production. Set explicit origins.');
          return false;
        }
        return true;
      }
      return corsOrigin.split(',');
    })(),
    credentials: true
  };
}

/**
 * Security headers middleware
 * @param isDev - Whether running in development mode
 * @returns Express middleware
 */
export function securityHeaders(isDev: boolean): RequestHandler {
  const cspDev = "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://pagead2.googlesyndication.com https://imasdk.googleapis.com https://*.googleadservices.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.googlesyndication.com https://*.doubleclick.net https://*.googleadservices.com ws: wss:; " +
    "worker-src 'self' blob:; " +
    "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://googleads.g.doubleclick.net; " +
    "frame-ancestors 'none';";

  const cspProd = "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://pagead2.googlesyndication.com https://imasdk.googleapis.com https://*.googleadservices.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.googlesyndication.com https://*.doubleclick.net https://*.googleadservices.com ws: wss:; " +
    "worker-src 'self' blob:; " +
    "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://googleads.g.doubleclick.net; " +
    "frame-ancestors 'none';";

  // Permissions-Policy: Restrict browser features not needed by the game
  // Allows: fullscreen (for immersive gameplay), autoplay (for game sounds)
  // Denies: camera, microphone, geolocation, payment, usb, etc.
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'autoplay=(self)',
    'fullscreen=(self)',
    'picture-in-picture=(self)',
  ].join(', ');

  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Content-Security-Policy', isDev ? cspDev : cspProd);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', permissionsPolicy);

    if (!isDev) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  };
}

/**
 * Request logging middleware (conditional based on environment)
 */
function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (dev || process.env.ENABLE_REQUEST_LOGGING === 'true') {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[Request] ${req.method} ${req.url} | ${res.statusCode} | ${duration}ms`);
      });
    }
    next();
  };
}

/**
 * Caching headers middleware for static assets
 */
function cacheHeaders(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path;
    
    if (path.startsWith('/_next/static/') || path.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp|avif)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path.startsWith('/_next/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (EXPRESS_API_ROUTES.some((route) => path.startsWith(route))) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
}

/**
 * Request timeout middleware
 *
 * IMPORTANT: Next.js App Router routes (app/api/*) have their own timeout
 * configuration via `export const maxDuration`. We should NOT apply Express
 * timeout to these routes to avoid conflicts.
 *
 * Routes excluded from Express timeout:
 * - /api/admin/buzz/* - Next.js routes with maxDuration (60-70s)
 * - /api/cron/* - Next.js routes with maxDuration (120s+)
 */
function requestTimeout(): RequestHandler {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

  // Routes that handle their own timeouts (Next.js maxDuration or long-running Express routes)
  const ROUTES_WITH_CUSTOM_TIMEOUT = [
    '/api/admin/buzz/',
    '/api/cron/',
    '/api/buzz/admin/',  // Express route for buzz admin operations (AI generation takes 60-90s)
  ];

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip timeout for routes with custom timeout handling
    const hasCustomTimeout = ROUTES_WITH_CUSTOM_TIMEOUT.some(route =>
      req.path.startsWith(route)
    );

    if (hasCustomTimeout) {
      // Let the route handle its own timeout (Next.js maxDuration or internal timeout)
      next();
      return;
    }

    // Apply Express timeout for routes without custom timeout handling
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

function perfVariantCookie(isDev: boolean): RequestHandler {
  const maxAgeSeconds = 60 * 60 * 24 * 30;
  const rolloutPercent = Math.max(0, Math.min(100, parseInt(process.env.PERF_VARIANT_PERCENT || '100', 10)));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const accept = req.headers.accept || '';
    const isHtml = accept.includes('text/html');
    if (!isHtml) {
      next();
      return;
    }

    const path = req.path;
    if (path.startsWith('/_next/') || path.startsWith('/api/') || path.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp|avif)$/)) {
      next();
      return;
    }

    // Use a fixed base URL - we only need the pathname and query params, not the actual host
    const url = new URL(req.originalUrl, 'http://localhost');
    const override = url.searchParams.get('perf_variant');
    const cookiesHeader = req.headers.cookie || '';
    const hasVariant = /(?:^|;\s*)perf_variant=/.test(cookiesHeader);

    let variant: string | null = null;
    if (override === 'control' || override === 'perf_v1') {
      variant = override;
    } else if (!hasVariant) {
      variant = Math.random() * 100 < rolloutPercent ? 'perf_v1' : 'control';
    }

    if (variant) {
      res.cookie('perf_variant', variant, {
        httpOnly: false,
        secure: !isDev,
        sameSite: 'lax',
        maxAge: maxAgeSeconds * 1000,
        path: '/',
      });
    }

    next();
  };
}

/**
 * WWW redirect middleware
 * Redirects non-www to www in production for consistent URLs
 */
function wwwRedirect(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const host = req.get('host') || '';

    // Only redirect in production and for the apex domain
    if (!dev && host === 'lexiclash.live') {
      const redirectUrl = `https://www.lexiclash.live${req.originalUrl}`;
      res.redirect(301, redirectUrl);
      return;
    }

    next();
  };
}

/**
 * Configure all middleware on Express app
 * @param app - Express application instance
 * @param options - Configuration options
 */
export function configureMiddleware(app: Application, { corsOrigin, isDev }: MiddlewareOptions): void {
  // Disable x-powered-by header
  app.disable('x-powered-by');

  // WWW redirect (must be first - before other middleware)
  app.use(wwwRedirect());

  // Compression middleware (gzip/brotli)
  // Skip compression for Socket.IO paths to prevent chunked encoding errors
  app.use(compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Skip compression for Socket.IO long-polling requests
      // Prevents ERR_INCOMPLETE_CHUNKED_ENCODING errors
      if (req.url?.startsWith('/socket.io')) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: isDev ? 1 : 6,
    threshold: 1024
  }));

  // Request logging (conditional)
  app.use(requestLogger());

  // CORS
  app.use(cors(createCorsOptions(corsOrigin, isDev)));

  // JSON body parsing - only for Express-handled API routes
  // Next.js App Router API routes handle their own body parsing
  app.use((req: Request, res: Response, next: NextFunction): void => {
    const isExpressRoute = EXPRESS_API_ROUTES.some(route => req.path.startsWith(route));
    if (isExpressRoute) {
      express.json({ limit: '1mb', strict: true })(req, res, next);
      return;
    }
    next();
  });

  // Request timeout
  app.use(requestTimeout());

  // Caching headers
  app.use(cacheHeaders());

  app.use(perfVariantCookie(isDev));

  // Security headers
  app.use(securityHeaders(isDev));

  // IP Geolocation
  app.use(geolocationMiddleware({
    skipPaths: ['/health', '/metrics', '/_next', '/favicon.ico'],
    pathFilter: ['/', '/api/geolocation', '/api/analytics']
  }));
}
