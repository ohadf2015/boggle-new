import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable system TLS certs for Turbopack to fetch Google Fonts
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },

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
            value: 'max-age=31536000; includeSubDomains',
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "style-src 'self' 'unsafe-inline'; font-src 'self' data:;",
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

export default nextConfig;
