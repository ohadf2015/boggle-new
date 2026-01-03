import path from 'path';
import { fileURLToPath } from 'url';
import { withSentryConfig } from '@sentry/nextjs';
import bundleAnalyzer from '@next/bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundle analyzer - run with ANALYZE=true
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Check if this is a preview/staging environment (explicitly set or PR preview)
// Only block indexing when NEXT_PUBLIC_IS_PREVIEW is explicitly true or when it's a PR preview
const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
  process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

// Check if CrazyGames embedding is enabled
const isCrazyGamesEnabled = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable system TLS certs for Turbopack to fetch Google Fonts
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },

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
      // Redirect non-www to www (handled by hosting platform like Vercel/Railway)
      // This is a fallback for any requests that slip through
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'lexiclash.live',
          },
        ],
        destination: 'https://www.lexiclash.live/:path*',
        permanent: true,
      },
      // Redirect bare /legal path without locale to default locale
      {
        source: '/legal',
        destination: '/en/legal',
        permanent: true,
      },
      {
        source: '/legal/terms',
        destination: '/en/legal/terms',
        permanent: true,
      },
      {
        source: '/legal/privacy',
        destination: '/en/legal/privacy',
        permanent: true,
      },
      // Redirect bare /rules path without locale to default locale
      {
        source: '/rules',
        destination: '/en/rules',
        permanent: true,
      },
      // Redirect bare /leaderboard path without locale to default locale
      {
        source: '/leaderboard',
        destination: '/en/leaderboard',
        permanent: true,
      },
      // Redirect bare /profile path without locale to default locale
      {
        source: '/profile',
        destination: '/en/profile',
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
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // Security headers and API caching
  async headers() {
    return [
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
      {
        source: '/:path*',
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            // Always allow CrazyGames iframe embedding via frame-ancestors
            // SDK script loading is controlled separately by NEXT_PUBLIC_CRAZYGAMES_ENABLED
            value: isCrazyGamesEnabled
              // Full CrazyGames mode: SDK script + iframe embedding
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com https://sdk.crazygames.com https://*.crazygames.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.crazygames.com wss: ws:; worker-src 'self' blob:; frame-src 'self' https://*.crazygames.com; frame-ancestors 'self' https://*.crazygames.com https://crazygames.com https://www.crazygames.com https://developer.crazygames.com https://*.poki.com https://poki.com;"
              // Iframe embedding allowed for game portals, but no SDK script
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://cdn.lgrckt-in.com https://cdn.lr-in-prod.com https://cdn.lr-ingest.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.logrocket.io https://*.lr-in-prod.com https://*.lgrckt-in.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com wss: ws:; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self' https://*.crazygames.com https://crazygames.com https://www.crazygames.com https://developer.crazygames.com https://*.poki.com https://poki.com;",
          },
        ],
      },
    ];
  },

  // Enable Turbopack configuration (required for Next.js 16+)
  turbopack: {
    root: __dirname,
  },
};

// Sentry configuration - only needs NEXT_PUBLIC_SENTRY_DSN to work
// Source map upload options are optional (for better stack traces in Sentry dashboard)
// Wrap with bundle analyzer (only active when ANALYZE=true)
export default withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    hideSourceMaps: true,
    webpack: {
      treeshake: {
        removeDebugLogging: true,
      },
    },
  })
);
