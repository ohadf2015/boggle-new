import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { publicNameIssue } from '@/lib/names/publicName';

/** POST /api/names/check { name } -> { ok } | { ok: false, reason }. The client mirror of the server-side board guard. */
export async function POST(request: NextRequest) {
  const rate = checkApiRateLimit(request, 'names-check', { maxRequests: 30, windowMs: 60_000 });
  if (!rate.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === 'string' ? body.name.slice(0, 64) : '';
  const reason = publicNameIssue(name);
  return NextResponse.json(reason ? { ok: false, reason } : { ok: true });
}
