/**
 * Express Middleware Configuration
 * Security headers, CORS, and common middleware setup
 */

import compression from 'compression';
import cors from 'cors';
import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import { geolocationMiddleware } from '../backend/utils/geolocation';

import type { CorsOptions } from 'cors';

const dev: boolean = process.env.NODE_ENV !== 'production';

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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ws: wss:;" +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'none';";

  const cspProd = "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ws: wss:;" +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'none';";

  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Content-Security-Policy', isDev ? cspDev : cspProd);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

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
    } else if (path.startsWith('/_next/') || path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
}

/**
 * Request timeout middleware
 */
function requestTimeout(): RequestHandler {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
  
  return (req: Request, res: Response, next: NextFunction): void => {
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
  app.use(compression({
    filter: (req: Request, res: Response) => {
      if (req.headers['x-no-compression']) {
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
  const expressApiRoutes: string[] = ['/api/leaderboard', '/api/geolocation', '/api/analytics', '/api/admin', '/api/dictionary', '/api/solve-grid', '/api/single-player', '/api/daily-challenge', '/api/generate-word-hints'];
  app.use((req: Request, res: Response, next: NextFunction): void => {
    const isExpressRoute = expressApiRoutes.some(route => req.path.startsWith(route));
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

  // Security headers
  app.use(securityHeaders(isDev));

  // IP Geolocation
  app.use(geolocationMiddleware({
    skipPaths: ['/health', '/metrics', '/_next', '/favicon.ico'],
    pathFilter: ['/', '/api/geolocation', '/api/analytics']
  }));
}
