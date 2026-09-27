import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { isSameOrigin } from '@/lib/auth/sameOrigin';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { validateReviewBatch } from '@/lib/connections/review';

/**
 * GET  /api/admin/connections-puzzles/reviews
 *   → { reviews: [...admin verdicts], feedback: [...per-puzzle player stats] }
 * POST /api/admin/connections-puzzles/reviews  { verdicts: [...] }
 *   → bulk-upsert admin verdicts (one row per puzzle_id).
 * Admin-only.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });
    const [{ data: reviews }, { data: feedback }] = await Promise.all([
      admin.from('connections_puzzle_reviews').select('puzzle_id, language, verdict, note, reviewed_at'),
      admin.from('connections_puzzle_feedback_stats').select('puzzle_id, likes, dislikes, gaveups, total'),
    ]);
    return NextResponse.json(
      { reviews: reviews ?? [], feedback: feedback ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/connections-puzzles/reviews', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // CSRF: state-changing POST that can authenticate via an ambient admin cookie.
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
  }
  const auth = await verifyAdminAuth(request);
  if (!auth.success) return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const v = validateReviewBatch(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: 'service unavailable' }, { status: 503 });

    const now = new Date().toISOString();
    const rows = v.verdicts.map((d) => ({
      puzzle_id: d.puzzleId,
      language: d.language,
      word1: d.word1,
      word2: d.word2,
      bridge: d.bridge,
      verdict: d.verdict,
      note: d.note ?? null,
      reviewed_by: auth.user?.id ?? null,
      reviewed_at: now,
    }));
    const { error } = await admin.from('connections_puzzle_reviews').upsert(rows, { onConflict: 'puzzle_id' });
    if (error) throw error;

    return NextResponse.json({ success: true, saved: rows.length });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/admin/connections-puzzles/reviews', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
