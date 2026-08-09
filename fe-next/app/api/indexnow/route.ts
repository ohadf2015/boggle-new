import { NextResponse } from 'next/server';
import { discoverPublicRoutes } from '@/utils/discoverRoutes';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { createClient } from '@/utils/supabase/server';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '207c6c1a7de212bfab82a5acf0b02280';
const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

/**
 * Two legitimate callers, so accept either and refuse everything else:
 *   - cron / manual scripts  → CRON_SECRET (fail-closed, constant-time)
 *   - the admin panel        → Supabase session with profiles.is_admin
 *
 * Note the INDEXNOW_KEY itself is NOT a secret — IndexNow requires it to be
 * published at /<key>.txt, which is how the search engines verify us. The thing
 * worth protecting is the *endpoint*: before this guard, any anonymous caller
 * could push arbitrary URLs under our host, burning the daily submission quota
 * and risking Bing/Yandex throttling the whole domain.
 */
async function isAuthorized(request: Request): Promise<'ok' | 'anonymous' | 'forbidden'> {
  if (isAuthorizedCronRequest(request)) return 'ok';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'anonymous';

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    return profile?.is_admin ? 'ok' : 'forbidden';
  } catch {
    // Supabase unreachable/misconfigured must not become an open door.
    return 'anonymous';
  }
}

/**
 * POST /api/indexnow - Submit URLs to IndexNow for faster indexing
 * Called by cron or manually after content changes (new blog posts, daily puzzles, etc.)
 * Dynamically discovers all public routes from the filesystem.
 * Requires CRON_SECRET or an admin session — see isAuthorized above.
 */
export async function POST(request: Request) {
  const auth = await isAuthorized(request);
  if (auth !== 'ok') {
    return NextResponse.json(
      { error: auth === 'forbidden' ? 'Admin access required' : 'Unauthorized' },
      { status: auth === 'forbidden' ? 403 : 401 }
    );
  }

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
