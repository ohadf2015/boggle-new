/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization disabled for simpler handling
  images: {
    unoptimized: true,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },

  // Enable Turbopack configuration (required for Next.js 16+)
  turbopack: {},
};

export default nextConfig;
