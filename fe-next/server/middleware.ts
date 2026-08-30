/**
 * Express Middleware Configuration
 * Security headers, CORS, and common middleware setup
 */

import crypto from 'crypto';
import path from 'node:path';
import { constants as zlibConstants } from 'zlib';
import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { geolocationMiddleware } from '../backend/utils/geolocation';
import { normalizeAcceptEncoding } from '../lib/http/acceptEncoding';
import { precompressedAssets } from './precompressedAssets';
import { httpLogger, httpLogSerializers } from './logger';
// crazyGamesScriptInjector removed — now rendered via CrazyGamesScriptServer React component

const dev: boolean = process.env.NODE_ENV !== 'production';
const EXPRESS_API_ROUTES: string[] = ['/api/leaderboard', '/api/geolocation', '/api/analytics', '/api/admin', '/api/dictionary', '/api/solve-grid', '/api/single-player', '/api/daily-challenge', '/api/generate-word-hints', '/api/ugc', '/api/presence'];

// Next.js App Router admin POST routes that have NO Express counterpart — they
// fall through `/api/admin` to the Next catch-all and parse JSON themselves via
// `await request.json()`. Express must NOT pre-parse: doing so drains the
// IncomingMessage stream, after which Next's `request.json()` waits forever for
// Content-Length bytes that already left the wire (the await never resolves nor
// rejects, so try/catch + withTimeout cannot rescue it). Add new entries when
// adding Next-only admin POST/PUT/PATCH routes.
const NEXT_ADMIN_BODY_ROUTES: string[] = [
  '/api/admin/send-test-android-beta-launch',
  '/api/admin/send-android-beta-launch-to-player',
  '/api/admin/send-test-android-release-launch',
  '/api/admin/send-android-release-launch-to-player',
  // Bulk "send to all" reads its body via request.json() too — without this it
  // hung on every emailType (latent: was never registered).
  '/api/admin/send-bulk-email',
  '/api/admin/season-reset',
  // Feature flags toggle reads request.json() (was hanging with 408).
  '/api/admin/feature-flags',
  // Curator proposal ratify (admin approves a curator's word edit) reads
  // request.json(). Prefix covers /api/admin/curator-proposals/:id/ratify.
  // NOTE: /api/admin/curators (assignment) is a real Express route now and is
  // intentionally NOT here — it wants Express body parsing.
  '/api/admin/curator-proposals',
  // Teacher-access approve/decline are Next.js POST routes (decline reads
  // request.json(); approve doesn't, but Next still buffers the POST body before
  // invoking the handler, so Express pre-parsing drained the stream → 30s hang →
  // 408). Prefix covers /api/admin/teacher-access/:id/approve|decline. The GET
  // list/export have no body so this is a no-op for them.
  '/api/admin/teacher-access',
  // Connection-puzzle review verdicts (admin marks riddles good/bad/unsure) is a
  // Next.js POST that reads request.json(). Express pre-parsing drained the
  // stream → the save hung → admin "mark bad riddles" silently failed. Prefix
  // covers /api/admin/connections-puzzles/reviews.
  '/api/admin/connections-puzzles',
];

export function shouldExpressParseJsonBody(path: string): boolean {
  const isExpressRoute = EXPRESS_API_ROUTES.some((route) => path.startsWith(route));
  const isNextAdminRoute = NEXT_ADMIN_BODY_ROUTES.some((route) => path.startsWith(route));
  return isExpressRoute && !isNextAdminRoute;
}

// Pre-compiled regexes — avoids recompilation on every HTTP request
const STATIC_ASSET_RE = /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp|avif|mp3|mp4|ogg|wav|gif|webm)$/;
const NON_HTML_ASSET_RE = /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp|avif)$/;

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
          httpLogger.fatal('CORS_ORIGIN=* is not allowed in production. Set explicit origins.');
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
 * Security headers via helmet
 * Replaces manual header-setting with helmet's battle-tested defaults,
 * configured to preserve the project's custom CSP and game-portal embedding.
 */
export function createHelmetMiddleware(isDev: boolean): RequestHandler {
  return helmet({
    // Custom CSP for game portals, analytics, and ad networks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'",
          'https://www.googletagmanager.com', 'https://cdn.lgrckt-in.com',
          'https://cdn.lr-in-prod.com', 'https://cdn.lr-ingest.com',
          'https://sdk.crazygames.com', 'https://*.crazygames.com',
          'https://pagead2.googlesyndication.com',
          'https://*.googleadservices.com', 'https://*.adtrafficquality.google',
          'https://*.doubleclick.net', 'https://*.posthog.com', 'https://eu.i.posthog.com',
          // growth-radar's first-party tracker (gr.js + gr-extended.js), and the Umami SDK it
          // loads. Absent here, BOTH were CSP-blocked on every pageview — the tags were on the
          // page and correct, the requests died with `:: csp`, and lexiclash sent no first-party
          // traffic at all while looking instrumented from the dashboard.
          'https://growthradar.app',
          // Google Identity Services (One Tap / Sign In With Google)
          'https://accounts.google.com/gsi/client',
          // html2canvas, lazy-loaded by the feedback widget at capture time.
          // Without it every screenshot is CSP-blocked and feedback arrives
          // with no visual context. Pinned to one exact file by the widget.
          'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com',
          'https://accounts.google.com/gsi/style'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        // Music + SFX are offloaded to the Supabase Storage CDN (getAssetUrl).
        // Howler streams them via an HTML5 <audio> element, which CSP governs
        // through media-src (NOT connect-src) — without this every track is blocked.
        mediaSrc: ["'self'", 'data:', 'https://*.supabase.co'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://*.supabase.co', 'https://*.sentry.io',
          'https://*.logrocket.io', 'https://*.lr-in-prod.com', 'https://*.lgrckt-in.com',
          'https://*.google-analytics.com', 'https://*.analytics.google.com',
          'https://*.googletagmanager.com', 'https://*.crazygames.com',
          'https://*.googlesyndication.com', 'https://*.doubleclick.net',
          'https://*.googleadservices.com', 'https://*.adtrafficquality.google',
          'https://*.posthog.com', 'https://eu.i.posthog.com',
          // Loading the tracker is not enough — it also has to be allowed to POST what it
          // captures. script-src without connect-src is a tracker that runs and reports nothing.
          'https://growthradar.app',
          // Google Identity Services (One Tap / Sign In With Google)
          'https://accounts.google.com/gsi/',
          'ws:', 'wss:'],
        workerSrc: ["'self'", 'blob:'],
        frameSrc: ["'self'", 'https://*.googlesyndication.com', 'https://*.doubleclick.net',
          'https://googleads.g.doubleclick.net', 'https://*.adtrafficquality.google',
          // Google Identity Services One Tap iframe
          'https://accounts.google.com/gsi/'],
        frameAncestors: ["'self'", 'https://*.crazygames.com', 'https://crazygames.com',
          'https://poki.com', 'https://www.poki.com',
          // Feedback DevTools /preview/:projectId frames this site for element
          // inspection. Mirrors the list in next.config.mjs.
          'https://feedback-devtools.com', 'https://www.feedback-devtools.com'],
      },
    },
    // HSTS only in production
    strictTransportSecurity: isDev ? false : { maxAge: 31536000, includeSubDomains: true },
    // Disable X-Frame-Options — using CSP frame-ancestors instead for game portal embedding
    frameguard: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Helmet extras not in our old manual setup:
    // - X-DNS-Prefetch-Control, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy,
    //   Origin-Agent-Cluster, X-Permitted-Cross-Domain-Policies
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    // Allow cross-origin resources (fonts, images from CDNs)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }) as RequestHandler;
}

/**
 * Permissions-Policy middleware (not covered by helmet)
 */
function permissionsPolicy(): RequestHandler {
  const policy = [
    'camera=()', 'microphone=()', 'geolocation=()', 'payment=()',
    'usb=()', 'magnetometer=()', 'gyroscope=()', 'accelerometer=()',
    'autoplay=(self)', 'fullscreen=(self)', 'picture-in-picture=(self)',
  ].join(', ');

  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Permissions-Policy', policy);
    next();
  };
}


/**
 * Caching headers middleware for static assets
 */
function cacheHeaders(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path;
    
    if (path === '/widget.js' || path === '/sw.js') {
      // Non-fingerprinted entry points that MUST revalidate — a stale cached
      // widget.js silently freezes the feedback button for returning users.
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (path.startsWith('/_next/static/') || STATIC_ASSET_RE.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path === '/api/dictionary-words') {
      // Next.js route handler sets its own long-lived Cache-Control + ETag and
      // serves a 2.8MB payload — stamping no-store here defeats both and forces
      // a full re-download on every visit.
      return next();
    } else if (path.startsWith('/_next/') || EXPRESS_API_ROUTES.some((route) => path.startsWith(route))) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
}

/**
 * Force brotli for every client that accepts it — see normalizeAcceptEncoding
 * in lib/http/acceptEncoding for why the header has to be collapsed rather than
 * merely preferred.
 *
 * Worth it because HTML here is served `no-store` (see the Next 16 fetchCache
 * workaround in app/[locale]/layout.tsx), so every page view re-downloads it:
 * /en is 45.5kB at gzip-6 vs 33.2kB at brotli-5 — ~27% off the critical path
 * for the same ~0.1ms of CPU once warm. Static JS/CSS gains a further 10-17% on
 * first visit, and the render-blocking /i18n/<lang>.<hash>.js catalogue drops
 * from 171kB to 158kB.
 *
 * Any route that inspects Accept-Encoding itself must go through
 * `acceptsEncoding` — a naive `.includes('gzip')` sees the rewritten `br`
 * header, concludes the client wants no compression, and ships the raw body.
 */
export function preferBrotli(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Socket.IO long-polling is excluded from compression entirely (see
    // configureMiddleware) — don't touch its headers either.
    if (!req.url?.startsWith('/socket.io')) {
      const current = req.headers['accept-encoding'];
      if (typeof current === 'string') {
        req.headers['accept-encoding'] = normalizeAcceptEncoding(current) as string;
      }
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
 * - /api/cron/* - Next.js routes with maxDuration (120s+)
 */
export function requestTimeout(): RequestHandler {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

  // Routes that handle their own timeouts (Next.js maxDuration or long-running Express routes)
  const ROUTES_WITH_CUSTOM_TIMEOUT = [
    '/api/cron/',
    // Next.js admin email routes — own per-step timeouts + maxDuration=60.
    // Express adminAuth runs first (~1-2s), then Next route does auth+profile+render+resend
    // (5+5+8+15=33s worst case). The 30s global Express cap fires before Next finishes,
    // returning 408 even though the email send is still in flight.
    '/api/admin/send-test-android-beta-launch',
    '/api/admin/send-android-beta-launch-to-player',
    '/api/admin/android-beta-launch-preview',
    '/api/admin/send-test-android-release-launch',
    '/api/admin/send-android-release-launch-to-player',
    '/api/admin/android-release-launch-preview',
    // Bulk send loops over all eligible users — easily exceeds the 30s global cap.
    '/api/admin/send-bulk-email',
    // Non-critical analytics; route owns a 4s wall-clock cap (see route.ts).
    // Was hanging 30s before its own cap was added — see Railway logs 2026-05-01.
    '/api/analytics/guest-session',
    // The Next image optimizer MUST NOT be capped here. Next de-duplicates
    // concurrent requests for one cache key (href + width + quality + output
    // mime) onto a single in-flight optimization. When this 30s timer fired it
    // answered 408 and destroyed the socket while sharp was still working, and
    // that key's in-flight entry never settled again — every later request for
    // the SAME key awaited a dead promise, hit 30s, and 408'd forever. One slow
    // conversion (a cold boot converting ~13 cube PNGs at once) therefore
    // permanently broke that one variant while every other width stayed fast.
    // Observed 2026-08-16: /modes/cubes/daily.png w=384 and
    // /seasons/season-5-phonic-phenoms.webp w=256 both 408'd on every request
    // with a browser `Accept: image/webp`, but returned 200 in ~0.3s with
    // `Accept: */*` (png passthrough, no conversion) — the daily hero and the
    // season banner rendered with no art on the home hub. Widths differ per
    // viewport/DPR, so each device poisons its own subset of keys.
    '/_next/image',
  ];

  const isDev = process.env.NODE_ENV !== 'production';

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip timeout for routes with custom timeout handling
    const hasCustomTimeout = ROUTES_WITH_CUSTOM_TIMEOUT.some(route =>
      req.path.startsWith(route)
    );

    // In dev, skip timeout for Next.js page routes (first compilation can be slow)
    const isNextPage = isDev && !req.path.startsWith('/api/') && !req.path.startsWith('/_next/');

    if (hasCustomTimeout || isNextPage) {
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
    if (path.startsWith('/_next/') || path.startsWith('/api/') || NON_HTML_ASSET_RE.test(path)) {
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

    // Only redirect in production and for the apex domain.
    // Exempt Android App Links assetlinks.json AND ad-network ownership
    // verification files — those verifiers refuse redirects, so the files
    // must be served directly at the apex host.
    if (
      !dev &&
      host === 'lexiclash.live' &&
      req.path !== '/.well-known/assetlinks.json' &&
      req.path !== '/d41d650cb226c9b4c235.txt'
    ) {
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

  // Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction): void => {
    req.id = req.headers['x-request-id'] as string || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id as string);
    next();
  });

  // Structured HTTP logging (skip health checks)
  app.use(pinoHttp({
    logger: httpLogger,
    autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/health/live' },
    serializers: httpLogSerializers,
  }));

  // WWW redirect (must be first - before other middleware)
  app.use(wwwRedirect());

  // Compression middleware (gzip/brotli)
  // Skip compression for Socket.IO paths to prevent chunked encoding errors
  //
  // ORDER MATTERS: preferBrotli() destructively rewrites Accept-Encoding, so it
  // must sit immediately before compression() — after it, the original client
  // header is gone. Anything inserted below that reads Accept-Encoding sees
  // `br`, not what the browser sent (see app/api/dictionary-words/route.ts).
  app.use(preferBrotli());

  // Must sit after preferBrotli (it reads the normalised header) and before
  // compression (it sets Content-Encoding itself, which compression skips).
  app.use(precompressedAssets([
    { urlPrefix: '/i18n/', dir: path.join(process.cwd(), 'public', 'i18n') },
    { urlPrefix: '/_next/static/', dir: path.join(process.cwd(), '.next', 'static') },
  ]));

  app.use(compression({
    // `compression`'s brotli default is quality 4. Quality 5 is ~6% smaller for
    // the same wall-clock as gzip-6 on our HTML; 11 is 35% smaller but 312ms,
    // far too slow for dynamically rendered responses.
    brotli: { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } },
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

  // CORS
  app.use(cors(createCorsOptions(corsOrigin, isDev)));

  // JSON body parsing - only for Express-handled API routes
  // Next.js App Router API routes handle their own body parsing
  app.use((req: Request, res: Response, next: NextFunction): void => {
    if (shouldExpressParseJsonBody(req.path)) {
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

  // Security headers (helmet + permissions policy)
  app.use(createHelmetMiddleware(isDev));
  app.use(permissionsPolicy());

  // CrazyGames SDK injection — now handled by CrazyGamesScriptServer React component
  // in app/[locale]/layout.tsx to avoid hydration mismatches. The Express middleware
  // injected DOM nodes outside React's tree, causing server/client attribute diffs.
  // Keeping the import for reference; middleware is no longer mounted.

  // IP Geolocation
  // NOTE: '/' is intentionally excluded. The root path is rewritten to a
  // localized page by server/localeRedirect.ts and then rendered by Next.js.
  // Blocking the root on an external ip-api.com lookup (up to 3s, and a
  // hard dependency during Railway cold-start) was making '/' cold TTFB ~30s
  // while '/en' stayed ~2s. Geo is still available on the routes that actually
  // consume it: the geolocation API and analytics API routes.
  app.use(geolocationMiddleware({
    skipPaths: ['/health', '/metrics', '/_next', '/favicon.ico'],
    pathFilter: ['/api/geolocation', '/api/analytics']
  }));
}
