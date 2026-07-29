import { NextResponse } from 'next/server';
import { discoverPublicRoutes } from '@/utils/discoverRoutes';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '207c6c1a7de212bfab82a5acf0b02280';
const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * POST /api/indexnow - Submit URLs to IndexNow for faster indexing
 * Called by cron or manually after content changes (new blog posts, daily puzzles, etc.)
 * Dynamically discovers all public routes from the filesystem.
 */
export async function POST(request: Request) {
  if (!INDEXNOW_KEY) {
    return NextResponse.json({ error: 'INDEXNOW_KEY not configured' }, { status: 500 });
  }

  let urls: string[];
  try {
    const body = await request.json();
    urls = body.urls;
  } catch {
    // Default: discover all public pages across all locales
    const routes = await discoverPublicRoutes();
    urls = LOCALES.flatMap(l => routes.map(r => `${BASE_URL}/${l}${r}`));
  }

  const payload = {
    host: 'www.lexiclash.live',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return NextResponse.json({
    status: res.status,
    submitted: urls.length,
  });
}

/**
 * GET /api/indexnow - Health check
 */
export async function GET() {
  return NextResponse.json({
    configured: !!INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY ? `${BASE_URL}/${INDEXNOW_KEY}.txt` : null,
  }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  });
}
