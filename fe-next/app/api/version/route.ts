import { NextResponse } from 'next/server';

/**
 * Version API Endpoint
 *
 * Returns the current build time to allow clients to detect new deployments.
 * This enables aggressive cache busting when a new version is deployed.
 *
 * Cache headers ensure this ALWAYS returns the latest version (no caching).
 */
export async function GET() {
  // Build time set at build in next.config.mjs
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

  return NextResponse.json(
    { buildTime },
    {
      headers: {
        // CRITICAL: No caching allowed - must always be fresh
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    }
  );
}
