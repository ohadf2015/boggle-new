import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const pkg = createRequire(import.meta.url)('./package.json');

const withNextIntl = createNextIntlPlugin();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundle analyzer - only loaded when ANALYZE=true (devDependency, not available in production)
let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === 'true') {
  try {
    const { default: bundleAnalyzer } = await import('@next/bundle-analyzer');
    withBundleAnalyzer = bundleAnalyzer({ enabled: true });
  } catch {
    console.warn('Bundle analyzer not available - install @next/bundle-analyzer');
  }
}

// Check if this is a preview/staging environment (explicitly set or PR preview)
// Only block indexing when NEXT_PUBLIC_IS_PREVIEW is explicitly true or when it's a PR preview
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
  process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

// CrazyGames SDK auto-detects iframe context at runtime.
// Set NEXT_PUBLIC_CRAZYGAMES_ENABLED=false to force-disable.
const isCrazyGamesForceDisabled = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build output dir. Default '.next'. The nightly improvement loop overrides it
  // via NEXT_BUILD_DIR=.next-nightly so its `next build` writes to a separate dir
  // and can NEVER collide with a running `npm run dev` server (which continuously
  // writes .next) — that shared-cache race produced phantom Avatar SSR build
  // errors and failed the nightly gate on 2026-05-20. Dev and Railway prod leave
  // NEXT_BUILD_DIR unset → '.next', so their behaviour is unchanged.
  distDir: process.env.NEXT_BUILD_DIR || '.next',

  // Skip next-build's OWN "Running TypeScript" phase ONLY in the nightly gate
  // (NIGHTLY_SKIP_NEXT_TS=1). That phase type-checks the build's GENERATED route
  // types (.next-nightly/types/**) and is 18x+ slower than a standalone
  // `tsc --noEmit` — worse, it streams NO output for 15-30min, tripping the gate's
  // 900s idle watchdog → tests-inconclusive on 4 of 7 nights (06-21/24/25/27, all
  // wedged here, the test phase never even ran). The gate now runs `tsc --noEmit`
  // (≈54s, the SAME type verdict) before build:fast and skips this redundant phase.
  // next build still compiles webpack, so import/module breakage is still caught.
  // Prod (`npm run build` on Railway) NEVER sets this env → full TS checking stays
  // as the backstop, including generated-route-type conformance.
  typescript: {
    ignoreBuildErrors: process.env.NIGHTLY_SKIP_NEXT_TS === '1',
  },

  // Standalone output for minimal Docker images.
  // The custom Express server is bundled separately by esbuild (dist/server.cjs),
  // so standalone's server.js is unused — we only want the minimal node_modules.
  output: 'standalone',

  // Disable Next.js built-in compression — Express compression middleware handles it.
  // This allows the CrazyGames SDK injector (server/crazyGamesInjector.ts) to intercept
  // uncompressed HTML before Express compresses it. Without this, Next.js compresses
  // the response internally and the injector can't find <head> to inject into.
  compress: false,

  // Force-include server-side packages that Next.js trace can miss
  // (native addons, dynamic requires, data files, etc.)
  outputFileTracingIncludes: {
    '/**': [
      './backend/*.txt',
      './backend/data/dateThemedWords.js',
      './node_modules/socket.io/**',
      './node_modules/@socket.io/**',
      './node_modules/ioredis/**',
      './node_modules/express/**',
      './node_modules/cors/**',
      './node_modules/compression/**',
      './node_modules/dotenv/**',
      './node_modules/node-cron/**',
      './node_modules/@sentry/**',
      './node_modules/@supabase/**',
      './node_modules/an-array-of-english-words/**',
      './node_modules/an-array-of-spanish-words/**',
      './node_modules/@arvidbt/**',
      './node_modules/bad-words/**',
      './node_modules/resend/**',
      './node_modules/@google-cloud/**',
      './node_modules/google-auth-library/**',

      './node_modules/zod/**',
    ],
  },

  // Mark server-only word dictionary packages as Node.js externals so Turbopack
  // never walks their import trees into client bundles. Without this, Turbopack's
  // static analysis bundles @arvidbt/swedish-words (~6MB) into static/chunks even
  // though no client component imports it directly.
  serverExternalPackages: [
    '@arvidbt/swedish-words',
    'an-array-of-english-words',
    'an-array-of-spanish-words',
  ],

  // Enable system TLS certs for Turbopack to fetch Google Fonts
  // optimizePackageImports automatically tree-shakes common packages like lucide-react
  // React Compiler — auto-memoizes all components (replaces Million.js)
  reactCompiler: true,

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
    ],
  },

  // Transpile packages to fix HMR/ESM issues with Turbopack
  // - @supabase/ssr: Fix "module is not defined" error (CommonJS/ESM interop)
  // - date-fns: Fix "module is not defined" on mobile browsers (JAVASCRIPT-NEXTJS-9S, 9Z, 19)
  // - framer-motion: Fix CommonJS/ESM interop issues on student pages
  // - react-hot-toast: Fix "module is not defined" in practice/education components (JAVASCRIPT-NEXTJS-9S, 9Z)
  // - remotion/@remotion/player: Fix ESM interop for Remotion cinematics (black screen without transpilation)
  // NB: three / @react-three/* removed 2026-06-19 — not in package.json (dead entries).
  transpilePackages: [
    '@supabase/ssr',
    'date-fns',
    'framer-motion',
    'react-hot-toast',
    'remotion',
    '@remotion/player',
  ],

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,

  // SEO: Redirect non-www to www and ensure consistent URLs
  async redirects() {
    return [
      // Redirect bare root to default locale (prevents 404 and duplicate content flags).
      // NOTE: in production the custom Express server (server/localeRedirect.ts)
      // handles `/` BEFORE Next sees it — locale-detecting 301 for browsers,
      // internal rewrite (200 + content) for bots/verifiers. This rule is the
      // Next-only-dev / fallback path.
      {
        source: '/',
        destination: '/en',
        permanent: true,
      },
      // Author route rename: the-word-nerd → ohad-fisher
      {
        source: '/:locale(en|he|sv|ja|es|ru)/about/the-word-nerd',
        destination: '/:locale/about/ohad-fisher',
        permanent: true,
      },
      {
        source: '/about/the-word-nerd',
        destination: '/en/about/ohad-fisher',
        permanent: true,
      },
      // Slug consolidation: the underperforming text page (pos ~13, ~1 click/mo)
      // folds into the richer showcase landing for the same intent.
      {
        source: '/:locale(en|he|sv|ja|es|ru)/multiplayer-word-game-online',
        destination: '/:locale/free-multiplayer-word-game',
        permanent: true,
      },
      // Redirect non-www to www (handled by hosting platform like Vercel/Railway)
      // This is a fallback for any requests that slip through.
      // Exempt assetlinks.json + ad-network verification file (verifiers refuse redirects).
      {
        source: '/:path((?!\\.well-known/assetlinks\\.json$|d41d650cb226c9b4c235\\.txt$).*)',
        has: [
          {
            type: 'host',
            value: 'lexiclash.live',
          },
        ],
        destination: 'https://www.lexiclash.live/:path',
        permanent: true,
      },
      // SEO: keyword-shaped URLs for "scrabble online español multijugador" GSC query
      // → canonical /es/juego-de-palabras-multijugador (ranks the existing page).
      {
        source: '/es/scrabble-online-multijugador',
        destination: '/es/juego-de-palabras-multijugador',
        permanent: true,
      },
      {
        source: '/es/scrabble-online-en-espanol',
        destination: '/es/juego-de-palabras-multijugador',
        permanent: true,
      },
      {
        source: '/es/scrabble-multijugador-online',
        destination: '/es/juego-de-palabras-multijugador',
        permanent: true,
      },
      // Catch-all: redirect any path without a locale prefix to /en/...
      // This prevents 308s from the app router and gives Google clean 301s.
      // Must be AFTER the non-www redirect and root redirect above.
      {
        source: '/:path((?!en|he|sv|ja|es|ru|api|_next|favicon\\.ico|.*\\..*).*)',
        destination: '/en/:path',
        permanent: true,
      },
      // Also handle nested paths without locale (e.g. /legal/privacy → /en/legal/privacy)
      {
        source: '/:path((?!en|he|sv|ja|es|ru|api|_next|favicon\\.ico|.*\\..*).*?)/:rest*',
        destination: '/en/:path/:rest*',
        permanent: true,
      },
    ];
  },

  // Image optimization enabled with modern formats
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Cache optimized images for 1 year (avatars and static assets rarely change)
    // This dramatically improves P95 latency from 411ms to <50ms for repeat visits
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hdtmpkicuxvtmvrmtybx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // OAuth provider profile pictures
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
      },
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Security headers and API caching
  async headers() {
    return [
      // Service worker — must be served as JavaScript (not HTML fallback)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            // Revalidate the SW on every load so a new deploy's worker is picked
            // up immediately. max-age=3600 previously let the browser hold a stale
            // /sw.js for up to an hour, delaying the build-stamped cache bump.
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Static asset caching — 1 year immutable for fingerprinted assets
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sounds/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/music/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Static asset caching (mascot images, icons, etc.)
      {
        source: '/mascot/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icon-:size.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // _next/static fingerprinted assets: Next sets immutable caching itself in
      // production. Declaring it manually in DEV breaks HMR/chunk reloading
      // ("Custom Cache-Control header can break Next.js development behavior"),
      // so only emit it for production builds.
      ...(process.env.NODE_ENV === 'production'
        ? [{
            source: '/_next/static/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable',
              },
            ],
          }]
        : []),
      {
        source: '/logos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/winner-celebration/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API caching headers for cacheable endpoints
      {
        source: '/api/random-avatar',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/random-name',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/themed-words',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Security headers for all paths
      // NOTE: /:locale/embed/* is EXCLUDED here and gets its own permissive
      // frame-ancestors block below. Browsers enforce the INTERSECTION of all
      // CSP frame-ancestors, so embed must receive exactly ONE (permissive) CSP.
      {
        source: '/:path((?!(?:en|he|sv|ja|es|ru)/embed/).*)',
        headers: [
          // Block indexing for preview/staging environments via X-Robots-Tag header
          ...(isPreviewEnvironment ? [{
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
          }] : []),
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // X-Frame-Options removed - using CSP frame-ancestors instead (modern approach)
          // This allows CrazyGames and other game portals to embed our game
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            // Always allow CrazyGames SDK + iframe embedding — SDK auto-detects environment at runtime.
            // When force-disabled, strip the CrazyGames SDK domains only. Google ad domains stay in
            // BOTH branches — they're independent of the CrazyGames toggle. Prod sets
            // CRAZYGAMES_ENABLED=false, so the force-disabled branch is what direct web visitors get.
            value: isCrazyGamesForceDisabled
              // Force-disabled: no SDK script, but still allow iframe embedding for other portals
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://pagead2.googlesyndication.com https://*.googleadservices.com https://ep2.adtrafficquality.google https://html5.api.gamedistribution.com https://*.gamedistribution.com https://*.posthog.com https://eu.i.posthog.com https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.googlesyndication.com https://*.doubleclick.net https://*.googleadservices.com https://*.adtrafficquality.google https://*.gamedistribution.com https://*.posthog.com https://eu.i.posthog.com https://accounts.google.com/gsi/ wss: ws:; worker-src 'self' blob:; frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://googleads.g.doubleclick.net https://*.gamedistribution.com https://accounts.google.com/gsi/; frame-ancestors 'self' https://*.crazygames.com https://crazygames.com https://poki.com https://www.poki.com;"
              // Default: SDK auto-detection enabled — allow CrazyGames SDK script + ads + iframe embedding
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://sdk.crazygames.com https://*.crazygames.com https://pagead2.googlesyndication.com https://*.googleadservices.com https://ep2.adtrafficquality.google https://html5.api.gamedistribution.com https://*.gamedistribution.com https://*.posthog.com https://eu.i.posthog.com https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.crazygames.com https://*.googlesyndication.com https://*.doubleclick.net https://*.googleadservices.com https://*.adtrafficquality.google https://*.gamedistribution.com https://*.posthog.com https://eu.i.posthog.com https://accounts.google.com/gsi/ wss: ws:; worker-src 'self' blob:; frame-src 'self' https://*.crazygames.com https://*.googlesyndication.com https://*.doubleclick.net https://googleads.g.doubleclick.net https://*.gamedistribution.com https://accounts.google.com/gsi/; frame-ancestors 'self' https://*.crazygames.com https://crazygames.com https://poki.com https://www.poki.com;",
          },
        ],
      },
      // Embeddable widget routes — framed by ANY origin (backlink/distribution widget).
      // Deliberately excluded from the global block above so its restrictive CSP never
      // intersects these. The permissive `frame-ancestors *` CSP is set directly on the
      // Route Handler Response (app/[locale]/embed/word-of-the-day/route.ts) where it's
      // unit-tested — NOT here, since headers() application to Route Handlers is the
      // uncertain part. This entry only carries the non-CSP security headers.
      {
        source: '/:locale(en|he|sv|ja|es|ru)/embed/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Enable Turbopack configuration (required for Next.js 16+)
  turbopack: {
    root: __dirname,
    resolveAlias: {
      '@arvidbt/swedish-words': '@arvidbt/swedish-words/out/index.js',
    },
  },

  // Webpack configuration - alias for swedish-words package
  webpack: (config, { isServer: _isServer, dev }) => {
    // Alias the TypeScript index to the compiled JavaScript version
    config.resolve.alias['@arvidbt/swedish-words'] = path.resolve(__dirname, 'node_modules/@arvidbt/swedish-words/out/index.js');

    // Peak build-memory reduction for the webpack engine (prod builds with
    // `next build --webpack`). Railway's build container has less RAM than a dev
    // machine; without these, a big app can spike past the heap and OOM. Dev is
    // untouched (full speed).
    if (!dev) {
      // Process fewer modules concurrently → lower peak heap (slightly slower).
      config.parallelism = 1;
      // One-shot CI builds reuse nothing, so the persistent cache only costs
      // serialization memory — drop it.
      config.cache = false;
      // Cap Terser minifier workers (default = CPU count; each worker holds
      // chunks in memory and is the usual peak-RAM consumer).
      for (const m of config.optimization?.minimizer ?? []) {
        if (m && m.options && 'parallel' in m.options) {
          m.options.parallel = 2;
        }
      }
    }

    return config;
  },
};

// Sentry configuration - only needs NEXT_PUBLIC_SENTRY_DSN to work
// Source map upload only in CI/production (SENTRY_AUTH_TOKEN present) — saves ~10-20s locally
const hasSentryToken = !!process.env.SENTRY_AUTH_TOKEN;
const sentryConfig = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  sourcemaps: {
    disable: !hasSentryToken,
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

export default withNextIntl(withBundleAnalyzer(sentryConfig));
