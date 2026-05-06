import { NextResponse } from 'next/server';
import { discoverPublicRoutes } from '@/utils/discoverRoutes';

/**
 * GET /api/admin/routes - Discover all public indexable routes
 * Scans the app/[locale]/ directory for page.tsx files,
 * excluding admin, auth, dynamic params, and test pages.
 */
export async function GET() {
  try {
    const routes = await discoverPublicRoutes();
    return NextResponse.json({ routes, count: routes.length }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to discover routes' },
      { status: 500 }
    );
  }
}
