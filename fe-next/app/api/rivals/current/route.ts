import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { resolveRival } from '@/lib/rivals/resolveRival';
import { rivalDeps } from '@/lib/rivals/rivalDeps';
import type { ResultsMode } from '@/lib/rivals/types';

const MODES = new Set<ResultsMode>(['daily', 'quickPlay', 'multiplayer', 'blast', 'tower', 'single', 'edu']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[0-9a-f-]{36}$/i;

function num(v: string | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * GET /api/rivals/current?mode=<ResultsMode>[&score=&previousBest=&opponents=id,id&date=&lang=&fp=&subMode=]
 * The ONE rival for a results screen. Identity comes from the session (or the guest fingerprint).
 */
export async function GET(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'rivals-current', { maxRequests: 30, windowMs: 60_000 });
  if (!rate.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const q = request.nextUrl.searchParams;
  const mode = q.get('mode') as ResultsMode;
  if (!MODES.has(mode)) return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  if (mode === 'edu') return NextResponse.json({ rival: null });

  try {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    const user = await getAuthedUser(request).catch(() => null);
    const date = q.get('date') ?? '';
    const rival = await resolveRival(
      rivalDeps(admin, (source, err) => captureApiError(err instanceof Error ? err : new Error(String(err)), `rivals-current:${source}`)),
      {
        mode,
        userId: user?.id ?? null,
        guestFp: user ? null : (q.get('fp') || '').slice(0, 64) || null,
        score: num(q.get('score')),
        previousBest: num(q.get('previousBest')) ?? null,
        opponentUserIds: (q.get('opponents') ?? '').split(',').filter((id) => ID_RE.test(id)).slice(0, 8),
        date: DATE_RE.test(date) ? date : undefined,
        lang: (q.get('lang') || 'en').slice(0, 5),
        subMode: (q.get('subMode') || '').slice(0, 32) || undefined,
      },
    );
    return NextResponse.json({ rival }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/rivals/current');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
