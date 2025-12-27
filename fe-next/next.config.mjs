import path from 'path';
import { fileURLToPath } from 'url';
import { withSentryConfig } from '@sentry/nextjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable dev indicators in production (keeps them in local dev)
  devIndicators: process.env.NODE_ENV === 'production' ? false : undefined,

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
  swcMinify: true,
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
    minimumCacheTTL: 60,
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
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss: ws:; frame-src 'self';",
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
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
});
