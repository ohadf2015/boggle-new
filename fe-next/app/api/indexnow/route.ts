import { NextResponse } from 'next/server';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '207c6c1a7de212bfab82a5acf0b02280';
const BASE_URL = 'https://www.lexiclash.live';

/**
 * POST /api/indexnow - Submit URLs to IndexNow for faster indexing
 * Called by cron or manually after content changes (new blog posts, daily puzzles, etc.)
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
    // Default: submit key pages
    const locales = ['en', 'he', 'sv', 'ja', 'es'];
    urls = locales.flatMap(l => [
      `${BASE_URL}/${l}`,
      `${BASE_URL}/${l}/daily`,
      `${BASE_URL}/${l}/multiplayer`,
      `${BASE_URL}/${l}/singleplayer`,
      `${BASE_URL}/${l}/leaderboard`,
    ]);
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
  });
}
