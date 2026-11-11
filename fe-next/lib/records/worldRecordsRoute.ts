import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import type { ResultsMode } from '@/lib/rivals/types';
import { recordKeyFor } from './recordKeys';
import { getWorldRecords } from './worldRecords';
import type { WorldRecord } from './worldRecordTypes';

const MODES = new Set<ResultsMode>(['daily', 'quickPlay', 'multiplayer', 'blast', 'tower', 'single', 'edu']);
const TTL_MS = 60_000;
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };

const cache = new Map<string, { at: number; records: WorldRecord[] }>();

export function _resetWorldRecordCache(): void {
  cache.clear();
}

/** GET /api/records/world[?mode=<ResultsMode>&subMode=] : every world record, or the one a results screen competes for. */
export async function GET(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'records-world', { maxRequests: 60, windowMs: 60_000 });
  if (!rate.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const q = request.nextUrl.searchParams;
  const mode = q.get('mode');
  let recordKey: string | undefined;
  if (mode) {
    if (!MODES.has(mode as ResultsMode)) return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
    const key = recordKeyFor(mode as ResultsMode, q.get('subMode'));
    if (!key) return NextResponse.json({ records: [] }, { headers: CACHE_HEADERS });
    recordKey = key;
  }

  const cacheKey = recordKey ?? '*';
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ records: hit.records }, { headers: CACHE_HEADERS });
  }

  try {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    const records = await getWorldRecords(admin, recordKey);
    cache.set(cacheKey, { at: Date.now(), records });
    return NextResponse.json({ records }, { headers: CACHE_HEADERS });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), '/api/records/world', { method: 'GET', statusCode: 500 });
    return NextResponse.json({ error: 'Failed to load world records' }, { status: 500 });
  }
}
