import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if this is a mobile build (Capacitor static export)
const isMobileBuild = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mobile builds require static export
  ...(isMobileBuild && {
    output: 'export',
    // Disable trailing slashes for Capacitor compatibility
    trailingSlash: false,
  }),

  // Enable system TLS certs for Turbopack to fetch Google Fonts
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },

  // Image optimization configuration
  // - Mobile: Disabled (not supported with static export)
  // - Web: Enabled with modern formats
  images: isMobileBuild
    ? {
        unoptimized: true,
      }
    : {
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
    NEXT_PUBLIC_IS_MOBILE: process.env.NEXT_PUBLIC_IS_MOBILE,
    NEXT_PUBLIC_PRODUCTION_URL: process.env.NEXT_PUBLIC_PRODUCTION_URL,
  },

  // Security headers (only for web builds - static exports don't support headers)
  ...(!isMobileBuild && {
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
  }),

  // Enable Turbopack configuration (required for Next.js 16+)
  turbopack: {
    root: __dirname,
  },
};

// Log build type
console.log(`[Next.js Config] Build type: ${isMobileBuild ? 'MOBILE (Static Export)' : 'WEB (SSR)'}`);

export default nextConfig;
